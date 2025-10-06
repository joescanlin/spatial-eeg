"""
EEG Session Control API
Endpoints for managing Emotiv Cortex sessions, recording, and markers.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
import logging
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/eeg", tags=["eeg"])

# Global Cortex client instance (initialized on startup)
cortex_client = None
stream_reader = None


class EEGSessionConfig(BaseModel):
    """Configuration for EEG session"""
    headset_id: Optional[str] = None
    streams: List[str] = ["eeg", "met", "pow", "mot", "eq", "dev"]


class RecordingConfig(BaseModel):
    """Configuration for starting a recording"""
    title: str
    subject_name: Optional[str] = None
    experiment_id: Optional[str] = "geriatric_flooring_2025"
    description: Optional[str] = None
    tags: Optional[List[str]] = None


class MarkerConfig(BaseModel):
    """Configuration for injecting a marker"""
    label: str
    value: str
    time: Optional[int] = None


class ExportConfig(BaseModel):
    """Configuration for exporting records"""
    record_ids: List[str]
    folder: str
    format: str = "CSV"  # CSV, EDF, EDFPLUS
    streams: Optional[List[str]] = None


# ============================================================================
# CORTEX CLIENT INITIALIZATION
# ============================================================================

async def initialize_cortex(client_id: str, client_secret: str, license_id: Optional[str] = None):
    """
    Initialize Cortex client on application startup.

    Args:
        client_id: Emotiv application client ID
        client_secret: Emotiv application client secret
        license_id: Optional license ID for paid features
    """
    global cortex_client, stream_reader

    from src.utils.cortex_client import CortexClient
    from src.utils.lsl_client import CortexStreamReader

    try:
        logger.info("Initializing Cortex client...")

        cortex_client = CortexClient(client_id, client_secret, license_id)

        # Connect to Cortex
        if not await cortex_client.connect():
            raise Exception("Failed to connect to Cortex")

        # Authenticate
        if not await cortex_client.authenticate():
            raise Exception("Failed to authenticate with Cortex")

        # Initialize stream reader
        stream_reader = CortexStreamReader(cortex_client)

        logger.info("✓ Cortex client initialized")
        return True

    except Exception as e:
        logger.error(f"Failed to initialize Cortex: {e}")
        return False


async def shutdown_cortex():
    """Shutdown Cortex client gracefully"""
    global cortex_client, stream_reader

    if cortex_client:
        await cortex_client.disconnect()

    cortex_client = None
    stream_reader = None
    logger.info("✓ Cortex client shut down")


# ============================================================================
# STATUS ENDPOINTS
# ============================================================================

@router.get("/status")
async def get_eeg_status():
    """Get current EEG system status"""
    if not cortex_client:
        return {
            "connected": False,
            "authenticated": False,
            "session_active": False,
            "recording": False,
            "streaming": False
        }

    return {
        "connected": cortex_client.is_connected,
        "authenticated": cortex_client.cortex_token is not None,
        "session_active": cortex_client.session_id is not None,
        "recording": cortex_client.record_id is not None,
        "streaming": stream_reader.running if stream_reader else False,
        "headset_id": cortex_client.headset_id
    }


@router.get("/headsets")
async def list_headsets():
    """List available EEG headsets"""
    if not cortex_client or not cortex_client.cortex_token:
        raise HTTPException(status_code=400, detail="Cortex not initialized or not authenticated")

    try:
        headsets = await cortex_client.query_headsets()
        return {"headsets": headsets}
    except Exception as e:
        logger.error(f"Failed to query headsets: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# SESSION MANAGEMENT
# ============================================================================

@router.post("/session/start")
async def start_eeg_session(config: EEGSessionConfig):
    """
    Start an EEG session and begin streaming data.

    Steps:
    1. Connect to headset
    2. Create session
    3. Subscribe to data streams
    """
    if not cortex_client or not cortex_client.cortex_token:
        raise HTTPException(status_code=400, detail="Cortex not initialized or not authenticated")

    try:
        # Connect to headset
        logger.info("Connecting to headset...")
        if not await cortex_client.connect_headset(config.headset_id):
            raise Exception("Failed to connect to headset")

        # Create session
        logger.info("Creating session...")
        session_id = await cortex_client.create_session(activate=True)

        if not session_id:
            raise Exception("Failed to create session")

        # Start stream reader
        if stream_reader:
            await stream_reader.start(config.streams)

            # Start stream loop in background
            asyncio.create_task(cortex_client.start_stream_loop())

        return {
            "success": True,
            "session_id": session_id,
            "headset_id": cortex_client.headset_id,
            "streams": config.streams
        }

    except Exception as e:
        logger.error(f"Failed to start EEG session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session/stop")
async def stop_eeg_session():
    """
    Stop the current EEG session.

    Note: We don't close the Cortex session to avoid WebSocket conflicts.
    Just stop the stream reader and clear flags. The session remains open
    for the next recording.
    """
    if not cortex_client:
        raise HTTPException(status_code=400, detail="No active session")

    try:
        # Clear recording flag if active (don't call Cortex API)
        if cortex_client.record_id:
            logger.info(f"Clearing recording flag: {cortex_client.record_id}")
            cortex_client.record_id = None

        # Stop stream reader
        if stream_reader:
            stream_reader.stop()
            logger.info("Stream reader stopped")

        # Don't close the Cortex session - just mark as ready for next recording
        logger.info("EEG session ready for next recording")

        return {"success": True, "message": "Session stopped"}

    except Exception as e:
        logger.error(f"Failed to stop session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# RECORDING CONTROL
# ============================================================================

@router.post("/recording/start")
async def start_recording(config: RecordingConfig):
    """
    Start recording the current session.

    Note: We don't use Emotiv cloud recording since we save data locally.
    This just marks the session as "recording" for frontend state management.
    """
    if not cortex_client or not cortex_client.session_id:
        raise HTTPException(status_code=400, detail="No active session")

    try:
        # Set recording flag without calling Cortex API (avoids WebSocket conflict)
        cortex_client.record_id = f"local_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        logger.info(f"Marking session as recording: {cortex_client.record_id}")

        return {
            "success": True,
            "record_id": cortex_client.record_id,
            "started_at": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to start recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recording/stop")
async def stop_recording():
    """
    Stop the current recording.

    Note: We don't use Emotiv cloud recording since we save data locally.
    This just clears the recording flag for frontend state management.
    """
    if not cortex_client or not cortex_client.record_id:
        raise HTTPException(status_code=400, detail="No active recording")

    try:
        # Clear recording flag without calling Cortex API (avoids WebSocket conflict)
        logger.info(f"Clearing recording flag: {cortex_client.record_id}")
        cortex_client.record_id = None

        return {
            "success": True,
            "message": "Recording stopped",
            "stopped_at": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to stop recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recording/marker")
async def inject_marker(marker: MarkerConfig):
    """
    Inject a marker into the current recording.

    Use this to mark events like:
    - Floor pattern changes
    - Task start/end
    - Observed behaviors
    """
    if not cortex_client or not cortex_client.record_id:
        raise HTTPException(status_code=400, detail="No active recording")

    try:
        result = await cortex_client.inject_marker(
            label=marker.label,
            value=marker.value,
            time=marker.time
        )

        return {
            "success": True,
            "marker": result
        }

    except Exception as e:
        logger.error(f"Failed to inject marker: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recording/export")
async def export_recording(config: ExportConfig, background_tasks: BackgroundTasks):
    """
    Export recorded data to local files.

    Formats:
    - CSV: Easy for analysis in Python/R
    - EDF: Standard neuroimaging format
    - EDFPLUS: EDF with annotations
    """
    if not cortex_client:
        raise HTTPException(status_code=400, detail="Cortex not initialized")

    try:
        # Run export in background as it can take a while
        background_tasks.add_task(
            _export_records,
            config.record_ids,
            config.folder,
            config.format,
            config.streams
        )

        return {
            "success": True,
            "message": f"Export started for {len(config.record_ids)} record(s)",
            "format": config.format,
            "folder": config.folder
        }

    except Exception as e:
        logger.error(f"Failed to export recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _export_records(record_ids: List[str], folder: str, format: str, streams: Optional[List[str]]):
    """Background task to export records"""
    try:
        await cortex_client.export_record(
            record_ids=record_ids,
            folder=folder,
            format=format,
            stream_types=streams
        )
        logger.info(f"✓ Export complete: {len(record_ids)} records to {folder}")
    except Exception as e:
        logger.error(f"Export failed: {e}")


# ============================================================================
# REAL-TIME DATA ENDPOINTS
# ============================================================================

@router.get("/data/latest")
async def get_latest_data():
    """
    Get latest sample from all streams.

    Returns:
        Latest EEG, metrics, band power, motion, and contact quality data
    """
    if not stream_reader or not stream_reader.running:
        return {
            "eeg": None,
            "metrics": None,
            "band_power": None,
            "motion": None,
            "contact_quality": None
        }

    return {
        "eeg": stream_reader.get_latest_sample("eeg"),
        "metrics": stream_reader.get_latest_metrics(),
        "band_power": stream_reader.get_latest_band_power(),
        "motion": stream_reader.get_latest_sample("mot"),
        "contact_quality": stream_reader.get_latest_contact_quality()
    }


@router.get("/data/metrics")
async def get_performance_metrics():
    """
    Get latest performance metrics (engagement, stress, focus, etc.)

    These are the primary metrics for cognitive state assessment.
    """
    if not stream_reader or not stream_reader.running:
        return None

    return stream_reader.get_latest_metrics()


@router.get("/data/band-power")
async def get_band_power():
    """
    Get latest brain wave band power (theta, alpha, beta, gamma).

    Useful for:
    - Cognitive load assessment (beta power)
    - Relaxation state (alpha power)
    - Memory encoding (theta power)
    """
    if not stream_reader or not stream_reader.running:
        return None

    return stream_reader.get_latest_band_power()


@router.get("/data/contact-quality")
async def get_contact_quality():
    """
    Get EEG sensor contact quality.

    Values:
    - 0: No signal
    - 1: Very poor
    - 2: Poor
    - 3: Fair
    - 4: Good

    All sensors should be 3+ for reliable data.
    """
    if not stream_reader or not stream_reader.running:
        return None

    # Get raw eq stream to include battery and overall quality
    latest = stream_reader.get_latest_sample("eq")
    if latest:
        _, values = latest
        if len(values) >= 3:
            return {
                "battery": int(values[0]),
                "overall_quality": int(values[1]),
                "sample_rate_quality": float(values[2]),
                "sensors": stream_reader.get_latest_contact_quality()
            }

    return stream_reader.get_latest_contact_quality()


# ============================================================================
# UTILITY ENDPOINTS
# ============================================================================

@router.post("/reconnect")
async def reconnect_cortex():
    """Reconnect to Cortex service (if connection lost)"""
    if not cortex_client:
        raise HTTPException(status_code=400, detail="Cortex client not initialized")

    try:
        await cortex_client.disconnect()
        if not await cortex_client.connect():
            raise Exception("Failed to reconnect")

        if not await cortex_client.authenticate():
            raise Exception("Failed to re-authenticate")

        return {"success": True, "message": "Reconnected to Cortex"}

    except Exception as e:
        logger.error(f"Reconnection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/channels")
async def get_channel_info():
    """Get EEG channel information for Insight headset"""
    return {
        "channels": ["AF3", "AF4", "T7", "T8", "Pz"],
        "locations": {
            "AF3": "Left anterior frontal",
            "AF4": "Right anterior frontal",
            "T7": "Left temporal",
            "T8": "Right temporal",
            "Pz": "Parietal midline (center back)"
        },
        "sampling_rate": 128,
        "resolution": 14,  # bits
        "bandwidth": "0.5 - 43 Hz"
    }