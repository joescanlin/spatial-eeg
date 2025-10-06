# src/utils/lsl_client.py
"""
EEG Stream Reader
Supports both LSL (Lab Streaming Layer) and direct Cortex API streaming.

For LSL: Connects to Emotiv PRO's LSL outlet
For Cortex: Uses direct WebSocket connection to Cortex API

The LSL approach is simpler (EmotivPRO does the work), while Cortex gives
more control and access to performance metrics, band power, etc.
"""

from typing import List, Tuple, Optional, Dict
from collections import deque
import threading
import time
import logging

logger = logging.getLogger(__name__)

# Try to import LSL (optional)
try:
    from pylsl import StreamInlet, resolve_byprop, TimeoutError as LSLTimeoutError
    LSL_AVAILABLE = True
except ImportError:
    LSL_AVAILABLE = False
    logger.warning("pylsl not installed. LSL streaming not available.")


class LSLReader:
    """
    LSL Stream Reader for EmotivPRO LSL outlet.

    This is the simpler approach - EmotivPRO does the Cortex API work
    and exposes an LSL stream that we can consume.
    """

    def __init__(self, stream_name: str = "EEG", max_buffer_sec: float = 10.0):
        if not LSL_AVAILABLE:
            raise RuntimeError("pylsl not installed. Cannot use LSL streaming.")

        self.stream_name = stream_name
        self.inlet: Optional[StreamInlet] = None
        self.buf = deque()  # list of (t_epoch, [ch...])
        self.lock = threading.Lock()
        self.running = False
        self.max_buffer_sec = max_buffer_sec
        self.channel_labels: List[str] = []

    def start(self):
        if self.running:
            return

        logger.info(f"Resolving LSL stream: {self.stream_name}")
        streams = resolve_byprop("name", self.stream_name, timeout=5)

        if not streams:
            raise RuntimeError(f"LSL stream '{self.stream_name}' not found")

        self.inlet = StreamInlet(streams[0], max_buflen=self.max_buffer_sec)

        # Get channel labels
        info = self.inlet.info()
        ch = info.desc().child("channels").child("channel")
        self.channel_labels = []
        for _ in range(info.channel_count()):
            self.channel_labels.append(ch.child_value("label"))
            ch = ch.next_sibling()

        logger.info(f"Connected to LSL stream: {self.channel_labels}")

        self.running = True
        threading.Thread(target=self._loop, daemon=True).start()

    def _loop(self):
        while self.running:
            try:
                chunk, ts = self.inlet.pull_chunk(timeout=0.05)
                if chunk and ts:
                    now = time.time()
                    with self.lock:
                        for i, row in enumerate(chunk):
                            self.buf.append((ts[i], row))
                        # trim buffer
                        cutoff = now - self.max_buffer_sec
                        while self.buf and self.buf[0][0] < cutoff:
                            self.buf.popleft()
            except LSLTimeoutError:
                pass
            except Exception as e:
                logger.error(f"Error in LSL loop: {e}")
                time.sleep(0.1)

    def stop(self):
        self.running = False
        logger.info("LSL reader stopped")

    def snapshot_latest(self, n: int = 32) -> List[Tuple[float, List[float]]]:
        """Return up to n most recent samples (for UI)."""
        with self.lock:
            return list(self.buf)[-n:]

    def drain_since(self, t_min: float) -> List[Tuple[float, List[float]]]:
        """Pop and return samples with ts >= t_min (for writer)."""
        out = []
        with self.lock:
            while self.buf and self.buf[0][0] < t_min:
                self.buf.popleft()
            while self.buf:
                out.append(self.buf.popleft())
        return out

    def get_channel_labels(self) -> List[str]:
        """Get channel labels (e.g., ['AF3', 'AF4', 'T7', 'T8', 'Pz'])"""
        return self.channel_labels


class CortexStreamReader:
    """
    Direct Cortex API Stream Reader.

    Provides access to all Cortex streams:
    - eeg: Raw EEG (128 Hz)
    - met: Performance metrics (8 Hz) - engagement, stress, focus, etc.
    - pow: Band power (8 Hz) - theta, alpha, beta, gamma
    - mot: Motion data (64 Hz) - gyro, accel, mag
    - eq: Contact quality (2 Hz)
    - dev: Device info (2 Hz)
    """

    def __init__(self, cortex_client, max_buffer_sec: float = 10.0):
        """
        Initialize Cortex stream reader.

        Args:
            cortex_client: Instance of CortexClient (from cortex_client.py)
            max_buffer_sec: Maximum buffer size in seconds
        """
        self.cortex = cortex_client
        self.max_buffer_sec = max_buffer_sec

        # Separate buffers for each stream type
        self.buffers = {
            "eeg": deque(),
            "met": deque(),
            "pow": deque(),
            "mot": deque(),
            "eq": deque(),
            "dev": deque()
        }
        self.locks = {stream: threading.Lock() for stream in self.buffers.keys()}
        self.running = False

        # Channel labels for Insight
        self.eeg_channels = ["AF3", "AF4", "T7", "T8", "Pz"]

    async def start(self, streams: Optional[List[str]] = None):
        """
        Start streaming from Cortex.

        Args:
            streams: List of streams to subscribe to (default: all available)
        """
        if streams is None:
            # Subscribe to all research-relevant streams
            streams = ["eeg", "met", "pow", "mot", "eq", "dev"]

        logger.info(f"Starting Cortex stream reader for: {streams}")

        # Register callbacks for each stream
        for stream in streams:
            if stream in self.buffers:
                self.cortex.add_stream_callback(stream, self._create_callback(stream))

        # Subscribe to streams
        await self.cortex.subscribe(streams)

        self.running = True
        logger.info("✓ Cortex stream reader started")

    def _create_callback(self, stream_name: str):
        """Create a callback function for a specific stream"""
        def callback(data: Dict):
            """Handle incoming stream data"""
            timestamp = data.get("time", time.time())

            # Parse data based on stream type
            if stream_name == "eeg":
                values = data.get("eeg", [])[:5]  # Insight has 5 channels
            elif stream_name == "met":
                values = data.get("met", [])
            elif stream_name == "pow":
                values = data.get("pow", [])
            elif stream_name == "mot":
                values = data.get("mot", [])
            elif stream_name == "eq":
                values = data.get("eq", [])
            elif stream_name == "dev":
                values = data.get("dev", [])
            else:
                return

            # Add to buffer
            with self.locks[stream_name]:
                self.buffers[stream_name].append((timestamp, values))

                # Trim old data
                cutoff = time.time() - self.max_buffer_sec
                while self.buffers[stream_name] and self.buffers[stream_name][0][0] < cutoff:
                    self.buffers[stream_name].popleft()

        return callback

    def stop(self):
        """Stop streaming"""
        self.running = False
        logger.info("Cortex stream reader stopped")

    def snapshot_latest(self, stream: str = "eeg", n: int = 32) -> List[Tuple[float, List[float]]]:
        """
        Get latest samples from a specific stream.

        Args:
            stream: Stream name (eeg, met, pow, mot, eq, dev)
            n: Number of samples to return

        Returns:
            List of (timestamp, values) tuples
        """
        if stream not in self.buffers:
            return []

        with self.locks[stream]:
            return list(self.buffers[stream])[-n:]

    def drain_since(self, stream: str, t_min: float) -> List[Tuple[float, List[float]]]:
        """
        Pop and return samples with timestamp >= t_min.

        Args:
            stream: Stream name
            t_min: Minimum timestamp

        Returns:
            List of (timestamp, values) tuples
        """
        if stream not in self.buffers:
            return []

        out = []
        with self.locks[stream]:
            while self.buffers[stream] and self.buffers[stream][0][0] < t_min:
                self.buffers[stream].popleft()
            while self.buffers[stream]:
                out.append(self.buffers[stream].popleft())
        return out

    def get_latest_sample(self, stream: str) -> Optional[Tuple[float, List[float]]]:
        """
        Get most recent sample from a stream.

        Args:
            stream: Stream name

        Returns:
            (timestamp, values) or None
        """
        if stream not in self.buffers:
            return None

        with self.locks[stream]:
            if self.buffers[stream]:
                return self.buffers[stream][-1]
            return None

    def get_channel_labels(self) -> List[str]:
        """Get EEG channel labels"""
        return self.eeg_channels

    def get_latest_metrics(self) -> Optional[Dict]:
        """
        Get latest performance metrics (met stream).

        Returns:
            Dict with engagement, stress, focus, etc., or None
        """
        latest = self.get_latest_sample("met")
        if not latest:
            return None

        _, values = latest

        return {
            "engagement": values[0] if len(values) > 0 else 0,
            "excitement": values[1] if len(values) > 1 else 0,
            "lexical": values[2] if len(values) > 2 else 0,
            "stress": values[3] if len(values) > 3 else 0,
            "relaxation": values[4] if len(values) > 4 else 0,
            "interest": values[5] if len(values) > 5 else 0,
            "focus": values[6] if len(values) > 6 else 0
        }

    def get_latest_band_power(self) -> Optional[Dict]:
        """
        Get latest band power (pow stream).

        Returns:
            Dict with band power for each channel, or None
        """
        latest = self.get_latest_sample("pow")
        if not latest:
            return None

        _, values = latest

        # For Insight: 5 channels × 5 bands = 25 values
        result = {}
        for i, channel in enumerate(self.eeg_channels):
            start_idx = i * 5
            result[channel] = {
                "theta": values[start_idx] if len(values) > start_idx else 0,
                "alpha": values[start_idx + 1] if len(values) > start_idx + 1 else 0,
                "betaL": values[start_idx + 2] if len(values) > start_idx + 2 else 0,
                "betaH": values[start_idx + 3] if len(values) > start_idx + 3 else 0,
                "gamma": values[start_idx + 4] if len(values) > start_idx + 4 else 0
            }

        return result

    def get_latest_contact_quality(self) -> Optional[Dict]:
        """
        Get latest contact quality (eq stream).

        EQ stream format: [batteryPercent, overall, sampleRateQuality, sensor1, sensor2, ...]
        - First 3 values are: battery (0-100), overall quality (0-100), sample rate (0-1)
        - Remaining values are individual sensor quality (0-4 scale)

        Returns:
            Dict with quality for each channel (0-4 scale), or None
        """
        latest = self.get_latest_sample("eq")
        if not latest:
            return None

        _, values = latest

        # Skip first 3 values (battery, overall, sampleRate) and get sensor qualities
        # Sensor qualities are already on 0-4 scale, no conversion needed
        if len(values) < 3:
            return None

        sensor_values = values[3:]  # Skip first 3 metadata values

        return {
            channel: int(sensor_values[i]) if i < len(sensor_values) else 0
            for i, channel in enumerate(self.eeg_channels)
        }