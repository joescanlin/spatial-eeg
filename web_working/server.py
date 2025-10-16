from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import json
import paho.mqtt.client as mqtt
from datetime import datetime
import queue
import threading
import logging
import os
from dotenv import load_dotenv
import time
from collections import deque
import yaml
import requests  # Add requests for Mobile Text Alerts API
import traceback
import random
import logging.handlers
import uuid
from threading import Lock
import sys

# Optional ML dependencies - only needed for fall detection
try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    print("numpy not installed. Fall detection and soft biometrics not available.")
    NUMPY_AVAILABLE = False
    np = None

try:
    from fall_detection.fall_detector import FallDetector
    FALL_DETECTOR_AVAILABLE = True
except ImportError:
    print("Fall detection module not available (missing dependencies).")
    FALL_DETECTOR_AVAILABLE = False
    FallDetector = None

try:
    from softbio.feature_extractor import GaitFeatureExtractor
    from softbio.baseline_model import SoftBioBaseline
    SOFTBIO_AVAILABLE = True
except ImportError:
    print("Soft biometrics not available (missing dependencies).")
    SOFTBIO_AVAILABLE = False
    GaitFeatureExtractor = None
    SoftBioBaseline = None

# EEG/LSL dependencies (required for this application)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from src.utils.lsl_client import LSLReader
    from src.utils.session_writer import SessionWriter
except ImportError as e:
    print(f"pylsl not installed. LSL streaming not available.")
    LSLReader = None
    SessionWriter = None

from eeg_flask_routes import init_eeg_routes, start_cortex_in_thread

# Create logs directory if it doesn't exist
os.makedirs('logs', exist_ok=True)

# Configure logging with rotation
formatter = logging.Formatter(
    '[%(asctime)s] %(levelname)s [%(name)s.%(funcName)s:%(lineno)d] %(message)s',
    '%Y-%m-%d %H:%M:%S'
)

# Setup file handler with rotation
file_handler = logging.handlers.RotatingFileHandler(
    'logs/server.log',
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5
)
file_handler.setFormatter(formatter)
file_handler.setLevel(logging.DEBUG)

# Setup console handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
console_handler.setLevel(logging.INFO)

# Setup root logger
root_logger = logging.getLogger()
root_logger.setLevel(logging.DEBUG)
root_logger.addHandler(file_handler)
root_logger.addHandler(console_handler)

# Get logger for this module
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Load environment variables
load_dotenv()

# Load configuration (use path relative to this file)
CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.yaml')
with open(CONFIG_PATH, 'r') as file:
    config = yaml.safe_load(file)

app = Flask(__name__)

# Configure CORS properly
CORS(app, 
     resources={
         r"/*": {  # Apply to all routes
             "origins": ["http://localhost:5173", "http://localhost:3000"],
             "allow_headers": ["Content-Type", "Authorization", "Accept"],
             "expose_headers": ["Content-Type", "Authorization"],
             "methods": ["GET", "POST", "OPTIONS"],
             "supports_credentials": True,
             "max_age": 3600,
             "send_wildcard": False,
             "vary_header": True
         }
     },
     supports_credentials=True
)

# Global variables
grid_updates = queue.Queue()
mqtt_client = None  # Legacy single broker client
mqtt_clients = {}  # Dict of basestation MQTT clients: {bs_id: client}
mqtt_connected = False

# Store alerts in memory
alert_history = []

# Multi-basestation configuration (loaded from config.yaml)
BASESTATION_CONFIG = config.get('basestations', {})
UNIFIED_GRID_WIDTH = BASESTATION_CONFIG.get('unified_grid', {}).get('width', 80)
UNIFIED_GRID_HEIGHT = BASESTATION_CONFIG.get('unified_grid', {}).get('height', 54)
BASESTATION_DEVICES = BASESTATION_CONFIG.get('devices', {})

# Multi-basestation frame buffer - initialized from config
basestation_frames = {}
for bs_id, bs_config in BASESTATION_DEVICES.items():
    basestation_frames[bs_id] = {
        'data': None,
        'timestamp': 0,
        'connected': False,
        'width': bs_config.get('width'),
        'height': bs_config.get('height'),
        'offsetX': bs_config.get('offsetX'),
        'offsetY': bs_config.get('offsetY')
    }

# --- Soft-bio SSE/MQTT globals ---
SOFTBIO_TOPIC = "softbio/prediction"
_softbio_q = queue.Queue(maxsize=1000)

# Initialize soft biometrics components
softbio_extractor = None
softbio_model = None
softbio_last_pub = {}  # Track last publish time per track_id
SOFTBIO_PUBLISH_INTERVAL = 0.5  # 500ms between predictions per track

# Load EEG and session export config
EEG_CFG = config.get("eeg", {"enabled": False})
EXP_CFG = config.get("session_export", {"enabled": False, "dir": "./session_exports", "format":"parquet"})

# EEG initialization
eeg_reader = None
eeg_lock = Lock()
if EEG_CFG.get("enabled"):
    try:
        eeg_reader = LSLReader(stream_name=EEG_CFG.get("stream_name","EEG"))
        eeg_reader.start()
        logger.info("[EEG] LSL inlet started")
    except Exception as e:
        logger.warning(f"[EEG] LSL not available: {e}")
        eeg_reader = None

# Session writer (created per active session)
session_writer = None
active_session_id = None

# Fall detection settings - use env vars if available, otherwise use config
SEQUENCE_LENGTH = int(os.getenv('SEQUENCE_LENGTH', config['detector']['sequence_length']))
FALL_THRESHOLD = float(os.getenv('FALL_THRESHOLD', config['detector']['fall_threshold']))
CONSECUTIVE_FRAMES = int(os.getenv('CONSECUTIVE_FRAMES', config['detector']['consecutive_frames']))
COOLDOWN_PERIOD = int(os.getenv('COOLDOWN_PERIOD', config['detector']['cooldown_period']))

# Frame dimensions (15x12 sensor grid)
GRID_HEIGHT = 15  # Updated to match actual sensor grid
GRID_WIDTH = 12

# Initialize fall detector
detector = None
frame_buffer = deque(maxlen=SEQUENCE_LENGTH)
high_prob_frames = deque(maxlen=CONSECUTIVE_FRAMES)
last_fall_time = 0
fall_probability = 0.0
fall_in_progress = False
prev_frame = None

# MQTT Configuration
MQTT_BROKER = os.getenv('MQTT_BROKER', config['mqtt']['broker'])
MQTT_PORT = int(os.getenv('MQTT_PORT', config['mqtt']['port']))
RAW_DATA_TOPIC = config['mqtt']['raw_data_topic']
ALERTS_TOPIC = config['mqtt']['alerts_topic']

logger.info(f"Loaded MQTT Configuration:")
logger.info(f"Broker: {MQTT_BROKER}")
logger.info(f"Port: {MQTT_PORT}")
logger.info(f"Raw Data Topic: {RAW_DATA_TOPIC}")
logger.info(f"Alerts Topic: {ALERTS_TOPIC}")

# Mobile Text Alerts Configuration (optional)
MOBILE_TEXT_ALERTS_KEY = os.getenv('MOBILE_TEXT_ALERTS_KEY')
MOBILE_TEXT_ALERTS_V3_URL = os.getenv('MOBILE_TEXT_ALERTS_V3_URL')
MOBILE_TEXT_ALERTS_FROM = os.getenv('MOBILE_TEXT_ALERTS_FROM')
MOBILE_TEXT_ALERTS_GROUP = os.getenv('MOBILE_TEXT_ALERTS_GROUP')

if MOBILE_TEXT_ALERTS_KEY and MOBILE_TEXT_ALERTS_GROUP:
    MOBILE_TEXT_ALERTS_GROUP = int(MOBILE_TEXT_ALERTS_GROUP)
    logger.info("Mobile Text Alerts Configuration:")
    logger.info(f"API Key: {MOBILE_TEXT_ALERTS_KEY[:8]}...")
    logger.info(f"From Number: {MOBILE_TEXT_ALERTS_FROM}")
    logger.info(f"Alert Group: {MOBILE_TEXT_ALERTS_GROUP}")
else:
    logger.info("Mobile Text Alerts not configured (optional feature disabled)")

# Rate limit tracking
last_sms_time = 0
sms_requests_in_window = 0
SMS_RATE_LIMIT = 30  # requests per minute
SMS_RATE_WINDOW = 60  # seconds

# Function to log model weights
def log_model_weights(model):
    try:
        logger.info("Logging model weights for verification:")
        for i, layer in enumerate(model.layers):
            weights = layer.get_weights()
            if weights:  # Check if layer has weights
                logger.info(f"Layer {i} - {layer.name}:")
                for j, weight in enumerate(weights):
                    weight_stats = {
                        'shape': weight.shape,
                        'mean': np.mean(weight),
                        'std': np.std(weight),
                        'min': np.min(weight),
                        'max': np.max(weight)
                    }
                    logger.info(f"  Weight {j}: {weight_stats}")
            else:
                logger.info(f"Layer {i} - {layer.name} has no weights.")
    except Exception as e:
        logger.error(f"Error while logging model weights: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")

def init_detector_and_buffers():
    """Initialize detector and all related buffers."""
    global detector, frame_buffer, high_prob_frames, last_fall_time, fall_probability, fall_in_progress
    global softbio_extractor, softbio_model

    try:
        logger.info("Bypassing fall detector initialization for PT testing...")

        # Initialize buffers
        frame_buffer.clear()
        high_prob_frames.clear()
        last_fall_time = 0
        fall_probability = 0.0
        fall_in_progress = False

        # Initialize soft biometrics components (optional)
        if SOFTBIO_AVAILABLE:
            logger.info("Initializing soft biometrics components...")
            try:
                # Load softbio configuration
                with open('softbio/config/softbio.yaml', 'r') as f:
                    softbio_cfg = yaml.safe_load(f)['softbio']

                # Initialize feature extractor and model
                grid_cfg = softbio_cfg['grid']
                softbio_extractor = GaitFeatureExtractor(
                    grid_w=int(grid_cfg['width']),
                    grid_h=int(grid_cfg['height']),
                    cell_m=float(grid_cfg['cell_meters']),
                    cfg=softbio_cfg
                )
                softbio_model = SoftBioBaseline(cfg=softbio_cfg)
                logger.info("Soft biometrics components initialized successfully")
            except Exception as e:
                logger.warning(f"Could not initialize soft biometrics: {str(e)}")
                # Don't fail - allow server to run without softbio
        else:
            logger.info("Soft biometrics not available (missing numpy/sklearn dependencies)")

        logger.info("All buffers initialized - Fall detector bypassed")
        logger.info("This server is configured for PT metrics testing only")

        return True
        
    except Exception as e:
        logger.error(f"Error initializing buffer: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

def get_dedicated_number_id():
    """Get the dedicated number ID from Mobile Text Alerts API."""
    try:
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {MOBILE_TEXT_ALERTS_KEY}'
        }
        
        logger.info("Getting dedicated numbers from Mobile Text Alerts API...")
        logger.info(f"Looking for number: {MOBILE_TEXT_ALERTS_FROM}")
        
        # Call the dedicated numbers endpoint
        response = requests.get(
            'https://api.mobile-text-alerts.com/v3/dedicated-numbers',
            headers=headers
        )
        
        response.raise_for_status()
        numbers = response.json()
        
        logger.info(f"API Response: {json.dumps(numbers, indent=2)}")
        
        # Find our toll-free number in the list
        for number in numbers.get('data', []):
            logger.info(f"Checking number: {number.get('number')} (ID: {number.get('id')})")
            if number.get('number') == MOBILE_TEXT_ALERTS_FROM:
                logger.info(f"Found matching number! ID: {number.get('id')}")
                return number.get('id')
                
        logger.error(f"Could not find dedicated number {MOBILE_TEXT_ALERTS_FROM} in the response")
        return None
        
    except Exception as e:
        logger.error(f"Error getting dedicated number: {str(e)}")
        if hasattr(e, 'response'):
            logger.error(f"Response status: {e.response.status_code}")
            logger.error(f"Response body: {e.response.text}")
        return None

def send_mobile_text_alert(message, confidence=None):
    """Send an SMS alert using Mobile Text Alerts API v3."""
    # Check if Mobile Text Alerts is configured
    if not (MOBILE_TEXT_ALERTS_KEY and MOBILE_TEXT_ALERTS_GROUP):
        logger.debug("Mobile Text Alerts not configured, skipping SMS")
        return False

    try:
        # Create a shorter message for alert history
        alert_message = f"Fall detected with {confidence * 100:.0f}% confidence" if confidence else message

        # Use v3 payload structure with group
        payload = {
            'message': message,
            'groups': [int(MOBILE_TEXT_ALERTS_GROUP)],  # Send to configured group
            'dedicatedNumber': MOBILE_TEXT_ALERTS_FROM  # Use the toll-free number directly
        }

        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {MOBILE_TEXT_ALERTS_KEY}'
        }
        
        logger.info("Sending SMS with:")
        logger.info(f"URL: {MOBILE_TEXT_ALERTS_V3_URL}")
        logger.info(f"Headers: {headers}")
        logger.info(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            MOBILE_TEXT_ALERTS_V3_URL,
            json=payload,
            headers=headers,
            timeout=10
        )
        
        # Log the complete response
        logger.info(f"Response Status: {response.status_code}")
        logger.info(f"Response Headers: {dict(response.headers)}")
        logger.info(f"Response Body: {response.text}")
        
        response.raise_for_status()  # Raise exception for non-200 status codes
        
        # Parse the response
        response_data = response.json()
        logger.info(f"Parsed Response: {json.dumps(response_data, indent=2)}")
        
        # Store successful alert in history
        alert = {
            'id': str(int(time.time() * 1000)),  # Timestamp as ID
            'timestamp': datetime.now().isoformat(),
            'confidence': confidence * 100 if confidence else None,
            'status': 'delivered',
            'message': alert_message
        }
        alert_history.append(alert)
        
        return True
            
    except requests.exceptions.RequestException as e:
        error_msg = str(e)
        if hasattr(e, 'response') and hasattr(e.response, 'json'):
            try:
                error_data = e.response.json()
                error_msg = error_data.get('message', str(e))
                logger.error(f"API Error Response: {json.dumps(error_data, indent=2)}")
            except:
                pass
        
        logger.error("SMS Alert Failed")
        logger.error(f"Error Details: {error_msg}")
        logger.error(f"Full Exception: {traceback.format_exc()}")
        
        # Store failed alert in history
        alert = {
            'id': str(int(time.time() * 1000)),  # Timestamp as ID
            'timestamp': datetime.now().isoformat(),
            'confidence': confidence * 100 if confidence else None,
            'status': 'failed',
            'message': alert_message,
            'error': error_msg
        }
        alert_history.append(alert)
        
        return False

def simulate_decibel_level(frame_array):
    """Simulate decibel level based on sensor activity."""
    # Count active sensors
    active_sensors = np.sum(frame_array > 0)
    
    if active_sensors == 0:
        # Ambient room noise (30-35 dB)
        return random.uniform(30, 35)
    else:
        # Base level for footsteps (35-45 dB)
        # More active sensors = slightly higher volume
        base_level = random.uniform(35, 40)
        # Add up to 5dB based on number of active sensors
        activity_boost = min(5, active_sensors * 0.5)
        return base_level + activity_boost

def calculate_balance_metrics(frame_array):
    """Calculate balance metrics from the current frame."""
    try:
        # Calculate center of pressure
        total_pressure = np.sum(frame_array)
        if total_pressure == 0:
            return {
                'stabilityScore': 1.0,
                'swayArea': 0.0,
                'weightDistribution': 50.0,
                'copMovement': 0.0
            }

        weighted_x = np.sum(np.multiply(frame_array, np.arange(frame_array.shape[1]).reshape(1, -1))) / total_pressure
        weighted_y = np.sum(np.multiply(frame_array, np.arange(frame_array.shape[0]).reshape(-1, 1))) / total_pressure

        # Calculate stability score (inverse of pressure variance)
        pressure_std = np.std(frame_array[frame_array > 0]) if np.any(frame_array > 0) else 0
        stability_score = 1.0 - min(pressure_std / 2.0, 1.0)  # Normalize to 0-1

        # Calculate sway area (area of non-zero pressure points)
        sway_area = np.sum(frame_array > 0) * 4  # Assuming each sensor is 2x2 inches

        # Calculate weight distribution (left-right balance)
        left_pressure = np.sum(frame_array[:, :frame_array.shape[1]//2])
        right_pressure = np.sum(frame_array[:, frame_array.shape[1]//2:])
        weight_distribution = (left_pressure / (left_pressure + right_pressure) * 100) if (left_pressure + right_pressure) > 0 else 50

        # Calculate CoP movement (using global state)
        global last_cop_x, last_cop_y, last_cop_time
        current_time = time.time()
        
        if 'last_cop_x' not in globals():
            last_cop_x = weighted_x
            last_cop_y = weighted_y
            last_cop_time = current_time
            cop_movement = 0.0
        else:
            dx = weighted_x - last_cop_x
            dy = weighted_y - last_cop_y
            dt = current_time - last_cop_time
            if dt > 0:
                cop_movement = np.sqrt(dx*dx + dy*dy) * 2.0 / dt  # Convert to inches/second (assuming 2 inch sensors)
            else:
                cop_movement = 0.0
            
            last_cop_x = weighted_x
            last_cop_y = weighted_y
            last_cop_time = current_time

        return {
            'stabilityScore': float(stability_score),
            'swayArea': float(sway_area),
            'weightDistribution': float(weight_distribution),
            'copMovement': float(cop_movement)
        }
    except Exception as e:
        logger.error(f"Error calculating balance metrics: {str(e)}")
        return {
            'stabilityScore': 1.0,
            'swayArea': 0.0,
            'weightDistribution': 50.0,
            'copMovement': 0.0
        }

def calculate_wandering_metrics(frame_array):
    """Calculate wandering metrics from the current frame."""
    try:
        # Constants for sensor array dimensions (match configured grid)
        GRID_WIDTH = 12  # sensors
        GRID_HEIGHT = 48  # sensors
        INCHES_PER_SENSOR = 4  # each sensor is 4x4 inches
        FEET_PER_SENSOR = INCHES_PER_SENSOR / 12  # convert to feet
        MIN_MOVEMENT_THRESHOLD = FEET_PER_SENSOR * 0.5  # Must move at least half a sensor to count

        # Calculate center of pressure for current frame
        total_pressure = np.sum(frame_array)
        if total_pressure == 0:
            return {
                'pathLength': 0.0,
                'areaCovered': 0.0,
                'directionChanges': 0,
                'repetitiveScore': 0.0
            }

        # Calculate current CoP in sensor coordinates (0-11, 0-14)
        weighted_x = np.sum(np.multiply(frame_array, np.arange(frame_array.shape[1]).reshape(1, -1))) / total_pressure
        weighted_y = np.sum(np.multiply(frame_array, np.arange(frame_array.shape[0]).reshape(-1, 1))) / total_pressure

        # Update path history (store last 60 positions = 1 minute at 1Hz)
        global path_history, last_direction, last_update_time
        current_time = time.time()
        
        if 'path_history' not in globals():
            path_history = deque(maxlen=60)
            last_direction = None
            last_update_time = current_time
        
        # Only update every 100ms to avoid over-counting small movements
        if current_time - last_update_time < 0.1:
            if len(path_history) > 0:
                return {
                    'pathLength': sum(segment_length for _, _, segment_length in path_history),
                    'areaCovered': np.sum(frame_array > 0) * (FEET_PER_SENSOR * FEET_PER_SENSOR),
                    'directionChanges': sum(1 for _, is_change, _ in path_history if is_change),
                    'repetitiveScore': calculate_repetitive_score(path_history, GRID_WIDTH, GRID_HEIGHT, FEET_PER_SENSOR)
                }
            return {
                'pathLength': 0.0,
                'areaCovered': 0.0,
                'directionChanges': 0,
                'repetitiveScore': 0.0
            }

        # Convert CoP to feet
        current_pos = (weighted_x * FEET_PER_SENSOR, weighted_y * FEET_PER_SENSOR)
        
        # Calculate movement since last position
        if len(path_history) > 0:
            last_pos = path_history[-1][0]
            dx = current_pos[0] - last_pos[0]
            dy = current_pos[1] - last_pos[1]
            movement = np.sqrt(dx*dx + dy*dy)
            
            # Only record movement if it exceeds threshold
            if movement >= MIN_MOVEMENT_THRESHOLD:
                # Detect direction change
                is_direction_change = False
                if len(path_history) > 1:
                    prev_pos = path_history[-2][0]
                    prev_dx = last_pos[0] - prev_pos[0]
                    prev_dy = last_pos[1] - prev_pos[1]
                    if prev_dx != 0 or prev_dy != 0:
                        angle = np.arctan2(dy, dx) - np.arctan2(prev_dy, prev_dx)
                        angle = np.abs(np.degrees(angle))
                        is_direction_change = angle > 45
                
                path_history.append((current_pos, is_direction_change, movement))
                last_update_time = current_time
        else:
            # First position
            path_history.append((current_pos, False, 0.0))
            last_update_time = current_time

        # Calculate total path length and direction changes
        path_length = sum(segment_length for _, _, segment_length in path_history)
        direction_changes = sum(1 for _, is_change, _ in path_history if is_change)

        # Calculate area covered
        area_covered = np.sum(frame_array > 0) * (FEET_PER_SENSOR * FEET_PER_SENSOR)

        # Calculate repetitive score
        repetitive_score = calculate_repetitive_score(path_history, GRID_WIDTH, GRID_HEIGHT, FEET_PER_SENSOR)

        return {
            'pathLength': float(path_length),
            'areaCovered': float(area_covered),
            'directionChanges': int(direction_changes),
            'repetitiveScore': float(repetitive_score)
        }
    except Exception as e:
        logger.error(f"Error calculating wandering metrics: {str(e)}")
        return {
            'pathLength': 0.0,
            'areaCovered': 0.0,
            'directionChanges': 0,
            'repetitiveScore': 0.0
        }

def calculate_repetitive_score(path_history, grid_width, grid_height, feet_per_sensor):
    """Calculate repetitive score based on path overlap."""
    if len(path_history) <= 10:
        return 0.0
        
    grid = np.zeros((grid_height, grid_width))
    for pos, _, _ in path_history:
        x = int(pos[0] / feet_per_sensor)
        y = int(pos[1] / feet_per_sensor)
        if 0 <= x < grid_width and 0 <= y < grid_height:
            grid[y, x] += 1
            
    max_visits = np.max(grid)
    if max_visits > 0:
        return np.sum(grid > 1) / np.sum(grid > 0)
    return 0.0

def calculate_gait_metrics(frame_array):
    """Calculate gait metrics from the current frame."""
    try:
        # Constants for sensor array dimensions
        INCHES_PER_SENSOR = 4  # each sensor is 4x4 inches
        FEET_PER_SENSOR = INCHES_PER_SENSOR / 12  # convert to feet

        # Calculate center of pressure
        total_pressure = np.sum(frame_array)
        if total_pressure == 0:
            return {
                'speed': 0.0,
                'strideLength': 0.0,
                'symmetryScore': 1.0,
                'stepCount': 0
            }

        # Calculate current CoP
        weighted_x = np.sum(np.multiply(frame_array, np.arange(frame_array.shape[1]).reshape(1, -1))) / total_pressure
        weighted_y = np.sum(np.multiply(frame_array, np.arange(frame_array.shape[0]).reshape(-1, 1))) / total_pressure

        # Update gait history
        global last_gait_pos, last_gait_time, step_positions, current_step_start
        current_time = time.time()
        
        if 'last_gait_pos' not in globals():
            last_gait_pos = (weighted_x * FEET_PER_SENSOR, weighted_y * FEET_PER_SENSOR)
            last_gait_time = current_time
            step_positions = deque(maxlen=4)  # Store last 4 step positions
            current_step_start = None
            return {
                'speed': 0.0,
                'strideLength': 0.0,
                'symmetryScore': 1.0,
                'stepCount': 0
            }

        # Convert current position to feet
        current_pos = (weighted_x * FEET_PER_SENSOR, weighted_y * FEET_PER_SENSOR)
        
        # Calculate instantaneous speed
        dx = current_pos[0] - last_gait_pos[0]
        dy = current_pos[1] - last_gait_pos[1]
        distance = np.sqrt(dx*dx + dy*dy)
        dt = current_time - last_gait_time
        speed = distance / dt if dt > 0 else 0

        # Detect steps and calculate stride length
        # A step is detected when we see significant vertical movement followed by a pause
        if current_step_start is None:
            if np.sum(frame_array) > 2:  # At least 3 sensors activated
                current_step_start = current_pos
        else:
            # Check if step is complete (reduced sensor activation and position moved)
            if np.sum(frame_array) < 2:  # Less than 2 sensors activated
                step_distance = np.sqrt(
                    (current_pos[0] - current_step_start[0])**2 +
                    (current_pos[1] - current_step_start[1])**2
                )
                if step_distance > FEET_PER_SENSOR * 0.5:  # Reduced minimum step distance
                    step_positions.append(current_step_start)
                    current_step_start = None

        # Calculate stride length from recent steps
        stride_length = 0.0
        if len(step_positions) >= 2:
            # Calculate average distance between consecutive steps
            stride_distances = []
            for i in range(1, len(step_positions)):
                prev = step_positions[i-1]
                curr = step_positions[i]
                stride_distances.append(
                    np.sqrt((curr[0] - prev[0])**2 + (curr[1] - prev[1])**2)
                )
            stride_length = np.mean(stride_distances)

        # Calculate symmetry score based on left/right pressure distribution
        left_pressure = np.sum(frame_array[:, :frame_array.shape[1]//2])
        right_pressure = np.sum(frame_array[:, frame_array.shape[1]//2:])
        total_pressure = left_pressure + right_pressure
        symmetry_score = 1.0 - abs(left_pressure - right_pressure) / total_pressure if total_pressure > 0 else 1.0

        # Update position and time for next calculation
        last_gait_pos = current_pos
        last_gait_time = current_time

        return {
            'speed': float(speed),
            'strideLength': float(stride_length),
            'symmetryScore': float(symmetry_score),
            'stepCount': len(step_positions)
        }
    except Exception as e:
        logger.error(f"Error calculating gait metrics: {str(e)}")
        return {
            'speed': 0.0,
            'strideLength': 0.0,
            'symmetryScore': 1.0,
            'stepCount': 0
        }

def has_significant_movement(frame_array, prev_frame=None, threshold=0.05):
    """Check if there is significant movement in the frame."""
    # Temporarily disabled - always return True to allow all frames
    return True

def fuse_basestation_frames():
    """
    Fuse 4 basestation frames into unified 80×54 grid.
    Uses config.yaml offsets for coordinate mapping - adjust config to recalibrate.

    Returns:
        np.ndarray: Unified grid (UNIFIED_GRID_HEIGHT × UNIFIED_GRID_WIDTH)
    """
    unified_grid = np.zeros((UNIFIED_GRID_HEIGHT, UNIFIED_GRID_WIDTH), dtype=np.float32)

    for bs_id, bs_data in basestation_frames.items():
        frame = bs_data.get('data')
        if frame is not None:
            width = bs_data['width']
            height = bs_data['height']
            offsetX = bs_data['offsetX']
            offsetY = bs_data['offsetY']

            # Validate frame shape matches config
            expected_shape = (height, width)
            if frame.shape != expected_shape:
                logger.warning(f"BS #{bs_id} fusion skipped: shape {frame.shape} != expected {expected_shape}")
                continue

            # Place frame in unified grid using config offsets
            y_start = offsetY
            y_end = offsetY + height
            x_start = offsetX
            x_end = offsetX + width

            # Bounds check
            if y_end <= UNIFIED_GRID_HEIGHT and x_end <= UNIFIED_GRID_WIDTH:
                unified_grid[y_start:y_end, x_start:x_end] = frame
                logger.debug(f"BS #{bs_id} fused at [{y_start}:{y_end}, {x_start}:{x_end}]")
            else:
                logger.error(f"BS #{bs_id} offset out of bounds: [{y_start}:{y_end}, {x_start}:{x_end}] exceeds ({UNIFIED_GRID_HEIGHT}, {UNIFIED_GRID_WIDTH})")

    return unified_grid

def get_basestation_status():
    """
    Get connection status and metadata for all basestations.

    Returns:
        dict: Basestation status metadata matching frontend UnifiedGridFrame interface
    """
    status = {}
    current_time = time.time()
    timeout_seconds = 5.0  # Mark disconnected if no data for 5 seconds

    for bs_id, bs_data in basestation_frames.items():
        last_update = bs_data.get('timestamp', 0)
        time_since_update = current_time - last_update if last_update > 0 else float('inf')

        status[bs_id] = {
            'lastUpdate': last_update,
            'connected': bs_data.get('connected', False) and time_since_update < timeout_seconds
        }

    return status

def process_frame(frame_data, force_fall=False):
    """Process a single frame of sensor data and check for falls."""
    global frame_buffer, high_prob_frames, last_fall_time, fall_probability, fall_in_progress, prev_frame, alert_history
    
    try:
        current_time = time.time()
    
        # Verify incoming frame
        logger.debug(f"Incoming frame shape: {frame_data.shape}")
        logger.debug(f"Frame data type: {frame_data.dtype}")
    
        # Check for no activity (all zeros)
        if np.sum(frame_data) == 0 and not force_fall:
            # Clear buffers if no activity
            frame_buffer.clear()
            high_prob_frames.clear()
            fall_in_progress = False
            fall_probability = 0.0
            logger.debug("No activity detected - cleared buffers")
            return False, 0.0, 30.0, {
                'stabilityScore': 1.0,
                'swayArea': 0.0,
                'weightDistribution': 50.0,
                'copMovement': 0.0
            }, {
                'pathLength': 0.0,
                'areaCovered': 0.0,
                'directionChanges': 0,
                'repetitiveScore': 0.0
            }, {
                'speed': 0.0,
                'strideLength': 0.0,
                'symmetryScore': 1.0,
                'stepCount': 0
            }

        # Simulate decibel level
        decibel_level = simulate_decibel_level(frame_data)
        logger.debug(f"Simulated decibel level: {decibel_level:.1f} dB")

        # Calculate metrics
        balance_metrics = calculate_balance_metrics(frame_data)
        wandering_metrics = calculate_wandering_metrics(frame_data)
        gait_metrics = calculate_gait_metrics(frame_data)
        
        logger.debug(f"Balance metrics: {balance_metrics}")
        logger.debug(f"Wandering metrics: {wandering_metrics}")
        logger.debug(f"Gait metrics: {gait_metrics}")

        # Force a fall if requested (for testing)
        if force_fall:
            logger.info("Forcing fall detection for testing")
            last_fall_time = current_time
            fall_in_progress = True
            fall_probability = 0.95  # High confidence for test
            
            # Update grid_updates queue with fall event
            update = {
                'grid': frame_data.tolist(),
                'fall_detected': True,
                'confidence': float(fall_probability) * 100,
                'decibelLevel': float(decibel_level),
                'balanceMetrics': balance_metrics,
                'wanderingMetrics': wandering_metrics,
                'gaitMetrics': gait_metrics,
                'timestamp': datetime.now().isoformat()
            }
            grid_updates.put(update)
            
            logger.info("🚨 Test fall detected! Sending alert to frontend")
            return True, fall_probability, decibel_level, balance_metrics, wandering_metrics, gait_metrics
        
        # If we're in cooldown and a fall was detected, maintain the alert
        if fall_in_progress and current_time - last_fall_time < COOLDOWN_PERIOD:
            logger.debug(f"Maintaining fall alert. Cooldown remaining: {COOLDOWN_PERIOD - (current_time - last_fall_time):.1f}s")
            return True, fall_probability, decibel_level, balance_metrics, wandering_metrics, gait_metrics

        # Movement check is now disabled, so we'll always add frames to the buffer
        frame_buffer.append(frame_data)
        logger.debug(f"Added frame to buffer - Frame buffer size: {len(frame_buffer)}/{SEQUENCE_LENGTH}")

        # Only process if we have enough frames
        if len(frame_buffer) < SEQUENCE_LENGTH:
            logger.debug("Buffer not yet full. Waiting for more frames.")
            return False, fall_probability, decibel_level, balance_metrics, wandering_metrics, gait_metrics

        # If ML detector is available, run prediction; otherwise bypass
        if detector is not None and getattr(detector, "model", None) is not None:
            # Process sequence for prediction
            sequence = np.array([list(frame_buffer)])
            sequence = sequence.reshape(sequence.shape + (1,))
            
            # Get prediction
            fall_probability = float(detector.model.predict(sequence, verbose=0)[0][0])
            logger.debug(f"Fall probability: {fall_probability:.4f}")

            # Track high probability frames
            is_high_prob = fall_probability >= FALL_THRESHOLD
            high_prob_frames.append(is_high_prob)
            logger.debug(f"High probability frames: {list(high_prob_frames)}")

            # Check for fall detection conditions
            if (len(high_prob_frames) == CONSECUTIVE_FRAMES and 
                all(high_prob_frames) and 
                current_time - last_fall_time >= COOLDOWN_PERIOD):
                
                last_fall_time = current_time
                fall_in_progress = True
                logger.info(f"Fall detected with probability: {fall_probability:.2f}")
                
                # Send SMS alert using Mobile Text Alerts
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                message = (
                    f"🚨 FALL DETECTED in Joe's room!\n\n"
                    f"Confidence: {fall_probability * 100:.0f}%\n"
                    f"Time: {timestamp}\n\n"
                    f"Please check on him immediately.\n\n"
                    f"👉 Emergency Services: https://emergency.scanlyticsinc.com/dispatch?location=joes_room"
                )
                
                # Send SMS alert with confidence for alert history
                sms_success = send_mobile_text_alert(message, fall_probability)
                
                return True, fall_probability, decibel_level, balance_metrics, wandering_metrics, gait_metrics
        else:
            # ML detector not initialized; bypass prediction
            fall_probability = 0.0

        # If we reach here, no fall is detected
        # Clear fall_in_progress if we're out of cooldown
        if current_time - last_fall_time >= COOLDOWN_PERIOD:
            fall_in_progress = False
    
        return False, fall_probability, decibel_level, balance_metrics, wandering_metrics, gait_metrics
    
    except Exception as e:
        logger.error(f"Error processing frame: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False, fall_probability, 30.0, {
            'stabilityScore': 1.0,
            'swayArea': 0.0,
            'weightDistribution': 50.0,
            'copMovement': 0.0
        }, {
            'pathLength': 0.0,
            'areaCovered': 0.0,
            'directionChanges': 0,
            'repetitiveScore': 0.0
        }, {
            'speed': 0.0,
            'strideLength': 0.0,
            'symmetryScore': 1.0,
            'stepCount': 0
        }

def _on_softbio_message(client, userdata, msg):
    """Handle soft biometrics prediction messages from MQTT"""
    try:
        payload = msg.payload.decode("utf-8")
        _softbio_q.put_nowait(payload)  # enqueue raw JSON string
        logger.debug(f"Enqueued softbio prediction to SSE queue")
    except queue.Full:
        logger.warning("Softbio queue full, dropping message")
    except Exception as e:
        logger.error(f"Error handling softbio message: {e}")

# Session management functions for EEG+floor data export
def session_start(session_id: str):
    global session_writer, active_session_id
    active_session_id = session_id
    if EXP_CFG.get("enabled"):
        session_writer = SessionWriter(session_id, EXP_CFG["dir"], EXP_CFG.get("format","parquet"))
        logger.info(f"[SESSION] writer initialized for {session_id}")

def session_stop():
    global session_writer, active_session_id
    if session_writer:
        out = session_writer.finalize()
        logger.info(f"[SESSION] export complete → {out}")
        session_writer = None
    active_session_id = None

def on_mqtt_message(client, userdata, message, basestation_id=None):
    """
    Handle MQTT messages from both legacy single broker and new independent basestations.

    Args:
        basestation_id: Optional basestation ID for independent broker architecture.
                       If provided, overrides topic-based extraction.
    """
    try:
        logger.info(f"Raw MQTT payload received: {message.payload[:100]}...")
        logger.info(f"Received MQTT message on topic: {message.topic}")
        logger.debug(f"Raw payload: {message.payload}")
        
        # Decode and parse message
        try:
            data = json.loads(message.payload.decode())
            # Only try to access keys if data is a dict
            if isinstance(data, dict):
                logger.debug(f"Parsed data keys: {list(data.keys())}")
        except json.JSONDecodeError:
            # Try parsing as plain array
            try:
                frame_data = eval(message.payload.decode())  # Safely evaluate as Python literal
                if isinstance(frame_data, list):
                    data = {'frame': frame_data}
                    logger.debug("Parsed message as plain array")
                else:
                    raise ValueError("Invalid frame data format")
            except Exception as e:
                logger.error(f"Failed to parse message: {e}")
                logger.error(f"Raw message: {message.payload[:100]}...")  # Log first 100 chars
                return

        logger.debug(f"Received message on topic {message.topic}")
        if isinstance(data, dict):
            logger.debug(f"Message data keys: {list(data.keys())}")

        # Handle different message topics
        if message.topic == "controller/networkx/frame/rft":
            # Extract frame data
            frame_data = None
            if isinstance(data, dict):
                if 'payload' in data and 'data' in data['payload']:
                    frame_data = data['payload']['data']
                    logger.debug("Using payload.data format")
                elif 'frame' in data:
                    frame_data = data['frame']
                    logger.debug("Using direct frame format")
                else:
                    logger.error(f"No valid frame data found in dict. Keys: {list(data.keys())}")
                    return
            elif isinstance(data, list):
                frame_data = data
                logger.debug("Using direct list format")
            
            if not isinstance(frame_data, list) or not frame_data:
                logger.error(f"Invalid frame data format: {type(frame_data)}")
                return

            # Now it's safe to process frame_data
            logger.info(f"Processing frame data: shape={np.array(frame_data).shape}")

            # Convert frame data to numpy array and process
            try:
                # Log frame data details for debugging
                logger.debug(f"Frame data type: {type(frame_data)}")
                if isinstance(frame_data, list):
                    logger.debug(f"Frame data shape: {len(frame_data)}x{len(frame_data[0]) if frame_data else 0}")
                
                frame_array = np.array(frame_data, dtype=np.float32)
                logger.debug(f"Initial frame array shape: {frame_array.shape}")
                
                # Check dimensions and transpose if needed
                if frame_array.shape != (GRID_HEIGHT, GRID_WIDTH):
                    if frame_array.shape == (GRID_WIDTH, GRID_HEIGHT):
                        frame_array = frame_array.T
                        logger.debug("Transposed frame array to match expected dimensions")
                    else:
                        logger.error(f"Frame size mismatch: got {frame_array.shape}, expected ({GRID_HEIGHT}, {GRID_WIDTH})")
                        return
                
                # Process frame data and get fall detection results
                fall_detected, confidence, decibel_level, balance_metrics, wandering_metrics, gait_metrics = process_frame(frame_array)
                logger.info(f"Processed frame: fall_detected={fall_detected}, confidence={confidence:.2f}, dB={decibel_level:.1f}")

                # Process soft biometrics if initialized
                if softbio_extractor and softbio_model:
                    try:
                        # Convert to boolean array for softbio (15x12 grid)
                        softbio_frame = frame_array > 0  # Convert to boolean

                        # Log if any sensors are active
                        active_count = np.sum(softbio_frame)
                        if active_count > 0:
                            logger.debug(f"Softbio: {active_count} active sensors")

                        # Process frame through feature extractor
                        current_time = time.time()
                        actors = softbio_extractor.ingest_frame(softbio_frame, current_time)

                        # Log number of actors detected
                        if actors:
                            logger.info(f"Softbio: Detected {len(actors)} actors")

                        # Generate predictions for each tracked actor
                        for actor_features in actors:
                            # Check if we should publish (rate limiting per track)
                            last_pub_time = softbio_last_pub.get(actor_features.track_id, 0)
                            if current_time - last_pub_time >= SOFTBIO_PUBLISH_INTERVAL:
                                # Generate prediction
                                prediction = softbio_model.predict(actor_features)
                                logger.info(f"Softbio: Generated prediction for track {actor_features.track_id}")

                                # Create output message
                                softbio_msg = {
                                    "ts": datetime.now().isoformat() + 'Z',
                                    "track_id": actor_features.track_id,
                                    "pred": prediction.to_dict(),
                                    "features": {
                                        "cadence_spm": actor_features.cadence_spm,
                                        "speed_mps": actor_features.speed_mps,
                                        "step_cv": actor_features.step_cv,
                                        "step_len_cv": actor_features.step_len_cv,
                                    }
                                }

                                # Add to SSE queue for frontend
                                if _softbio_q.full():
                                    _softbio_q.get()  # Remove oldest
                                _softbio_q.put(softbio_msg)

                                # Update last publish time
                                softbio_last_pub[actor_features.track_id] = current_time

                                logger.info(f"Softbio prediction for track {actor_features.track_id}: {prediction.gender.value}, {prediction.height_cm:.1f}cm, cadence={actor_features.cadence_spm:.0f}spm, speed={actor_features.speed_mps:.2f}m/s, steps={len(actor_features.steps)}")
                    except Exception as e:
                        logger.debug(f"Softbio processing error: {str(e)}")
                        # Don't fail the main processing

                # Get current time for synchronization
                t_now = time.time()

                # UI EEG snapshot (downsampled)
                eeg_ui = None
                if eeg_reader:
                    samples = eeg_reader.snapshot_latest(n=EEG_CFG.get("max_hz", 32))
                    # keep only value by channel for last sample (very light for UI)
                    if samples:
                        t_last, vec = samples[-1]
                        eeg_ui = {"t_epoch": t_last, "vals": vec, "labels": EEG_CFG.get("channel_labels", [])}

                # Always send update to frontend for both normal walking and falls
                update = {
                    'grid': frame_array.tolist(),
                    'fall_detected': fall_detected,
                    'confidence': float(confidence) * 100,
                    'decibelLevel': float(decibel_level),
                    'balanceMetrics': balance_metrics,
                    'wanderingMetrics': wandering_metrics,
                    'gaitMetrics': gait_metrics,
                    'timestamp': datetime.now().isoformat(),
                    't_epoch': t_now,
                    'eeg': eeg_ui  # Add EEG data field
                }
                grid_updates.put(update)

                # Write to session file if active
                if session_writer and active_session_id:
                    # Get xy coordinates if available (placeholder for now)
                    xy = None  # TODO: Extract actual x,y from path tracking if available

                    # floor row
                    session_writer.add_floor_frame(t_now, xy, {
                        'grid': frame_array.tolist(),
                        'fall_detected': fall_detected,
                        'confidence': float(confidence) * 100,
                        'timestamp': datetime.now().isoformat()
                    })

                    # drain EEG since last write
                    if eeg_reader:
                        drained = eeg_reader.drain_since(t_now - 1.0)  # 1 second window
                        if drained:
                            session_writer.add_eeg_chunk(drained, EEG_CFG.get("channel_labels", []))
                
                if fall_detected:
                    logger.info("🚨 Fall detected! Sending alert to frontend")
                else:
                    logger.debug("Normal activity - updating grid visualization")
                
            except Exception as e:
                logger.error(f"Error processing frame data: {str(e)}")
                logger.error(f"Frame data type: {type(frame_data)}")
                if isinstance(frame_data, list):
                    logger.error(f"Frame data shape: {len(frame_data)}x{len(frame_data[0]) if frame_data else 0}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                return

        elif message.topic == "analysis/path/rft/active":
            # For path data, just pass it through if it's a list
            if isinstance(data, list):
                logger.debug("Received path data as list")
                update = {
                    'path': data,
                    'timestamp': datetime.now().isoformat()
                }
                grid_updates.put(update)
                logger.info(f"Processed path data: length={len(data)}")
            else:
                logger.error(f"Invalid path data format: {type(data)}")

        elif basestation_id or message.topic.startswith("basestation/"):
            # Handle multi-basestation frame data
            # Priority 1: Use passed basestation_id (new independent broker architecture)
            # Priority 2: Extract from topic (legacy central broker architecture)
            if not basestation_id:
                # Legacy: extract basestation ID from topic (e.g., "basestation/630/frame" -> "630")
                topic_parts = message.topic.split('/')
                if len(topic_parts) >= 3 and topic_parts[2] == 'frame':
                    basestation_id = topic_parts[1]
                else:
                    logger.warning(f"Cannot extract basestation ID from topic: {message.topic}")
                    return

            if basestation_id not in basestation_frames:
                logger.warning(f"Unknown basestation ID: {basestation_id}")
                return

            # Extract frame data using same logic as single-device handler
            frame_data = None
            if isinstance(data, dict):
                if 'payload' in data and 'data' in data['payload']:
                    frame_data = data['payload']['data']
                    logger.debug(f"BS #{basestation_id}: Using payload.data format")
                elif 'frame' in data:
                    frame_data = data['frame']
                    logger.debug(f"BS #{basestation_id}: Using direct frame format")
                else:
                    logger.error(f"BS #{basestation_id}: No valid frame data found. Keys: {list(data.keys())}")
                    return
            elif isinstance(data, list):
                frame_data = data
                logger.debug(f"BS #{basestation_id}: Using direct list format")

            if not isinstance(frame_data, list) or not frame_data:
                logger.error(f"BS #{basestation_id}: Invalid frame data format: {type(frame_data)}")
                return

            # Convert to numpy array
            try:
                frame_array = np.array(frame_data, dtype=np.float32)
                expected_shape = (basestation_frames[basestation_id]['height'],
                                 basestation_frames[basestation_id]['width'])

                # Validate dimensions
                if frame_array.shape != expected_shape:
                    if frame_array.shape == (expected_shape[1], expected_shape[0]):
                        frame_array = frame_array.T
                        logger.debug(f"BS #{basestation_id}: Transposed frame to match expected dimensions")
                    else:
                        logger.error(f"BS #{basestation_id}: Frame size mismatch: got {frame_array.shape}, expected {expected_shape}")
                        return

                # Store frame in buffer
                basestation_frames[basestation_id]['data'] = frame_array
                basestation_frames[basestation_id]['timestamp'] = time.time()
                basestation_frames[basestation_id]['connected'] = True

                logger.info(f"BS #{basestation_id}: Received frame {frame_array.shape}, active sensors: {np.sum(frame_array > 0)}")

                # Fuse all basestation frames into unified grid
                unified_grid = fuse_basestation_frames()
                active_sensors = np.sum(unified_grid > 0)
                logger.debug(f"Unified grid fused: {unified_grid.shape}, active sensors: {active_sensors}")

                t_now = time.time()

                # Get EEG data if available
                eeg_ui = None
                if eeg_reader:
                    with eeg_lock:
                        latest = eeg_reader.get_latest()
                        if latest is not None:
                            eeg_ui = {
                                't_epoch': latest['t_epoch'],
                                'vals': latest['vals'].tolist() if hasattr(latest['vals'], 'tolist') else latest['vals'],
                                'labels': EEG_CFG.get("channel_labels", [])
                            }

                # Push unified grid to SSE stream
                update = {
                    'grid': unified_grid.tolist(),
                    'basestations': get_basestation_status(),
                    'timestamp': datetime.now().isoformat(),
                    't_epoch': t_now,
                    'eeg': eeg_ui
                }
                grid_updates.put(update)
                logger.debug(f"Unified grid update sent to SSE stream")

                # Write to session file if active (save unified grid for research)
                if session_writer and active_session_id:
                    # Get xy coordinates if available (placeholder for now)
                    xy = None  # TODO: Extract actual x,y from path tracking if available

                    # Save unified grid floor data
                    session_writer.add_floor_frame(t_now, xy, {
                        'grid': unified_grid.tolist(),
                        'basestations': get_basestation_status(),
                        'timestamp': datetime.now().isoformat()
                    })

                    # Drain EEG since last write
                    if eeg_reader:
                        drained = eeg_reader.drain_since(t_now - 1.0)  # 1 second window
                        if drained:
                            session_writer.add_eeg_chunk(drained, EEG_CFG.get("channel_labels", []))

                    logger.debug(f"Session data written: unified grid {unified_grid.shape}")

            except Exception as e:
                logger.error(f"BS #{basestation_id}: Error processing frame: {str(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                return

    except Exception as e:
        logger.error(f"Error in MQTT message handler: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
def on_mqtt_connect(client, userdata, flags, rc):
    """Handle MQTT connection events with enhanced logging"""
    global mqtt_connected
    connection_codes = {
        0: "Connection successful",
        1: "Connection refused - incorrect protocol version",
        2: "Connection refused - invalid client identifier",
        3: "Connection refused - server unavailable",
        4: "Connection refused - bad username or password",
        5: "Connection refused - not authorised"
    }
    
    logger.info(f"MQTT Connection attempt result - RC: {rc}")
    logger.info(f"Connection flags: {flags}")
    
    if rc == 0:
        logger.info("✅ Successfully connected to MQTT broker")
        mqtt_connected = True
        
        # Define topics with descriptions for better logging
        topics = [
            (RAW_DATA_TOPIC, 0, "Raw sensor data"),
            (ALERTS_TOPIC, 0, "Fall detection alerts"),
            ("controller/networkx/frame/rft", 0, "Frame data"),
            ("analysis/path/rft/active", 0, "Active path data"),
            ("analysis/path/rft/complete", 0, "Completed path data"),
            ("pt/metrics", 0, "PT metrics data"),
            ("pt/exercise/status", 0, "PT exercise status"),
            ("pt/exercise/type", 0, "PT exercise type"),
            ("pt/exercise/command", 0, "PT exercise commands"),
            ("softbio/prediction", 0, "Soft biometrics predictions"),
            ("softbio/debug/features", 0, "Soft biometrics debug features")
            # NOTE: Basestation frame subscriptions moved to setup_basestation_mqtt()
            # Each basestation now has its own independent MQTT broker connection
        ]
        
        # Subscribe to topics with enhanced logging
        subscription_results = []
        for topic, qos, description in topics:
            try:
                result, mid = client.subscribe(topic, qos)
                subscription_status = "Success" if result == 0 else f"Failed (code: {result})"
                logger.info(f"📌 {description} subscription - Topic: {topic}, QoS: {qos}, Status: {subscription_status}")
                subscription_results.append((topic, result == 0))
            except Exception as e:
                logger.error(f"❌ Error subscribing to {topic}: {str(e)}")
                import traceback
                logger.error(f"Subscription error traceback: {traceback.format_exc()}")
                subscription_results.append((topic, False))
        
        # Log subscription summary
        successful = len([r for _, r in subscription_results if r])
        failed = len(subscription_results) - successful
        logger.info(f"📊 Subscription Summary: {successful} successful, {failed} failed")
        
        if failed > 0:
            logger.warning("⚠️ Some topic subscriptions failed - check logs for details")
            for topic, success in subscription_results:
                if not success:
                    logger.warning(f"Failed subscription: {topic}")
        else:
            logger.info("✅ All MQTT topic subscriptions completed successfully")

        # Register callback for softbio predictions
        client.message_callback_add(SOFTBIO_TOPIC, _on_softbio_message)
        logger.info(f"📎 Registered callback for {SOFTBIO_TOPIC}")

        try:
            # Log client details for debugging
            client_id = getattr(client, '_client_id', b'unknown').decode()
            clean_session = getattr(client, '_clean_session', None)
            logger.debug(f"Client Details - ID: {client_id}, Clean Session: {clean_session}")
            
            # Attempt to get protocol version
            protocol = getattr(client, '_protocol', 'unknown')
            logger.debug(f"Protocol Version: {protocol}")
            
        except Exception as e:
            logger.warning(f"Unable to get detailed client info: {str(e)}")
            
    else:
        error_msg = connection_codes.get(rc, f"Unknown error code: {rc}")
        logger.error(f"❌ Failed to connect to MQTT broker: {error_msg}")
        logger.error(f"Connection Details - Host: {MQTT_BROKER}, Port: {MQTT_PORT}")
        mqtt_connected = False
        
        # Log additional connection details for debugging
        logger.debug(f"Connection flags: {flags}")
        logger.debug(f"User data: {userdata}")
        
        # Attempt to log broker status if possible
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2.0)  # 2 second timeout
            result = sock.connect_ex((MQTT_BROKER, MQTT_PORT))
            logger.debug(f"Broker port status: {'open' if result == 0 else 'closed'} (code: {result})")
            sock.close()
        except Exception as e:
            logger.debug(f"Could not check broker status: {str(e)}")
            import traceback
            logger.debug(f"Broker check error traceback: {traceback.format_exc()}")
        
        # Attempt reconnection if appropriate
        if rc in [3, 4, 5]:  # Server unavailable or auth issues
            logger.info("🔄 Will attempt automatic reconnection...")

def on_disconnect(client, userdata, rc):
    """Callback when disconnected from MQTT broker."""
    global mqtt_connected
    mqtt_connected = False
    if rc != 0:
        logger.error(f"Unexpected MQTT disconnection with code: {rc}")
    else:
        logger.info("Disconnected from MQTT broker")
    
    # Attempt to reconnect
    logger.info("Attempting to reconnect to MQTT broker...")
    try:
        client.reconnect()
    except Exception as e:
        logger.error(f"Failed to reconnect: {e}")

def setup_mqtt():
    """Setup legacy single MQTT broker connection (for non-basestation topics)"""
    global mqtt_client
    try:
        logger.info(f"Attempting to connect to legacy MQTT broker at {MQTT_BROKER}:{MQTT_PORT}")
        mqtt_client = mqtt.Client(client_id=f"fall_detector_{int(time.time())}")
        mqtt_client.on_connect = on_mqtt_connect
        mqtt_client.on_message = on_mqtt_message
        mqtt_client.on_disconnect = on_disconnect

        # Set up MQTT connection with keep-alive and reconnect settings
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        mqtt_client.loop_start()
        logger.info("Legacy MQTT client setup completed and loop started")
        return True
    except Exception as e:
        logger.warning(f"Legacy MQTT broker connection failed (this is OK if using independent basestations): {str(e)}")
        return False

def setup_basestation_mqtt():
    """Setup independent MQTT connections to each basestation"""
    global mqtt_clients

    logger.info("=" * 50)
    logger.info("Setting up independent basestation MQTT connections...")
    logger.info("=" * 50)

    success_count = 0

    for bs_id, bs_config in BASESTATION_DEVICES.items():
        broker = bs_config.get('broker')
        port = bs_config.get('port', 1883)
        topic = bs_config.get('mqtt_topic', 'controller/networkx/frame/rft')

        if not broker:
            logger.warning(f"Basestation #{bs_id}: No broker configured, skipping")
            continue

        try:
            logger.info(f"Basestation #{bs_id}: Connecting to {broker}:{port}")

            # Create client with unique ID
            client = mqtt.Client(client_id=f"spatial_eeg_bs{bs_id}_{int(time.time())}")

            # Create connection handler with basestation context
            def make_on_connect(basestation_id, mqtt_topic):
                def on_connect(client, userdata, flags, rc):
                    if rc == 0:
                        logger.info(f"✅ Basestation #{basestation_id}: Connected successfully")
                        basestation_frames[basestation_id]['connected'] = True
                        # Subscribe to this basestation's topic
                        client.subscribe(mqtt_topic, 0)
                        logger.info(f"📌 Basestation #{basestation_id}: Subscribed to '{mqtt_topic}'")
                    else:
                        logger.error(f"❌ Basestation #{basestation_id}: Connection failed with code {rc}")
                        basestation_frames[basestation_id]['connected'] = False
                return on_connect

            # Create message handler with basestation context
            def make_on_message(basestation_id):
                def on_message(client, userdata, msg):
                    # Reuse the existing on_mqtt_message logic
                    # The message will be processed as if it came from "basestation/{bs_id}/frame"
                    on_mqtt_message(client, userdata, msg, basestation_id=basestation_id)
                return on_message

            client.on_connect = make_on_connect(bs_id, topic)
            client.on_message = make_on_message(bs_id)
            client.on_disconnect = on_disconnect

            # Attempt connection (non-blocking)
            client.connect_async(broker, port, keepalive=60)
            client.loop_start()

            mqtt_clients[bs_id] = client
            success_count += 1
            logger.info(f"Basestation #{bs_id}: Client created and connecting...")

        except Exception as e:
            logger.error(f"Basestation #{bs_id}: Setup error - {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")

    logger.info("=" * 50)
    logger.info(f"Basestation MQTT setup complete: {success_count}/{len(BASESTATION_DEVICES)} clients created")
    logger.info("=" * 50)

    return success_count > 0

@app.route('/api/status')
def status():
    return "alive"

@app.route('/api/basestations/status')
def basestations_status():
    """Get connection status for all basestations"""
    return jsonify(get_basestation_status())

@app.route('/api/alert-history')
def get_alert_history():
    """Get alert history."""
    try:
        # Return the alert history in reverse chronological order
        return jsonify(list(reversed(alert_history)))
    except Exception as e:
        logger.error(f"Error in alert_history endpoint: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/api/mqtt/status')
def mqtt_status():
    """Get MQTT connection status with enhanced error handling"""
    try:
        logger.info("MQTT status endpoint called")
        global mqtt_connected
        response = jsonify({
            'connected': mqtt_connected,
            'timestamp': datetime.now().isoformat()
        })
        logger.info(f"Returning MQTT status: connected={mqtt_connected}")
        return response
    except Exception as e:
        logger.error(f"Error in mqtt_status endpoint: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

# NOTE: eeg_status route moved to eeg_flask_routes.py to avoid duplicate registration
# @app.route('/api/eeg/status')
# def eeg_status():
#     """Get EEG LSL connection status"""
#     ok = bool(eeg_reader and eeg_reader.running)
#     return jsonify({
#         "ok": ok,
#         "stream": EEG_CFG.get("stream_name", "EEG")
#     })

@app.route('/api/session/start', methods=['POST'])
def api_session_start():
    """Start a new session for EEG+floor data recording"""
    data = request.get_json()
    session_id = data.get('session_id', str(uuid.uuid4()))
    session_start(session_id)
    return jsonify({
        "session_id": session_id,
        "status": "started"
    })

@app.route('/api/session/stop', methods=['POST'])
def api_session_stop():
    """Stop the current session and finalize the export"""
    session_stop()
    return jsonify({
        "status": "stopped"
    })

@app.route('/api/grid-stream')
def grid_stream():
    """SSE endpoint for grid updates with enhanced error handling and logging"""
    try:
        logger.info("Grid stream endpoint called")
        
        def generate():
            while True:
                try:
                    # Wait for updates with timeout
                    update = grid_updates.get(timeout=1)
                    
                    if 'grid' in update:
                        event_type = 'grid'
                        logger.debug(f"Grid update - shape: {len(update['grid'])}x{len(update['grid'][0]) if update['grid'] else 0}")
                    elif 'path' in update:
                        event_type = 'path'
                        logger.debug("Path update received")
                    else:
                        event_type = 'keepalive'
                        logger.debug("Sending keepalive")
                    
                    yield f"event: {event_type}\ndata: {json.dumps(update)}\n\n"
                    
                except queue.Empty:
                    # Just send keepalive
                    yield f"event: keepalive\ndata: {json.dumps({'keepalive': True})}\n\n"

        logger.info("Setting up SSE response")
        response = Response(
            generate(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
                'Access-Control-Allow-Origin': 'http://localhost:5173',
                'Access-Control-Allow-Credentials': 'true'
            }
        )
        return response
        
    except Exception as e:
        logger.error(f"Error setting up grid_stream: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/api/sms/test', methods=['POST'])
def test_sms():
    """Test endpoint for SMS alerts."""
    try:
        test_message = (
            "🔔 Test SMS from Fall Detection System\n"
            f"From: {MOBILE_TEXT_ALERTS_FROM}\n"
            f"To Group: {MOBILE_TEXT_ALERTS_GROUP}\n"
            f"To Phone: +16082152426\n"
            f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        )
        success = send_mobile_text_alert(test_message)
        
        if success:
            return jsonify({
                "status": "success",
                "message": "Test SMS sent successfully"
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Failed to send test SMS"
            }), 500
            
    except Exception as e:
        error_details = str(e)
        logger.error(f"Failed to send test SMS: {error_details}")
        return jsonify({
            "status": "error",
            "message": "Failed to send test SMS",
            "error": error_details
        }), 500

@app.route('/api/test/simulate-fall', methods=['POST'])
def simulate_fall():
    """Test endpoint to simulate a fall detection event."""
    try:
        data = request.json
        fall_type = data.get('fallType', 'forward')
        logger.info(f"Simulating a {fall_type} fall for testing")
        
        # Create a synthetic fall frame with a realistic pattern
        simulated_frame = np.zeros((GRID_HEIGHT, GRID_WIDTH), dtype=np.float32)
        
        # Add more realistic scattered pressure points based on fall type
        if fall_type == 'forward':
            # Forward fall - scattered pressure points in front area
            # Head/face impact
            for i in range(9, 12):
                for j in range(5, 7):
                    if random.random() > 0.4:  # Add randomness
                        intensity = 0.8 + (random.random() * 0.2)
                        simulated_frame[i, j] = intensity
            
            # Hands/arms impact (typically spread out)
            for i in range(8, 11):
                for j in range(3, 9):
                    if random.random() > 0.75:  # Sparse pattern
                        intensity = 0.5 + (random.random() * 0.5)
                        simulated_frame[i, j] = intensity
            
            # Knees impact
            for i in range(6, 8):
                for j in range(4, 8):
                    if random.random() > 0.7:
                        intensity = 0.7 + (random.random() * 0.3)
                        simulated_frame[i, j] = intensity
                        
        elif fall_type == 'backward':
            # Backward fall - scattered pressure in back/head area
            # Back of head impact
            for i in range(2, 4):
                for j in range(5, 7):
                    if random.random() > 0.4:
                        intensity = 0.8 + (random.random() * 0.2)
                        simulated_frame[i, j] = intensity
            
            # Back/shoulder blades impact
            for i in range(3, 6):
                for j in range(3, 9):
                    if random.random() > 0.7:
                        intensity = 0.7 + (random.random() * 0.3)
                        simulated_frame[i, j] = intensity
            
            # Possible arm impacts (outstretched to break fall)
            if random.random() > 0.5:  # Sometimes arms break the fall
                for i in range(4, 7):
                    for j in [2, 3, 8, 9]:  # Sides
                        if random.random() > 0.7:
                            simulated_frame[i, j] = 0.6 + (random.random() * 0.2)
                            
        elif fall_type == 'left':
            # Left side fall - pressure along left side
            
            # Head/shoulder impact
            for i in range(6, 9):
                for j in range(2, 4):
                    if random.random() > 0.5:
                        simulated_frame[i, j] = 0.7 + (random.random() * 0.3)
            
            # Left arm/hip impact (typically a line of pressure points)
            for i in range(5, 11):
                for j in range(2, 5):
                    if random.random() > 0.8:  # Very sparse
                        simulated_frame[i, j] = 0.5 + (random.random() * 0.5)
            
            # More concentrated pressure at hip
            for i in range(8, 10):
                for j in range(3, 5):
                    if random.random() > 0.3:
                        simulated_frame[i, j] = 0.8 + (random.random() * 0.2)
                        
        elif fall_type == 'right':
            # Right side fall - pressure along right side
            
            # Head/shoulder impact
            for i in range(6, 9):
                for j in range(8, 10):
                    if random.random() > 0.5:
                        simulated_frame[i, j] = 0.7 + (random.random() * 0.3)
            
            # Right arm/hip impact (typically a line of pressure points)
            for i in range(5, 11):
                for j in range(7, 10):
                    if random.random() > 0.8:  # Very sparse
                        simulated_frame[i, j] = 0.5 + (random.random() * 0.5)
            
            # More concentrated pressure at hip
            for i in range(8, 10):
                for j in range(7, 9):
                    if random.random() > 0.3:
                        simulated_frame[i, j] = 0.8 + (random.random() * 0.2)
        
        # Add a few random noise points (sometimes seen in real data)
        for _ in range(3):
            i = random.randint(0, GRID_HEIGHT-1)
            j = random.randint(0, GRID_WIDTH-1)
            if simulated_frame[i, j] == 0:  # Don't overwrite existing activation
                simulated_frame[i, j] = 0.3 + (random.random() * 0.2)  # Low intensity noise
        
        # Process the simulated frame with high fall probability
        process_frame(simulated_frame, force_fall=True)
        
        return jsonify({
            "status": "success",
            "message": f"Simulated {fall_type} fall created"
        })
            
    except Exception as e:
        error_details = str(e)
        logger.error(f"Failed to simulate fall: {error_details}")
        return jsonify({
            "status": "error",
            "message": "Failed to simulate fall",
            "error": error_details
        }), 500

@app.route('/api/training-sequences')
def get_training_sequences():
    """Get a list of available training sequence files."""
    try:
        import os
        import re
        from pathlib import Path
        
        # Get the root directory (go up one level from web_working)
        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_dir = os.path.join(root_dir, 'data')
        
        # Get all training files
        files = []
        for file in os.listdir(data_dir):
            if file.startswith('recorded_sequences_') and file.endswith('.json'):
                files.append(file)
        
        # Sort files by date
        files.sort(reverse=True)
        
        return jsonify({
            'files': files,
            'count': len(files)
        })
    except Exception as e:
        logger.error(f"Error getting training sequences: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/api/training-sequence/<filename>')
def get_training_sequence(filename):
    """Load a specific training sequence file."""
    try:
        import os
        import json
        import re
        
        # Validate filename to prevent directory traversal
        if not re.match(r'^recorded_sequences_[\d_]+\.json$', filename):
            return jsonify({
                'error': 'Invalid filename format'
            }), 400
        
        # Get the root directory (go up one level from web_working)
        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        file_path = os.path.join(root_dir, 'data', filename)
        
        if not os.path.exists(file_path):
            return jsonify({
                'error': 'File not found'
            }), 404
            
        # Load the file
        with open(file_path, 'r') as f:
            data = json.load(f)
            
        # Convert data into the format expected by the fall visualization
        sequences = []
        
        if "sequences" in data:
            for idx, seq in enumerate(data["sequences"]):
                # Build a fall event object
                fall_event = {
                    "id": f"{filename}-{idx}",
                    "timestamp": seq.get("timestamp", ""),
                    "frames": seq.get("frames", []),
                    "fallDetected": seq.get("label", "") == "fall",
                    "fallProbability": 0.9 if seq.get("label", "") == "fall" else 0.1,
                    "analysis": {
                        "type": seq.get("label", "unknown"),
                        "bodyImpactSequence": [],
                        "trajectory": {
                            "direction": "forward",  # Default direction
                            "startPoint": [6, 0, 7],  # Mid-grid start point (12×15 grid)
                            "endPoint": [6, 0, 11],   # Forward movement by default
                            "impactPoints": [], 
                            "velocity": 1.0
                        },
                        "balanceMetrics": {
                            "preFailStabilityScore": 0.7,
                            "asymmetryIndex": 0.3
                        }
                    }
                }
                
                # Calculate impact points & trajectory from pressure data
                if fall_event["fallDetected"] and len(seq.get("frames", [])) > 0:
                    # Find frame with maximum pressure (impact frame)
                    max_pressure = 0
                    max_pressure_frame = None
                    max_frame_idx = 0
                    
                    for frame_idx, frame_data in enumerate(seq.get("frames", [])):
                        if "frame" in frame_data and isinstance(frame_data["frame"], list):
                            total_pressure = 0
                            frame = frame_data["frame"]
                            
                            # Calculate total pressure
                            for row in frame:
                                for cell in row:
                                    total_pressure += cell
                                    
                            if total_pressure > max_pressure:
                                max_pressure = total_pressure
                                max_pressure_frame = frame
                                max_frame_idx = frame_idx
                    
                    # If we found an impact frame, set impact points
                    if max_pressure_frame:
                        # Find areas with highest pressure
                        impact_points = []
                        weighted_x = 0
                        weighted_z = 0
                        weight_sum = 0
                        
                        # Height of each grid
                        height = len(max_pressure_frame)
                        width = len(max_pressure_frame[0]) if height > 0 else 0
                        
                        for row_idx, row in enumerate(max_pressure_frame):
                            for col_idx, pressure in enumerate(row):
                                if pressure > 0.5:  # High pressure threshold
                                    # Convert to 3D coordinates (X, Y, Z)
                                    x = col_idx
                                    z = row_idx
                                    y = 0  # Ground level
                                    
                                    weighted_x += x * pressure
                                    weighted_z += z * pressure
                                    weight_sum += pressure
                                    
                                    # Add as impact point
                                    impact_points.append([x, y, z])
                        
                        # Calculate center of pressure
                        if weight_sum > 0:
                            center_x = weighted_x / weight_sum
                            center_z = weighted_z / weight_sum
                            
                            # Set start point at the beginning of the grid
                            start_x = width / 2  # Middle of grid
                            start_z = 2          # Near edge
                            
                            # Set end point at center of pressure
                            end_x = center_x
                            end_z = center_z
                            
                            # Determine fall direction
                            dx = end_x - start_x
                            dz = end_z - start_z
                            
                            direction = "forward"  # Default
                            
                            if abs(dx) > abs(dz):
                                # More horizontal movement
                                direction = "right" if dx > 0 else "left"
                            else:
                                # More vertical movement
                                direction = "backward" if dz > 0 else "forward"
                            
                            # Update trajectory
                            fall_event["analysis"]["trajectory"]["direction"] = direction
                            fall_event["analysis"]["trajectory"]["startPoint"] = [start_x, 0, start_z]
                            fall_event["analysis"]["trajectory"]["endPoint"] = [end_x, 0, end_z]
                            
                            # Add body parts for visualization
                            if direction == "forward":
                                fall_event["analysis"]["bodyImpactSequence"] = [
                                    {"name": "hands", "position": [end_x, 0.3, end_z-0.5], "impact": 0.7},
                                    {"name": "knees", "position": [end_x, 0.3, end_z], "impact": 0.6},
                                    {"name": "head", "position": [end_x, 0.7, end_z-1], "impact": 0.9}
                                ]
                            elif direction == "backward":
                                fall_event["analysis"]["bodyImpactSequence"] = [
                                    {"name": "back", "position": [end_x, 0.3, end_z+0.5], "impact": 0.8},
                                    {"name": "head", "position": [end_x, 0.7, end_z+1], "impact": 0.7}
                                ]
                            elif direction == "left":
                                fall_event["analysis"]["bodyImpactSequence"] = [
                                    {"name": "left arm", "position": [end_x-0.5, 0.3, end_z], "impact": 0.7},
                                    {"name": "left hip", "position": [end_x-0.3, 0.3, end_z], "impact": 0.8},
                                    {"name": "head", "position": [end_x-1, 0.7, end_z], "impact": 0.6}
                                ]
                            else:  # right
                                fall_event["analysis"]["bodyImpactSequence"] = [
                                    {"name": "right arm", "position": [end_x+0.5, 0.3, end_z], "impact": 0.7},
                                    {"name": "right hip", "position": [end_x+0.3, 0.3, end_z], "impact": 0.8},
                                    {"name": "head", "position": [end_x+1, 0.7, end_z], "impact": 0.6}
                                ]
                            
                            # Add impact points to trajectory
                            fall_event["analysis"]["trajectory"]["impactPoints"] = impact_points[:3]  # Limit to 3 points
                
                # Add fall probability to each frame
                for frame in fall_event["frames"]:
                    # Add fall probability that increases over time for fall sequences
                    frame_idx = fall_event["frames"].index(frame)
                    progress = frame_idx / max(1, len(fall_event["frames"]) - 1)
                    
                    if fall_event["fallDetected"]:
                        # For fall sequences, probability rises from 0.1 to 0.9
                        frame["fallProbability"] = 0.1 + (0.8 * progress)
                    else:
                        # For non-fall sequences, probability stays low
                        frame["fallProbability"] = 0.05 + (0.1 * progress)
                
                sequences.append(fall_event)
        
        return jsonify({
            'filename': filename,
            'sequences': sequences,
            'count': len(sequences)
        })
    except Exception as e:
        logger.error(f"Error loading training sequence: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/api/metrics-stream')
def metrics_stream():
    """SSE endpoint for PT metrics updates - only relays real sensor data"""
    try:
        logger.info("PT metrics stream endpoint called - real sensor data only")
        
        # Global variables to track metrics from MQTT
        metrics_queue = queue.Queue()
        
        # Define callback for PT metrics topic
        def on_pt_metrics(client, userdata, message):
            try:
                metrics_data = json.loads(message.payload.decode('utf-8'))
                logger.info(f"Received PT metrics from MQTT: {metrics_data}")
                
                # Map PT analytics fields to frontend expected fields
                mapped_metrics = {}
                
                # Map sway_area_cm2 to copArea for frontend compatibility
                if 'sway_area_cm2' in metrics_data:
                    mapped_metrics['copArea'] = metrics_data['sway_area_cm2']
                
                # Map sway_vel_cm_s to swayVelocity
                if 'sway_vel_cm_s' in metrics_data:
                    mapped_metrics['swayVelocity'] = metrics_data['sway_vel_cm_s']
                
                # Map load distribution percentages
                if 'left_pct' in metrics_data:
                    mapped_metrics['leftLoadPct'] = metrics_data['left_pct'] * 100  # Convert to percentage
                if 'right_pct' in metrics_data:
                    mapped_metrics['rightLoadPct'] = metrics_data['right_pct'] * 100  # Convert to percentage
                
                # Keep original timestamp and add any additional fields
                if 'ts' in metrics_data:
                    mapped_metrics['timestamp'] = metrics_data['ts']
                
                # Merge original metrics with mapped ones (mapped ones take precedence)
                final_metrics = {**metrics_data, **mapped_metrics}
                
                logger.info(f"Mapped PT metrics for frontend: {final_metrics}")
                metrics_queue.put(final_metrics)
            except Exception as e:
                logger.error(f"Error processing PT metrics from MQTT: {e}")
        
        # Register the callback for PT metrics topic
        mqtt_client.message_callback_add("pt/metrics", on_pt_metrics)
        
        def generate():
            try:
                while True:
                    try:
                        # Try to get new metrics with a timeout
                        try:
                            metrics = metrics_queue.get(timeout=10)
                            # Add timestamp if not present
                            if "timestamp" not in metrics:
                                metrics["timestamp"] = datetime.now().isoformat()
                                
                            logger.info(f"Forwarding real PT metrics to client: {metrics}")
                            yield f"event: metrics\ndata: {json.dumps(metrics)}\n\n"
                        except queue.Empty:
                            # Send heartbeat to keep connection alive
                            yield f": heartbeat\n\n"
                            time.sleep(1)
                    except Exception as e:
                        logger.error(f"Error in PT metrics stream: {str(e)}")
                        yield f"event: error\ndata: {json.dumps({'error': 'Connection issue'})}\n\n"
                        time.sleep(1)
            finally:
                # Clean up callback on disconnect
                mqtt_client.message_callback_remove("pt/metrics")
                logger.info("Removed PT metrics callback on client disconnect")

        logger.info("Setting up PT metrics SSE response - real sensor data only")
        response = Response(
            generate(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true'
            }
        )
        return response
        
    except Exception as e:
        logger.error(f"Error setting up PT metrics stream: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/api/softbio-stream')
def softbio_stream():
    """SSE endpoint for soft biometrics predictions from MQTT"""
    def generate():
        # Optional: initial comment for proxies
        yield ": softbio stream open\n\n"

        while True:
            try:
                # Block waiting for data from the global queue
                data = _softbio_q.get()

                # Name the SSE event for frontend filtering
                # Using 'softbio:prediction' as specified in AGENT_TASKS
                yield f"event: softbio:prediction\ndata: {json.dumps(data)}\n\n"

                logger.debug(f"Sent softbio prediction via SSE")

            except Exception as e:
                logger.error(f"Error in softbio SSE stream: {e}")
                # Send error event
                yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    logger.info("Soft biometrics SSE stream requested")

    # Return SSE response with proper headers
    response = Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true'
        }
    )
    return response

# PT Session management API endpoints
@app.route('/api/pt-sessions', methods=['POST'])
def create_pt_session():
    """Create a new PT session"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['patientId', 'startTime']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # In a real application, save to database
        session_id = str(uuid.uuid4())
        
        # Log the new session
        logger.info(f"Created new PT session: {session_id} for patient {data['patientId']}")
        
        # Return success with the session ID
        return jsonify({
            'id': session_id,
            'status': 'created',
            'message': 'PT session created successfully'
        }), 201
    except Exception as e:
        logger.error(f"Error creating PT session: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/pt-sessions/<session_id>', methods=['PUT'])
def update_pt_session(session_id):
    """Update an existing PT session (end session, add metrics)"""
    try:
        data = request.json
        
        # In a real application, update in database
        logger.info(f"Updated PT session: {session_id} with data: {data}")
        
        # Return success
        return jsonify({
            'id': session_id,
            'status': 'updated',
            'message': 'PT session updated successfully'
        }), 200
    except Exception as e:
        logger.error(f"Error updating PT session: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/pt-sessions/<session_id>/metrics', methods=['POST'])
def add_session_metrics(session_id):
    """Add metrics to an existing PT session"""
    try:
        metrics = request.json
        
        # Validate metrics
        if not isinstance(metrics, list):
            return jsonify({'error': 'Metrics must be an array'}), 400
        
        # In a real application, save metrics to database
        logger.info(f"Added {len(metrics)} metrics to PT session: {session_id}")
        
        # Return success
        return jsonify({
            'id': session_id,
            'metrics_count': len(metrics),
            'status': 'metrics_added',
            'message': 'PT session metrics added successfully'
        }), 200
    except Exception as e:
        logger.error(f"Error adding metrics to PT session: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    try:
        logger.info("="*50)
        logger.info("Starting Fall Detection System")
        logger.info("="*50)

        logger.info("Step 1: Loading configuration...")
        with open(CONFIG_PATH, 'r') as file:
            config = yaml.safe_load(file)
        logger.info("Configuration loaded successfully")

        logger.info("\nStep 2: Initializing fall detector...")
        if not init_detector_and_buffers():
            logger.error("Failed to initialize fall detector. Exiting...")
            exit(1)
        logger.info("Fall detector initialized successfully")

        logger.info("\nStep 3: Setting up MQTT client...")
        if not setup_mqtt():
            logger.warning("Legacy MQTT client setup failed (this is OK if using independent basestations)")
        else:
            logger.info("Legacy MQTT client setup successfully")

        # Step 3.5: Setup independent basestation MQTT connections
        logger.info("\nStep 3.5: Setting up basestation MQTT connections...")
        logger.info(f"BASESTATION_DEVICES loaded: {list(BASESTATION_DEVICES.keys())}")
        logger.info(f"Number of basestations configured: {len(BASESTATION_DEVICES)}")
        for bs_id, bs_cfg in BASESTATION_DEVICES.items():
            logger.info(f"  - Basestation {bs_id}: broker={bs_cfg.get('broker')}, port={bs_cfg.get('port')}")

        if not setup_basestation_mqtt():
            logger.warning("No basestation MQTT clients initialized - check config.yaml")
        else:
            logger.info("Basestation MQTT connections initiated")

        # Step 3.6: Initialize EEG routes
        logger.info("\nStep 3.6: Initializing EEG routes...")
        init_eeg_routes(app)

        # Start Cortex in background
        load_dotenv('../.env.emotiv')
        client_id = os.getenv('EMOTIV_CLIENT_ID')
        client_secret = os.getenv('EMOTIV_CLIENT_SECRET')
        license_id = os.getenv('EMOTIV_LICENSE_ID')

        if client_id and client_secret:
            logger.info("🧠 Starting Emotiv Cortex in background...")
            start_cortex_in_thread(client_id, client_secret, license_id)
        else:
            logger.warning("⚠️  Emotiv credentials not found - EEG disabled")

        logger.info("\nStep 4: Starting Flask server...")
        app.run(host='0.0.0.0', port=5001, threaded=True, debug=True)
    except Exception as e:
        logger.error(f"Startup error: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        # Cleanup
        if mqtt_client:
            logger.info("Cleaning up MQTT connection...")
            mqtt_client.loop_stop()
            mqtt_client.disconnect()
        exit(1)