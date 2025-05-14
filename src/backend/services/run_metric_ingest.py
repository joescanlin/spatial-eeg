#!/usr/bin/env python
"""
Script to run the metric ingestion service as a background task.
"""
import os
import sys
import asyncio
import logging
import argparse
import signal
from contextlib import AsyncExitStack

from src.backend.db.session import AsyncSessionLocal
from src.backend.services.metric_ingest import DBMetricPersister

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('metric_ingest.log')
    ]
)
logger = logging.getLogger(__name__)

# Global variables
persister = None
running = True

def signal_handler(sig, frame):
    """Handle interrupt signals to cleanly shutdown."""
    global running
    logger.info("Received shutdown signal, closing...")
    running = False

async def main():
    """Main entry point for the metric ingestion service."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='PT Analytics: Metric Ingestion Service')
    parser.add_argument('--broker', type=str, default='169.254.100.100', help='MQTT broker hostname or IP address')
    parser.add_argument('--port', type=int, default=1883, help='MQTT broker port')
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')
    args = parser.parse_args()
    
    # Set up logging level
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Get broker information
    broker_host = args.broker
    broker_port = args.port
    
    # Create DB session with exit stack
    async with AsyncExitStack() as stack:
        # Create DB session
        db = await stack.enter_async_context(AsyncSessionLocal())
        
        # Create metric persister
        global persister
        persister = DBMetricPersister(db)
        
        # Start metric persister
        await persister.start(broker_host, broker_port)
        
        # Keep running until interrupted
        global running
        while running:
            await asyncio.sleep(1)
        
        # Stop metric persister
        await persister.stop()
    
    logger.info("Shutdown complete")

if __name__ == "__main__":
    asyncio.run(main()) 