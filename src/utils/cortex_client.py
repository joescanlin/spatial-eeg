"""
Emotiv Cortex API WebSocket Client
Implements the full Cortex API flow for EEG data streaming and session recording.

API Flow:
1. Connect to wss://localhost:6868
2. Authenticate (requestAccess + authorize)
3. Connect to headset (controlDevice + queryHeadsets)
4. Create session
5. Subscribe to data streams (eeg, met, pow, mot, eq, dev)
6. Start/stop recording with markers
7. Export data

Documentation: https://emotiv.gitbook.io/cortex-api
"""

import asyncio
import json
import logging
import time
import ssl
from typing import Optional, Dict, List, Callable, Any
import websockets
from datetime import datetime

logger = logging.getLogger(__name__)


class CortexAPIError(Exception):
    """Raised when Cortex API returns an error"""
    pass


class CortexClient:
    """
    WebSocket client for Emotiv Cortex API.
    Handles authentication, session management, data streaming, and recording.
    """

    CORTEX_URL = "wss://localhost:6868"

    # Stream types available
    STREAM_EEG = "eeg"          # Raw EEG (128 Hz, paid license)
    STREAM_MET = "met"          # Performance metrics (8 Hz, paid license)
    STREAM_POW = "pow"          # Band power (8 Hz, paid license)
    STREAM_MOT = "mot"          # Motion data (64 Hz, free)
    STREAM_EQ = "eq"            # Contact quality (2 Hz, free)
    STREAM_DEV = "dev"          # Device info (2 Hz, free)
    STREAM_COM = "com"          # Mental commands (8 Hz, paid)
    STREAM_FAC = "fac"          # Facial expressions (32 Hz, paid)
    STREAM_SYS = "sys"          # System events (free)

    def __init__(self, client_id: str, client_secret: str, license_id: Optional[str] = None):
        """
        Initialize Cortex client.

        Args:
            client_id: Application client ID from Emotiv
            client_secret: Application client secret
            license_id: Optional license ID for paid features
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self.license_id = license_id

        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.cortex_token: Optional[str] = None
        self.session_id: Optional[str] = None
        self.record_id: Optional[str] = None
        self.headset_id: Optional[str] = None

        self.request_id = 0
        self.stream_callbacks: Dict[str, List[Callable]] = {}
        self.is_connected = False
        self.is_streaming = False

    def _next_request_id(self) -> int:
        """Generate next request ID"""
        self.request_id += 1
        return self.request_id

    async def connect(self) -> bool:
        """
        Connect to Cortex service via WebSocket.

        Returns:
            True if connection successful
        """
        try:
            logger.info(f"Connecting to Cortex API at {self.CORTEX_URL}")

            # Create SSL context that accepts self-signed certificates
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

            self.ws = await websockets.connect(
                self.CORTEX_URL,
                ssl=ssl_context,
                ping_interval=20,
                ping_timeout=10
            )
            self.is_connected = True
            logger.info("✓ Connected to Cortex API")

            # Get Cortex info
            info = await self._call_api("getCortexInfo", {})
            logger.info(f"Cortex version: {info.get('version', 'unknown')}")

            return True

        except Exception as e:
            logger.error(f"Failed to connect to Cortex: {e}")
            self.is_connected = False
            return False

    async def disconnect(self):
        """Disconnect from Cortex and cleanup"""
        try:
            # Stop recording if active
            if self.record_id:
                await self.stop_recording()

            # Close session if active
            if self.session_id:
                await self.close_session()

            # Close WebSocket
            if self.ws:
                await self.ws.close()

            self.is_connected = False
            self.is_streaming = False
            logger.info("✓ Disconnected from Cortex")

        except Exception as e:
            logger.error(f"Error during disconnect: {e}")

    async def _call_api(self, method: str, params: Dict) -> Dict:
        """
        Call Cortex API method and wait for response.

        Args:
            method: API method name
            params: Method parameters

        Returns:
            API response result

        Raises:
            CortexAPIError: If API returns error
        """
        if not self.ws:
            raise CortexAPIError("Not connected to Cortex")

        request_id = self._next_request_id()
        request = {
            "id": request_id,
            "jsonrpc": "2.0",
            "method": method,
            "params": params
        }

        logger.debug(f"→ {method}: {json.dumps(params, indent=2)}")
        await self.ws.send(json.dumps(request))

        # Wait for response
        while True:
            response_str = await self.ws.recv()
            response = json.loads(response_str)

            # Check if this is our response
            if response.get("id") == request_id:
                if "error" in response:
                    error = response["error"]
                    raise CortexAPIError(f"{method} failed: {error.get('message', 'Unknown error')}")

                logger.debug(f"← {method}: Success")
                return response.get("result", {})

            # If it's a stream data message, handle it
            elif "sid" in response:
                await self._handle_stream_data(response)

    async def _handle_stream_data(self, data: Dict):
        """Handle incoming stream data"""
        # Determine stream type from data keys
        # The 'sid' field is the session ID, not the stream type
        # Stream type is indicated by which data field is present
        for stream_type in ['eeg', 'met', 'pow', 'mot', 'eq', 'dev', 'com', 'fac', 'sys']:
            if stream_type in data:
                if stream_type in self.stream_callbacks:
                    for callback in self.stream_callbacks[stream_type]:
                        try:
                            callback(data)
                        except Exception as e:
                            logger.error(f"Error in stream callback for {stream_type}: {e}")
                break

    # ============================================================================
    # AUTHENTICATION
    # ============================================================================

    async def authenticate(self) -> bool:
        """
        Complete authentication flow:
        1. Check user login
        2. Request access (if needed)
        3. Authorize and get token

        Returns:
            True if authentication successful
        """
        try:
            # Check if user is logged in to Emotiv Launcher
            logger.info("Checking user login status...")
            user_login = await self._call_api("getUserLogin", {})

            if not user_login:
                logger.error("User not logged in to Emotiv Launcher. Please start the Launcher.")
                return False

            # getUserLogin returns a list of logged in users
            if isinstance(user_login, list) and len(user_login) > 0:
                logger.info(f"✓ User logged in: {user_login[0].get('username', 'unknown')}")
            else:
                logger.info(f"✓ User logged in")

            # Check access rights
            logger.info("Checking access rights...")
            access_result = await self._call_api("hasAccessRight", {
                "clientId": self.client_id,
                "clientSecret": self.client_secret
            })

            has_access = access_result.get("accessGranted", False)

            # Request access if not granted
            if not has_access:
                logger.info("Requesting access (user approval required)...")
                await self._call_api("requestAccess", {
                    "clientId": self.client_id,
                    "clientSecret": self.client_secret
                })
                logger.info("⚠ Please approve access in Emotiv Launcher")

                # Wait for user to approve (with timeout)
                for i in range(30):
                    await asyncio.sleep(1)
                    access_result = await self._call_api("hasAccessRight", {
                        "clientId": self.client_id,
                        "clientSecret": self.client_secret
                    })
                    if access_result.get("accessGranted"):
                        break
                else:
                    logger.error("Access not granted within 30 seconds")
                    return False

            logger.info("✓ Access granted")

            # Authorize and get token
            logger.info("Authorizing...")
            auth_params = {
                "clientId": self.client_id,
                "clientSecret": self.client_secret,
                "debit": 1  # Request 1 session credit
            }

            if self.license_id:
                auth_params["license"] = self.license_id

            auth_result = await self._call_api("authorize", auth_params)
            self.cortex_token = auth_result.get("cortexToken")

            if not self.cortex_token:
                logger.error("Failed to get Cortex token")
                return False

            logger.info("✓ Authentication successful")

            # Get license info
            license_info = await self._call_api("getLicenseInfo", {
                "cortexToken": self.cortex_token
            })
            logger.info(f"License: {license_info}")

            return True

        except CortexAPIError as e:
            logger.error(f"Authentication failed: {e}")
            return False

    # ============================================================================
    # HEADSET MANAGEMENT
    # ============================================================================

    async def query_headsets(self) -> List[Dict]:
        """
        Query available headsets.

        Returns:
            List of headset objects
        """
        if not self.cortex_token:
            raise CortexAPIError("Not authenticated. Call authenticate() first.")

        headsets = await self._call_api("queryHeadsets", {})
        return headsets if isinstance(headsets, list) else []

    async def connect_headset(self, headset_id: Optional[str] = None) -> bool:
        """
        Connect to a headset.

        Args:
            headset_id: Specific headset ID, or None to use first available

        Returns:
            True if connection successful
        """
        try:
            # Refresh device list
            logger.info("Scanning for headsets...")
            await self._call_api("controlDevice", {
                "command": "refresh"
            })

            await asyncio.sleep(2)  # Give it time to scan

            # Query headsets
            headsets = await self.query_headsets()

            if not headsets:
                logger.error("No headsets found")
                return False

            # Use specified headset or first available
            if headset_id:
                headset = next((h for h in headsets if h["id"] == headset_id), None)
                if not headset:
                    logger.error(f"Headset {headset_id} not found")
                    return False
            else:
                headset = headsets[0]

            self.headset_id = headset["id"]
            logger.info(f"Found headset: {headset.get('id', 'unknown')}")

            # Connect if not already connected
            if headset.get("status") != "connected":
                logger.info("Connecting to headset...")
                await self._call_api("controlDevice", {
                    "command": "connect",
                    "headset": self.headset_id
                })
                logger.info("✓ Headset connected")
            else:
                logger.info("✓ Headset already connected")

            return True

        except CortexAPIError as e:
            logger.error(f"Failed to connect headset: {e}")
            return False

    # ============================================================================
    # SESSION MANAGEMENT
    # ============================================================================

    async def create_session(self, activate: bool = True) -> Optional[str]:
        """
        Create a new session for data streaming.

        Args:
            activate: Whether to activate session immediately

        Returns:
            Session ID if successful
        """
        if not self.cortex_token or not self.headset_id:
            raise CortexAPIError("Not authenticated or headset not connected")

        params = {
            "cortexToken": self.cortex_token,
            "headset": self.headset_id,
            "status": "active" if activate else "open"
        }

        logger.info("Creating session...")
        result = await self._call_api("createSession", params)

        self.session_id = result.get("id")
        logger.info(f"✓ Session created: {self.session_id}")

        return self.session_id

    async def close_session(self):
        """Close the current session"""
        if not self.session_id:
            return

        logger.info("Closing session...")
        await self._call_api("updateSession", {
            "cortexToken": self.cortex_token,
            "session": self.session_id,
            "status": "close"
        })

        self.session_id = None
        self.is_streaming = False
        logger.info("✓ Session closed")

    # ============================================================================
    # DATA STREAMING
    # ============================================================================

    async def subscribe(self, streams: List[str]) -> Dict:
        """
        Subscribe to data streams.

        Args:
            streams: List of stream names (e.g., ["eeg", "met", "mot"])

        Returns:
            Subscription result with stream info
        """
        if not self.session_id:
            raise CortexAPIError("No active session. Call create_session() first.")

        logger.info(f"Subscribing to streams: {streams}")
        result = await self._call_api("subscribe", {
            "cortexToken": self.cortex_token,
            "session": self.session_id,
            "streams": streams
        })

        # Log successful subscriptions
        for success in result.get("success", []):
            stream_name = success.get("streamName")
            cols = success.get("cols", [])
            logger.info(f"✓ Subscribed to {stream_name}: {len(cols)} channels")
            logger.debug(f"  Channels: {cols}")

        # Log failures
        for failure in result.get("failure", []):
            stream_name = failure.get("streamName")
            message = failure.get("message", "Unknown error")
            logger.error(f"✗ Failed to subscribe to {stream_name}: {message}")

        self.is_streaming = True
        return result

    async def unsubscribe(self, streams: List[str]):
        """Unsubscribe from data streams"""
        if not self.session_id:
            return

        logger.info(f"Unsubscribing from streams: {streams}")
        await self._call_api("unsubscribe", {
            "cortexToken": self.cortex_token,
            "session": self.session_id,
            "streams": streams
        })

        if not streams:
            self.is_streaming = False

    def add_stream_callback(self, stream_name: str, callback: Callable):
        """
        Add callback for stream data.

        Args:
            stream_name: Stream name (e.g., "eeg", "met")
            callback: Function to call with stream data
        """
        if stream_name not in self.stream_callbacks:
            self.stream_callbacks[stream_name] = []
        self.stream_callbacks[stream_name].append(callback)

    async def start_stream_loop(self):
        """
        Start listening for stream data.
        Call this after subscribing to streams.
        """
        if not self.ws or not self.is_streaming:
            return

        logger.info("Starting stream listener...")

        try:
            async for message in self.ws:
                data = json.loads(message)

                # Handle stream data
                if "sid" in data:
                    await self._handle_stream_data(data)

        except websockets.exceptions.ConnectionClosed:
            logger.info("Stream connection closed")
            self.is_streaming = False
        except Exception as e:
            logger.error(f"Error in stream loop: {e}")
            self.is_streaming = False

    # ============================================================================
    # RECORDING
    # ============================================================================

    async def start_recording(
        self,
        title: str,
        subject_name: Optional[str] = None,
        experiment_id: Optional[str] = None,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> Optional[str]:
        """
        Start recording the current session.

        Args:
            title: Recording title (max 200 chars)
            subject_name: Subject identifier
            experiment_id: Experiment identifier
            description: Recording description
            tags: List of tags

        Returns:
            Record ID if successful
        """
        if not self.session_id:
            raise CortexAPIError("No active session")

        params = {
            "cortexToken": self.cortex_token,
            "session": self.session_id,
            "title": title
        }

        if subject_name:
            params["subjectName"] = subject_name
        if experiment_id:
            params["experimentId"] = experiment_id
        if description:
            params["description"] = description
        if tags:
            params["tags"] = tags

        logger.info(f"Starting recording: {title}")
        result = await self._call_api("createRecord", params)

        self.record_id = result.get("uuid")
        logger.info(f"✓ Recording started: {self.record_id}")

        return self.record_id

    async def stop_recording(self) -> bool:
        """
        Stop the current recording.

        Returns:
            True if successful
        """
        if not self.record_id:
            logger.warning("No active recording")
            return False

        logger.info("Stopping recording...")
        await self._call_api("stopRecord", {
            "cortexToken": self.cortex_token,
            "session": self.session_id
        })

        logger.info(f"✓ Recording stopped: {self.record_id}")
        self.record_id = None
        return True

    async def inject_marker(
        self,
        label: str,
        value: Any,
        time: Optional[int] = None,
        port: str = "SpatialEEG"
    ) -> Dict:
        """
        Inject a marker into the current recording.

        Args:
            label: Marker label (e.g., "floor_pattern_change")
            value: Marker value (e.g., "pattern_A")
            time: Timestamp in milliseconds (default: now)
            port: Marker origin (default: "SpatialEEG")

        Returns:
            Marker object
        """
        if not self.record_id:
            raise CortexAPIError("No active recording")

        if time is None:
            time = int(datetime.now().timestamp() * 1000)

        logger.info(f"Injecting marker: {label}={value}")
        result = await self._call_api("injectMarker", {
            "cortexToken": self.cortex_token,
            "session": self.session_id,
            "label": label,
            "value": value,
            "port": port,
            "time": time
        })

        return result.get("marker", {})

    async def export_record(
        self,
        record_ids: List[str],
        folder: str,
        format: str = "CSV",
        stream_types: Optional[List[str]] = None
    ) -> Dict:
        """
        Export recorded data.

        Args:
            record_ids: List of record IDs to export
            folder: Local folder path for export
            format: "CSV", "EDF", or "EDFPLUS"
            stream_types: Specific streams to export (default: all)

        Returns:
            Export result
        """
        params = {
            "cortexToken": self.cortex_token,
            "recordIds": record_ids,
            "folder": folder,
            "format": format
        }

        if stream_types:
            params["streamTypes"] = stream_types

        logger.info(f"Exporting {len(record_ids)} record(s) to {folder}")
        result = await self._call_api("exportRecord", params)

        logger.info("✓ Export complete")
        return result


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def parse_eeg_data(data: Dict) -> Dict:
    """
    Parse EEG stream data into structured format.

    Args:
        data: Raw EEG data from Cortex

    Returns:
        Parsed EEG data with channels
    """
    time = data.get("time", 0)
    samples = data.get("eeg", [])

    # For Insight: AF3, AF4, T7, T8, Pz (5 channels)
    channels = ["AF3", "AF4", "T7", "T8", "Pz"]

    return {
        "time": time,
        "channels": channels,
        "values": samples[:5] if len(samples) >= 5 else samples
    }


def parse_met_data(data: Dict) -> Dict:
    """
    Parse performance metrics (met) stream data.

    Args:
        data: Raw met data from Cortex

    Returns:
        Parsed metrics: eng, exc, lex, str, rel, int, foc
    """
    time = data.get("time", 0)
    met = data.get("met", [])

    return {
        "time": time,
        "engagement": met[0] if len(met) > 0 else 0,      # eng
        "excitement": met[1] if len(met) > 1 else 0,      # exc
        "lexical": met[2] if len(met) > 2 else 0,         # lex
        "stress": met[3] if len(met) > 3 else 0,          # str
        "relaxation": met[4] if len(met) > 4 else 0,      # rel
        "interest": met[5] if len(met) > 5 else 0,        # int
        "focus": met[6] if len(met) > 6 else 0            # foc
    }


def parse_pow_data(data: Dict) -> Dict:
    """
    Parse band power (pow) stream data.

    Args:
        data: Raw pow data from Cortex

    Returns:
        Parsed band power for each channel (theta, alpha, beta, gamma)
    """
    time = data.get("time", 0)
    pow_data = data.get("pow", [])

    # For Insight (5 channels), each has 4 bands: theta, alpha, betaL, betaH, gamma
    # Total: 5 * 5 = 25 values

    channels = ["AF3", "AF4", "T7", "T8", "Pz"]
    bands = ["theta", "alpha", "betaL", "betaH", "gamma"]

    result = {"time": time, "channels": {}}

    for i, channel in enumerate(channels):
        start_idx = i * 5
        result["channels"][channel] = {
            "theta": pow_data[start_idx] if len(pow_data) > start_idx else 0,
            "alpha": pow_data[start_idx + 1] if len(pow_data) > start_idx + 1 else 0,
            "betaL": pow_data[start_idx + 2] if len(pow_data) > start_idx + 2 else 0,
            "betaH": pow_data[start_idx + 3] if len(pow_data) > start_idx + 3 else 0,
            "gamma": pow_data[start_idx + 4] if len(pow_data) > start_idx + 4 else 0
        }

    return result


def parse_mot_data(data: Dict) -> Dict:
    """
    Parse motion (mot) stream data.

    Args:
        data: Raw mot data from Cortex

    Returns:
        Parsed motion data (gyro, accel, magnetometer)
    """
    time = data.get("time", 0)
    mot = data.get("mot", [])

    return {
        "time": time,
        "gyro": {
            "x": mot[0] if len(mot) > 0 else 0,
            "y": mot[1] if len(mot) > 1 else 0,
            "z": mot[2] if len(mot) > 2 else 0
        },
        "accel": {
            "x": mot[3] if len(mot) > 3 else 0,
            "y": mot[4] if len(mot) > 4 else 0,
            "z": mot[5] if len(mot) > 5 else 0
        },
        "mag": {
            "x": mot[6] if len(mot) > 6 else 0,
            "y": mot[7] if len(mot) > 7 else 0,
            "z": mot[8] if len(mot) > 8 else 0
        }
    }


def parse_eq_data(data: Dict) -> Dict:
    """
    Parse contact quality (eq) stream data.

    Args:
        data: Raw eq data from Cortex

    Returns:
        Contact quality for each channel (0-4 scale)
    """
    time = data.get("time", 0)
    eq = data.get("eq", [])

    channels = ["AF3", "AF4", "T7", "T8", "Pz"]

    return {
        "time": time,
        "quality": {
            channels[i]: eq[i] if i < len(eq) else 0
            for i in range(len(channels))
        }
    }