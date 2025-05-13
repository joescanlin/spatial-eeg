import json
import paho.mqtt.client as mqtt
from .config import config
import logging

logger = logging.getLogger(__name__)

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
    topic = config["RAW_TOPIC"]
    logger.info(f"Subscribing to PT raw data topic: {topic}")
    client.subscribe(topic, qos=1)

def publish_pt_metrics(client, payload: dict):
    """
    Publish PT metrics data to the derived topic.
    
    Args:
        client (mqtt.Client): The MQTT client instance.
        payload (dict): The payload to publish.
    """
    topic = config["DERIVED_TOPIC"]
    client.publish(topic, json.dumps(payload), qos=1, retain=False)
    logger.debug(f"Published to {topic}: {payload}") 