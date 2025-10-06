import json
import paho.mqtt.client as mqtt
import yaml
import os
import logging
import asyncio
from typing import Optional, Callable, Dict, Any, Coroutine

logger = logging.getLogger(__name__)

# Load config from yaml file
config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
                          "web_working", "config.yaml")

try:
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
except Exception as e:
    logger.error(f"Error loading config from {config_path}: {e}")
    config = {
        "mqtt": {
            "raw_data_topic": "sensors/floor/raw",
            "frame_data_topic": "controller/networkx/frame/rft",
            "metrics_topic": "pt/metrics"
        }
    }

class MQTTClient:
    """Wrapper class for MQTT client functionality."""
    
    def __init__(self, client_id: Optional[str] = None, clean_session: bool = True):
        """Initialize the MQTT client.
        
        Args:
            client_id: Optional client ID. If None, a random ID will be generated.
            clean_session: Whether to start with a clean session.
        """
        self.client = mqtt.Client(client_id=client_id, clean_session=clean_session)
        self.connected = False
        self.message_callback = None
        
        # Set up the callback for message receipt
        self.client.on_message = self._on_message
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
    
    def _on_connect(self, client, userdata, flags, rc):
        """Callback for when the client connects to the broker."""
        if rc == 0:
            self.connected = True
            logger.info("Connected to MQTT broker")
        else:
            logger.error(f"Failed to connect to MQTT broker with code {rc}")
    
    def _on_disconnect(self, client, userdata, rc):
        """Callback for when the client disconnects from the broker."""
        self.connected = False
        if rc != 0:
            logger.warning(f"Unexpected disconnection from MQTT broker with code {rc}")
        else:
            logger.info("Disconnected from MQTT broker")
    
    def _on_message(self, client, userdata, message):
        """Callback for when a message is received."""
        if self.message_callback:
            try:
                topic = message.topic
                payload = message.payload.decode('utf-8')
                asyncio.create_task(self.message_callback(topic, payload))
            except Exception as e:
                logger.error(f"Error processing message: {str(e)}", exc_info=True)
    
    async def connect(self, broker_host: str, broker_port: int = 1883, keepalive: int = 60) -> bool:
        """Connect to MQTT broker.
        
        Args:
            broker_host: The broker hostname or IP address.
            broker_port: The broker port.
            keepalive: The keepalive interval in seconds.
            
        Returns:
            True if successfully connected, False otherwise.
        """
        try:
            self.client.connect(broker_host, port=broker_port, keepalive=keepalive)
            self.client.loop_start()  # Start the background thread
            
            # Wait for connection to establish
            for _ in range(10):  # Try for up to 10 seconds
                if self.connected:
                    logger.info(f"Connected to MQTT broker at {broker_host}:{broker_port}")
                    return True
                await asyncio.sleep(1)
            
            # If we get here, we timed out waiting for connection
            logger.error(f"Timed out connecting to MQTT broker at {broker_host}:{broker_port}")
            self.client.loop_stop()
            return False
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker {broker_host}:{broker_port}: {e}")
            return False
    
    async def disconnect(self) -> bool:
        """Disconnect from MQTT broker.
        
        Returns:
            True if successfully disconnected, False otherwise.
        """
        try:
            self.client.disconnect()
            self.client.loop_stop()
            return True
        except Exception as e:
            logger.error(f"Error disconnecting from MQTT broker: {e}")
            return False
    
    async def publish(self, topic: str, payload: Any, qos: int = 1, retain: bool = False) -> bool:
        """Publish a message to a topic.
        
        Args:
            topic: The topic to publish to.
            payload: The payload to publish (will be converted to JSON if it's a dict).
            qos: The QoS level to use.
            retain: Whether to retain the message.
            
        Returns:
            True if successfully published, False otherwise.
        """
        try:
            if isinstance(payload, dict):
                payload = json.dumps(payload)
            
            result = self.client.publish(topic, payload, qos=qos, retain=retain)
            return result.rc == 0
        except Exception as e:
            logger.error(f"Error publishing to topic {topic}: {e}")
            return False
    
    async def subscribe(self, topic: str, qos: int = 1) -> bool:
        """Subscribe to a topic.
        
        Args:
            topic: The topic to subscribe to.
            qos: The QoS level to use.
            
        Returns:
            True if successfully subscribed, False otherwise.
        """
        try:
            result = self.client.subscribe(topic, qos=qos)
            success = result[0] == 0
            if success:
                logger.info(f"Subscribed to topic: {topic}")
            else:
                logger.error(f"Failed to subscribe to topic {topic}: {result}")
            return success
        except Exception as e:
            logger.error(f"Error subscribing to topic {topic}: {e}")
            return False
    
    def set_message_callback(self, callback: Callable[[str, str], Coroutine[Any, Any, None]]) -> None:
        """Set the callback function for when a message is received.
        
        Args:
            callback: The callback function, which should be a coroutine function
                     that takes two parameters: topic and payload.
        """
        self.message_callback = callback

# Maintain the original functions for backward compatibility

def create_mqtt_client(client_id=None, clean_session=True):
    """
    Create an MQTT client instance.
    
    Args:
        client_id (str, optional): The client ID to use. If None, a random ID will be generated.
        clean_session (bool): Whether to start with a clean session.
        
    Returns:
        mqtt.Client: A configured MQTT client instance.
    """
    client = mqtt.Client(client_id=client_id, clean_session=clean_session)
    return client

def connect_mqtt_client(client, broker_host, broker_port=1883, keepalive=60):
    """
    Connect an MQTT client to a broker.
    
    Args:
        client (mqtt.Client): The MQTT client instance.
        broker_host (str): The broker hostname or IP address.
        broker_port (int): The broker port.
        keepalive (int): The keepalive interval in seconds.
        
    Returns:
        bool: True if connection was successful, False otherwise.
    """
    try:
        client.connect(broker_host, port=broker_port, keepalive=keepalive)
        return True
    except Exception as e:
        logger.error(f"Failed to connect to MQTT broker {broker_host}:{broker_port}: {e}")
        return False

def subscribe_pt_raw(client):
    """
    Subscribe to the PT raw data topic.
    
    Args:
        client (mqtt.Client): The MQTT client instance.
    """
    topic = config["mqtt"]["raw_data_topic"]
    logger.info(f"Subscribing to PT raw data topic: {topic}")
    client.subscribe(topic, qos=1)

def publish_pt_metrics(client, payload: dict):
    """
    Publish PT metrics data to the PT metrics topic.
    
    Args:
        client (mqtt.Client): The MQTT client instance.
        payload (dict): The payload to publish.
    """
    # Use the correct PT metrics topic
    topic = config["mqtt"].get("metrics_topic", "pt/metrics")
    client.publish(topic, json.dumps(payload), qos=1, retain=False)
    logger.debug(f"Published PT metrics to {topic}: {payload}")

def subscribe_pt_metrics(client):
    """
    Subscribe to the PT metrics topic.
    
    Args:
        client (mqtt.Client): The MQTT client instance.
    """
    # Use metrics_topic if available, or fall back to a default
    topic = config["mqtt"].get("metrics_topic", "pt/metrics")
    logger.info(f"Subscribing to PT metrics topic: {topic}")
    client.subscribe(topic, qos=1) 