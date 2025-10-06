"""
Simple Flask routes for EEG streaming
Integrates with existing Flask server
"""

import asyncio
import json
import threading
from flask import jsonify, request
import logging

logger = logging.getLogger(__name__)

# Global Cortex client (will be initialized on server startup)
cortex_client = None
cortex_stream_reader = None
cortex_loop = None
cortex_thread = None


def start_cortex_in_thread(client_id, client_secret, license_id=None):
    """Start Cortex client in a background thread with its own event loop"""
    global cortex_client, cortex_stream_reader, cortex_loop, cortex_thread

    def run_cortex():
        global cortex_loop
        cortex_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(cortex_loop)

        try:
            from src.utils.cortex_client import CortexClient
            from src.utils.lsl_client import CortexStreamReader

            logger.info("🧠 Initializing Cortex in background thread...")

            # Create client
            global cortex_client, cortex_stream_reader
            cortex_client = CortexClient(client_id, client_secret, license_id)

            # Connect and authenticate
            cortex_loop.run_until_complete(cortex_client.connect())
            cortex_loop.run_until_complete(cortex_client.authenticate())
            cortex_loop.run_until_complete(cortex_client.connect_headset())
            cortex_loop.run_until_complete(cortex_client.create_session(activate=True))

            # Create stream reader
            cortex_stream_reader = CortexStreamReader(cortex_client)
            cortex_loop.run_until_complete(
                cortex_stream_reader.start(['eeg', 'met', 'pow', 'mot', 'eq', 'dev'])
            )

            logger.info("✅ Cortex initialized and streaming!")

            # Start the stream loop
            cortex_loop.run_until_complete(cortex_client.start_stream_loop())

        except Exception as e:
            logger.error(f"Cortex initialization failed: {e}")
            import traceback
            traceback.print_exc()

    cortex_thread = threading.Thread(target=run_cortex, daemon=True)
    cortex_thread.start()


def init_eeg_routes(app):
    """Initialize EEG routes on Flask app"""

    @app.route('/api/eeg/status')
    def eeg_status():
        """Get EEG connection status"""
        return jsonify({
            "connected": cortex_client is not None and cortex_client.is_connected,
            "streaming": cortex_stream_reader is not None and cortex_stream_reader.running,
            "headset_id": cortex_client.headset_id if cortex_client else None
        })

    @app.route('/api/eeg/data/latest')
    def eeg_data_latest():
        """Get latest EEG data"""
        if not cortex_stream_reader or not cortex_stream_reader.running:
            return jsonify(None)

        return jsonify({
            "eeg": cortex_stream_reader.get_latest_sample("eeg"),
            "metrics": cortex_stream_reader.get_latest_metrics(),
            "bandPower": cortex_stream_reader.get_latest_band_power(),
            "motion": cortex_stream_reader.get_latest_sample("mot"),
            "contactQuality": cortex_stream_reader.get_latest_contact_quality()
        })

    @app.route('/api/eeg/data/metrics')
    def eeg_data_metrics():
        """Get latest performance metrics"""
        if not cortex_stream_reader or not cortex_stream_reader.running:
            return jsonify(None)

        return jsonify(cortex_stream_reader.get_latest_metrics())

    @app.route('/api/eeg/data/contact-quality')
    def eeg_contact_quality():
        """Get contact quality"""
        if not cortex_stream_reader or not cortex_stream_reader.running:
            return jsonify(None)

        return jsonify(cortex_stream_reader.get_latest_contact_quality())

    logger.info("✅ EEG routes initialized")
