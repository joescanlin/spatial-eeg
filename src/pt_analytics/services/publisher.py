import time
import logging
from datetime import datetime
import paho.mqtt.client as mqtt

from src.utils.config import config
from src.utils.mqtt_client import publish_pt_metrics
from src.pt_analytics.features.gait import GaitDetector
from src.pt_analytics.features.balance import BalanceTracker 
from src.pt_analytics.features.sts import STSDetector
from src.pt_analytics.features.load import calc_cop, split_load, active_area_ratio

# Configure logging
logger = logging.getLogger(__name__)

class PTMetricPublisher:
    """
    Integrates data from multiple analyzers and publishes metrics via MQTT.
    
    This class serves as the main orchestrator for processing sensor data,
    calculating relevant metrics, and publishing them to the PT metrics topic.
    """
    
    def __init__(self, mqtt_client=None, publish_hz=None):
        """
        Initialize the PT metric publisher.
        
        Args:
            mqtt_client (mqtt.Client, optional): MQTT client to use for publishing
            publish_hz (int, optional): Publishing frequency (overrides config value)
        """
        # Initialize analyzers
        self.gait = GaitDetector()
        self.balance = BalanceTracker()
        self.sts = STSDetector()
        
        # Store MQTT client
        self.mqtt_client = mqtt_client
        
        # Set publishing frequency
        self.publish_hz = publish_hz or config.get("PUBLISH_HZ", 5)
        self.last_publish_time = 0
        self.publish_interval = 1.0 / self.publish_hz
        
        logger.info(f"PTMetricPublisher initialized with publish rate of {self.publish_hz} Hz")
    
    def set_mqtt_client(self, client):
        """Set the MQTT client to use for publishing."""
        self.mqtt_client = client
    
    def process(self, frame_bool, ts=None):
        """
        Process a frame and publish metrics if it's time to publish.
        
        Args:
            frame_bool (np.ndarray): Binary array where True indicates active sensors
            ts (float, optional): Timestamp in seconds. If None, current time is used.
            
        Returns:
            dict: The metrics payload (only if published, otherwise None)
        """
        # Use current time if timestamp not provided
        if ts is None:
            ts = time.time()
            
        # Get gait metrics
        gait_metrics = self.gait.update(frame_bool, ts)
        
        # Calculate center of pressure and update balance tracker
        cop_x, cop_y = calc_cop(frame_bool)
        self.balance.update(cop_x, cop_y, ts)
        balance_metrics = self.balance.compute()
        
        # Update sit-to-stand detector
        sts_event = self.sts.update(frame_bool, ts)
        sts_metrics = self.sts.get_metrics()
        
        # Calculate load distribution
        load_metrics = split_load(frame_bool)
        
        # Calculate active area ratio
        active = active_area_ratio(frame_bool)
        
        # Combine all metrics into a payload
        payload = {
            "ts": datetime.fromtimestamp(ts).isoformat(),
            **gait_metrics,
            **balance_metrics,
            **load_metrics,
            "active_area_pct": active,
            **sts_metrics
        }
        
        # Check if it's time to publish
        current_time = time.time()
        should_publish = (current_time - self.last_publish_time) >= self.publish_interval
        
        # Publish if it's time or if a significant event occurred (like STS event)
        if should_publish or sts_event is not None:
            if self.mqtt_client:
                publish_pt_metrics(self.mqtt_client, payload)
                self.last_publish_time = current_time
                logger.debug(f"Published metrics: {payload}")
                return payload
            else:
                logger.warning("No MQTT client provided, metrics not published")
        
        return None
    
    def stop(self):
        """Clean up resources."""
        # Nothing to clean up yet, but this provides a hook for future needs
        pass


# Singleton instance for easy access
_instance = None

def get_publisher(mqtt_client=None):
    """Get the singleton instance of the PTMetricPublisher."""
    global _instance
    if _instance is None:
        _instance = PTMetricPublisher(mqtt_client=mqtt_client)
    elif mqtt_client is not None:
        _instance.set_mqtt_client(mqtt_client)
    return _instance 