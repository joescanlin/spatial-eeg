#!/usr/bin/env python
import os
import sys
import time
import json
import logging
import argparse
import signal
from datetime import datetime

import paho.mqtt.client as mqtt
import numpy as np

from src.utils.config import get_settings
from src.utils.mqtt_client import create_mqtt_client, subscribe_pt_raw
from src.pt_analytics.parsers.frame_parser import parse_frame
from src.pt_analytics.services.publisher import PTMetricPublisher

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('pt_analytics.log')
    ]
)
logger = logging.getLogger(__name__)

# Global variables
running = True
publisher = None
settings = get_settings()

def signal_handler(sig, frame):
    """Handle interrupt signals to cleanly shutdown."""
    global running
    logger.info("Received shutdown signal, closing...")
    running = False
    
def on_connect(client, userdata, flags, rc):
    """Callback for when the client connects to the broker."""
    if rc == 0:
        logger.info("Connected to MQTT broker")
        # Subscribe to PT raw data topic
        subscribe_pt_raw(client)
    else:
        logger.error(f"Failed to connect to MQTT broker with code: {rc}")

def on_disconnect(client, userdata, rc):
    """Callback for when the client disconnects from the broker."""
    if rc != 0:
        logger.warning(f"Unexpected disconnect from MQTT broker: {rc}")
    else:
        logger.info("Disconnected from MQTT broker")

def on_message(client, userdata, msg):
    """Callback for when a message is received from the broker."""
    try:
        # Parse the message
        payload = json.loads(msg.payload.decode('utf-8'))
        
        # Extract timestamp
        ts = payload.get('timestamp')
        if ts is None:
            ts = time.time()
        elif isinstance(ts, str):
            # Try to parse ISO format timestamp
            try:
                ts = datetime.fromisoformat(ts).timestamp()
            except ValueError:
                # Fall back to current time
                ts = time.time()
        
        # Extract the frame data
        frame_data = payload.get('frame')
        if frame_data is None:
            logger.warning("Received message without frame data")
            return
            
        # Parse the frame data
        is_compressed = payload.get('compressed', True)
        if isinstance(frame_data, str):
            # Base64 encoded data
            import base64
            frame_bytes = base64.b64decode(frame_data)
            frame_bool = parse_frame(frame_bytes, gzipped=is_compressed)
        elif isinstance(frame_data, list):
            # Direct 2D array
            frame_bool = np.array(frame_data, dtype=bool)
        else:
            logger.warning(f"Unrecognized frame data format: {type(frame_data)}")
            return
            
        # Process the frame with the publisher
        global publisher
        if publisher:
            publisher.process(frame_bool, ts)
            
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}", exc_info=True)

def main():
    """Main entry point for the PT analytics stream-to-metrics service."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='PT Analytics: Stream to Metrics Service')
    parser.add_argument('--broker', type=str, help='MQTT broker hostname or IP address')
    parser.add_argument('--port', type=int, default=1883, help='MQTT broker port')
    parser.add_argument('--raw-topic', type=str, help='Topic for raw sensor data')
    parser.add_argument('--metrics-topic', type=str, help='Topic for derived metrics')
    parser.add_argument('--publish-hz', type=int, help='Publishing frequency in Hz')
    parser.add_argument('--client-id', type=str, help='MQTT client ID')
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')
    args = parser.parse_args()
    
    # Set up logging level
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
        
    # Set environment variable for PT mode
    os.environ['MODE'] = 'PT'
    
    # Get broker information from args or config
    broker_host = args.broker or "169.254.100.100"  # Default to the value from config.yaml
    broker_port = args.port or 1883
    
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Create MQTT client
    client_id = args.client_id or f"pt-analytics-{os.getpid()}"
    client = create_mqtt_client(client_id)
    
    # Set up MQTT callbacks
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    
    # Create publisher
    global publisher
    publisher = PTMetricPublisher(mqtt_client=client)
    
    # Connect to broker
    logger.info(f"Connecting to MQTT broker at {broker_host}:{broker_port}")
    try:
        client.connect(broker_host, broker_port)
    except Exception as e:
        logger.error(f"Failed to connect to MQTT broker: {str(e)}")
        return 1
    
    # Start MQTT loop
    client.loop_start()
    
    # Main loop
    try:
        while running:
            time.sleep(0.1)  # Sleep to avoid busy-waiting
    except Exception as e:
        logger.error(f"Error in main loop: {str(e)}", exc_info=True)
        
    # Clean shutdown
    logger.info("Shutting down...")
    if publisher:
        publisher.stop()
    client.loop_stop()
    client.disconnect()
    logger.info("Shutdown complete")
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 