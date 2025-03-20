import numpy as np
from datetime import datetime
import json
import paho.mqtt.client as mqtt
from collections import deque
from dataclasses import dataclass
from typing import List, Tuple, Optional
import logging
import yaml
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class FallEvent:
    timestamp: float
    confidence: float
    location: Tuple[int, int]
    impact_area: float
    pre_fall_velocity: float

class FallDetector:
    def __init__(self, config: dict):
        """Initialize FallDetector with configuration parameters."""
        self.frame_history = deque(maxlen=config['frame_history_size'])
        self.min_impact_area = config['min_impact_area']
        self.max_impact_area = config['max_impact_area']
        self.velocity_threshold = config['velocity_threshold']
        self.stability_frames = config['stability_frames']
        self.confidence_threshold = config['confidence_threshold']
        
        self.potential_fall_frames = 0
        self.last_centroid = None
        self.fall_in_progress = False
        
        # Constants calibrated for 4" sensor grid
        self.INCHES_PER_SENSOR = 4
        self.SAMPLING_RATE = 10  # Hz
        
    def process_frame(self, raw_data: str) -> Optional[FallEvent]:
        """Process a single frame of raw sensor data."""
        try:
            data = json.loads(raw_data)
            timestamp = data.get('timestamp')
            frame = np.array(data.get('frame'))
            
            if timestamp is None or frame is None:
                logger.warning("Invalid message format")
                return None
                
            self.frame_history.append((timestamp, frame))
            
            if len(self.frame_history) < 3:
                return None
                
            return self._analyze_current_frame(timestamp, frame)
            
        except json.JSONDecodeError:
            logger.error("Failed to decode JSON message")
            return None
        except Exception as e:
            logger.error(f"Error processing frame: {e}")
            return None
    
    def _analyze_current_frame(self, timestamp: float, current_frame: np.ndarray) -> Optional[FallEvent]:
        """Analyze the current frame for fall detection."""
        # Get active sensors and their count
        active_sensors = np.where(current_frame == 1)
        active_count = len(active_sensors[0])
        
        if active_count == 0:
            self.fall_in_progress = False
            self.potential_fall_frames = 0
            return None
        
        # Calculate current centroid in inches
        current_centroid = np.array([
            np.mean(active_sensors[0]) * self.INCHES_PER_SENSOR,
            np.mean(active_sensors[1]) * self.INCHES_PER_SENSOR
        ])
        
        # Calculate velocity in inches per second
        velocity = 0
        if self.last_centroid is not None:
            displacement = np.linalg.norm(current_centroid - self.last_centroid)
            time_diff = (timestamp - self.frame_history[-2][0]) / 1000.0  # ms to seconds
            velocity = displacement / time_diff if time_diff > 0 else 0
        
        self.last_centroid = current_centroid
        
        # Check fall conditions
        fall_conditions_met = (
            self.min_impact_area <= active_count <= self.max_impact_area and
            velocity >= self.velocity_threshold * self.INCHES_PER_SENSOR
        )
        
        if fall_conditions_met:
            self.fall_in_progress = True
            self.potential_fall_frames += 1
            
            if self.potential_fall_frames >= self.stability_frames:
                confidence = self._calculate_fall_confidence(
                    active_count, velocity, current_frame
                )
                
                if confidence > self.confidence_threshold:
                    return FallEvent(
                        timestamp=timestamp,
                        confidence=confidence,
                        location=(
                            int(current_centroid[0] / self.INCHES_PER_SENSOR),
                            int(current_centroid[1] / self.INCHES_PER_SENSOR)
                        ),
                        impact_area=active_count * (self.INCHES_PER_SENSOR ** 2),
                        pre_fall_velocity=velocity
                    )
        else:
            self.fall_in_progress = False
            self.potential_fall_frames = 0
            
        return None
    
    def _calculate_fall_confidence(self, 
                                 active_count: int, 
                                 velocity: float, 
                                 current_frame: np.ndarray) -> float:
        """Calculate confidence score for fall detection."""
        area_score = self._normalize_value(
            active_count * (self.INCHES_PER_SENSOR ** 2),
            self.min_impact_area * (self.INCHES_PER_SENSOR ** 2),
            self.max_impact_area * (self.INCHES_PER_SENSOR ** 2)
        )
        
        velocity_score = self._normalize_value(
            velocity,
            self.velocity_threshold * self.INCHES_PER_SENSOR,
            self.velocity_threshold * self.INCHES_PER_SENSOR * 2
        )
        
        pattern_score = self._analyze_impact_pattern(current_frame)
        
        return min(1.0, max(0.0,
            0.4 * area_score +
            0.4 * velocity_score +
            0.2 * pattern_score
        ))
    
    def _normalize_value(self, value: float, min_val: float, max_val: float) -> float:
        """Normalize a value between 0 and 1."""
        if max_val == min_val:
            return 0.0
        return min(1.0, max(0.0, (value - min_val) / (max_val - min_val)))
    
    def _analyze_impact_pattern(self, frame: np.ndarray) -> float:
        """Analyze the pattern of activated sensors for fall-like characteristics."""
        active_sensors = np.where(frame == 1)
        if len(active_sensors[0]) == 0:
            return 0.0
            
        min_row, max_row = np.min(active_sensors[0]), np.max(active_sensors[0])
        min_col, max_col = np.min(active_sensors[1]), np.max(active_sensors[1])
        
        width_inches = (max_col - min_col + 1) * self.INCHES_PER_SENSOR
        height_inches = (max_row - min_row + 1) * self.INCHES_PER_SENSOR
        
        aspect_ratio = height_inches / width_inches if width_inches > 0 else 0
        aspect_score = 1.0 - min(abs(aspect_ratio - 2.5) / 2.5, 1.0)
        
        box_area = (max_row - min_row + 1) * (max_col - min_col + 1)
        density = len(active_sensors[0]) / box_area if box_area > 0 else 0
        
        return (aspect_score + density) / 2

class FallDetectionSystem:
    def __init__(self, mqtt_broker: str, mqtt_port: int, topic: str):
        # Load configuration
        config_path = Path(__file__).parent.parent.parent / 'config' / 'config.yaml'
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
            
        self.detector = FallDetector(config['detector'])
        self.mqtt_config = config['mqtt']
        
        self.client = mqtt.Client()
        self.client.on_message = self._on_message
        self.client.on_connect = self._on_connect
        self.broker = mqtt_broker
        self.port = mqtt_port
        self.topic = topic
        
    def start(self):
        """Start the fall detection system."""
        try:
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start()
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            raise
            
    def stop(self):
        """Stop the fall detection system."""
        self.client.loop_stop()
        self.client.disconnect()
        
    def _on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker."""
        logger.info("Connected to MQTT broker")
        self.client.subscribe(self.topic)
        
    def _on_message(self, client, userdata, msg):
        """Process incoming MQTT messages."""
        try:
            fall_event = self.detector.process_frame(msg.payload.decode())
            
            if fall_event:
                self._handle_fall_detection(fall_event)
                
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            
    def _handle_fall_detection(self, fall_event: FallEvent):
        """Handle detected fall events."""
        alert_msg = {
            "event_type": "fall_detected",
            "timestamp": fall_event.timestamp,
            "confidence": fall_event.confidence,
            "location": fall_event.location,
            "impact_area": fall_event.impact_area,
            "velocity": fall_event.pre_fall_velocity
        }
        
        self.client.publish(self.mqtt_config['alerts_topic'], 
                          json.dumps(alert_msg))
        logger.info(f"Fall detected: {alert_msg}")
