"""
Metric ingestion service that subscribes to MQTT metrics and persists them to the database.
"""
import json
import asyncio
import logging
from datetime import datetime
from typing import Optional, Callable, Dict, Any

import paho.mqtt.client as mqtt
from sqlalchemy.ext.asyncio import AsyncSession

from src.utils.mqtt_client import create_mqtt_client, connect_mqtt_client, subscribe_pt_metrics
from src.backend.db.models import PTMetricSample
from src.backend.services import session_cache

logger = logging.getLogger(__name__)

class DBMetricPersister:
    """
    Database metric persister that subscribes to MQTT metrics and persists them to the database.
    """
    def __init__(self, db: AsyncSession, mqtt_client: mqtt.Client = None):
        """
        Initialize the metric persister.
        
        Args:
            db: SQLAlchemy async session
            mqtt_client: MQTT client instance (if None, creates a new one)
        """
        self.db = db
        self.client = mqtt_client if mqtt_client else create_mqtt_client("pt_metric_persister")
        self.running = False
        self.topic = None
        self.message_handlers = []
        
        # Set up MQTT callbacks
        self.client.on_message = self._on_mqtt_message
        self.client.on_connect = self._on_mqtt_connect
        self.client.on_disconnect = self._on_mqtt_disconnect
    
    def register_message_handler(self, handler: Callable[[str, Dict[str, Any]], None]):
        """
        Register a callback to receive messages from the MQTT broker.
        
        Args:
            handler: Function that will be called with (topic, payload) as arguments
        """
        self.message_handlers.append(handler)
        logger.info(f"Registered new message handler, total handlers: {len(self.message_handlers)}")
    
    def _on_mqtt_connect(self, client, userdata, flags, rc):
        """Callback for when the client connects to the broker."""
        if rc == 0:
            logger.info("Connected to MQTT broker")
            # Re-subscribe to metrics topic if we have one
            if self.topic:
                client.subscribe(self.topic, qos=1)
                logger.info(f"Resubscribed to topic: {self.topic}")
            else:
                # Subscribe to the metrics topic
                subscribe_pt_metrics(client)
        else:
            logger.error(f"Failed to connect to MQTT broker with code: {rc}")
    
    def _on_mqtt_disconnect(self, client, userdata, rc):
        """Callback for when the client disconnects from the broker."""
        if rc != 0:
            logger.warning(f"Unexpected disconnect from MQTT broker: {rc}")
        else:
            logger.info("Disconnected from MQTT broker")
    
    def _on_mqtt_message(self, client, userdata, msg):
        """
        Callback for when a message is received from the broker.
        This method will forward the message to the async on_message method.
        """
        try:
            # Store the topic for resubscription if needed
            self.topic = msg.topic
            
            # Convert payload to string
            payload_str = msg.payload.decode('utf-8')
            
            # Pass to custom message handlers
            try:
                payload_data = json.loads(payload_str)
                for handler in self.message_handlers:
                    handler(msg.topic, payload_data)
            except json.JSONDecodeError:
                logger.warning(f"Received non-JSON payload: {payload_str}")
            
            # Schedule the async on_message method
            asyncio.create_task(self.on_message(msg.topic, payload_str))
            
        except Exception as e:
            logger.error(f"Error in MQTT message callback: {str(e)}", exc_info=True)
    
    async def on_message(self, topic: str, payload: str):
        """
        Process a metric message and persist it to the database.
        
        Args:
            topic: MQTT topic
            payload: JSON payload as string
        """
        try:
            # Parse JSON payload
            data = json.loads(payload)
            
            # Get session ID from cache
            session_id = session_cache.get_session_id(data)
            
            # Skip if no session ID
            if session_id is None:
                logger.warning(f"Skipping metric with no session ID: {data}")
                return
            
            # Prepare metric data
            metric_data = data.copy()
            
            # Make sure we have a timestamp
            if 'ts' not in metric_data:
                if 'timestamp' in metric_data:
                    # Rename timestamp to ts
                    metric_data['ts'] = metric_data.pop('timestamp')
                else:
                    # Use current time
                    metric_data['ts'] = datetime.utcnow()
            
            # Add session ID if not present
            metric_data['session_id'] = session_id
            
            # Create metric sample
            metric_sample = PTMetricSample(**metric_data)
            
            # Persist to database
            self.db.add(metric_sample)
            await self.db.commit()
            
            logger.debug(f"Persisted metric for session {session_id}")
            
        except Exception as e:
            logger.error(f"Error processing metric message: {str(e)}", exc_info=True)
    
    async def start(self, broker_host: str, broker_port: int = 1883):
        """
        Start the metric persister.
        
        Args:
            broker_host: MQTT broker hostname or IP address
            broker_port: MQTT broker port
        """
        if self.running:
            logger.warning("Metric persister already running")
            return
        
        # Connect to MQTT broker
        logger.info(f"Connecting to MQTT broker at {broker_host}:{broker_port}")
        if not connect_mqtt_client(self.client, broker_host, broker_port):
            logger.error("Failed to connect to MQTT broker")
            return
        
        # Start MQTT loop
        self.client.loop_start()
        self.running = True
        
        logger.info("Metric persister started")
    
    async def stop(self):
        """Stop the metric persister."""
        if not self.running:
            logger.warning("Metric persister not running")
            return
        
        # Stop MQTT loop
        self.client.loop_stop()
        self.client.disconnect()
        self.running = False
        
        logger.info("Metric persister stopped")


async def run_metric_persister(db: AsyncSession, broker_host: str, broker_port: int = 1883):
    """
    Run the metric persister as a background task.
    
    Args:
        db: SQLAlchemy async session
        broker_host: MQTT broker hostname or IP address
        broker_port: MQTT broker port
        
    Returns:
        Metric persister instance
    """
    # Create metric persister
    persister = DBMetricPersister(db)
    
    # Start persister
    await persister.start(broker_host, broker_port)
    
    return persister 