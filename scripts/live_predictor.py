import numpy as np
import json
import paho.mqtt.client as mqtt
import curses
import time
import os
from collections import deque
from fall_detector import FallDetector
import logging
import threading
from datetime import datetime
import argparse

class LivePredictor:
    def __init__(self, model_path, sequence_length=10):
        """Initialize the live predictor with a trained model."""
        # Create necessary directories
        os.makedirs("models", exist_ok=True)
        os.makedirs("logs", exist_ok=True)
        os.makedirs("predictions", exist_ok=True)  # For saving prediction sequences
        
        # Initialize fall detector and load model
        self.detector = FallDetector(sequence_length=sequence_length)
        self.detector.load_model(model_path)
        
        # Frame buffer for predictions
        self.frame_buffer = deque(maxlen=sequence_length)
        
        # Grid dimensions (12 wide x 15 long, 4" pixels)
        self.grid_width = 12  # Width is 12 pixels
        self.grid_height = 15  # Height is 15 pixels
        self.pixel_resolution = 4  # inches
        
        # Initialize frame buffer with zeros (15 rows x 12 columns)
        self.current_frame = np.zeros((self.grid_height, self.grid_width), dtype=bool)
        
        # Recording state
        self.recording = False
        self.current_sequence = []
        self.recorded_sequences = []
        self.prediction_results = []  # Store prediction results
        
        # Valid sequence tags
        self.valid_tags = {
            'T': 'true_positive',   # Correctly detected fall
            'F': 'false_positive',  # Incorrectly detected fall
            'M': 'missed_fall',     # Missed actual fall
            'C': 'correct_normal'   # Correctly identified normal activity
        }
        
        # MQTT settings
        client_id = f'fall_predictor_{int(time.time())}'
        self.client = mqtt.Client(client_id=client_id)
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect
        
        self.broker = "169.254.100.100"
        self.port = 1883
        self.topics = [
            ("controller/networkx/frame/rft", 0),
            ("analysis/path/rft/active", 0),
            ("analysis/path/rft/complete", 0)
        ]
        self.connected = False
        self.last_message_time = time.time()
        
        # Display settings
        self.stdscr = None
        self.status_message = ""
        self.fall_probability = 0.0
        self.last_prediction_time = time.time()
        self.prediction_interval = 0.5  # Make predictions every 0.5 seconds
        
        # Alert system
        self.fall_threshold = 0.8
        self.alert_active = False
        self.alert_start_time = None
        self.alert_duration = 10  # seconds to show alert
        
        # Logging setup
        logging.basicConfig(
            filename='logs/fall_predictions.log',
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
    
    def on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker."""
        if rc == 0:
            self.connected = True
            logging.info(f"Connected to MQTT broker with result code: {rc}")
            
            # Subscribe to all topics
            for topic, qos in self.topics:
                self.client.subscribe(topic, qos)
                logging.info(f"Subscribed to topic: {topic}")
            
            print(f"\nConnected to MQTT broker {self.broker}:{self.port}")
        else:
            self.connected = False
            logging.error(f"Failed to connect to MQTT broker. Return code: {rc}")
            
    def on_disconnect(self, client, userdata, rc):
        """Callback when disconnected from MQTT broker."""
        logging.warning(f"Disconnected from MQTT broker with result code: {rc}")
        if rc != 0:
            logging.error("Unexpected disconnection. Attempting to reconnect...")
            self.client.reconnect()

    def on_message(self, client, userdata, msg):
        """Handle incoming MQTT messages."""
        try:
            # Update last message time
            self.last_message_time = time.time()
            
            # Log raw message
            logging.info(f"Received MQTT message on topic: {msg.topic}")
            logging.debug(f"Raw payload: {msg.payload}")
            
            # Parse JSON data
            try:
                data = json.loads(msg.payload.decode())
                logging.debug(f"Parsed data keys: {list(data.keys())}")
            except json.JSONDecodeError:
                # Try parsing as plain array
                try:
                    frame_data = eval(msg.payload.decode())  # Safely evaluate as Python literal
                    if isinstance(frame_data, list):
                        data = {'frame': frame_data}
                        logging.debug("Parsed as direct frame data")
                    else:
                        logging.error(f"Unexpected data format after eval: {type(frame_data)}")
                        return
                except Exception as e:
                    logging.error(f"Failed to parse message as JSON or array: {e}")
                    return
            
            if msg.topic == "controller/networkx/frame/rft":
                # Extract frame data from the payload.data field
                frame_data = None
                if 'payload' in data and 'data' in data['payload']:
                    frame_data = data['payload']['data']
                    logging.debug("Using payload.data format")
                elif 'frame' in data:
                    frame_data = data['frame']
                    logging.debug("Using direct frame format")
                else:
                    logging.error(f"No valid frame data found. Keys: {list(data.keys())}")
                    return
                
                if not isinstance(frame_data, list) or not frame_data:
                    logging.error(f"Invalid frame data format: {type(frame_data)}")
                    return
                
                try:
                    # Convert 2D array to numpy array
                    frame_matrix = np.array(frame_data, dtype=np.float32)
                    logging.debug(f"Frame matrix shape: {frame_matrix.shape}")
                    
                    # Check if dimensions match our grid
                    if frame_matrix.shape != (self.grid_height, self.grid_width):
                        # Try transposing if dimensions are swapped
                        if frame_matrix.shape == (self.grid_width, self.grid_height):
                            frame_matrix = frame_matrix.T
                            logging.debug("Transposed frame matrix to match expected dimensions")
                        else:
                            logging.error(f"Frame size mismatch: got {frame_matrix.shape}, expected ({self.grid_height}, {self.grid_width})")
                            return
                    
                    # Update current frame and add to buffer
                    self.current_frame = frame_matrix
                    self.frame_buffer.append(frame_matrix)
                    
                    # Add to recording if active
                    if self.recording:
                        self.current_sequence.append({
                            'frame': frame_data,
                            'timestamp': datetime.now().isoformat()
                        })
                    
                    # Make prediction if buffer is full and enough time has passed
                    current_time = time.time()
                    if (len(self.frame_buffer) == self.detector.sequence_length and 
                        current_time - self.last_prediction_time >= self.prediction_interval):
                        prob = self.make_prediction()
                        self.last_prediction_time = current_time
                        
                        # Add prediction result if recording
                        if self.recording:
                            self.prediction_results.append({
                                'probability': float(prob),
                                'timestamp': datetime.now().isoformat()
                            })
                    
                    # Force immediate display update
                    self.update_display()
                    self.stdscr.refresh()
                    
                except Exception as e:
                    logging.error(f"Error processing frame data: {e}")
                    logging.exception("Frame processing error:")
            
        except Exception as e:
            logging.error(f"Error in message handler: {e}")
            logging.exception("Full traceback:")
    
    def make_prediction(self):
        """Make a fall prediction using the current frame buffer."""
        try:
            # Prepare input sequence
            sequence = np.array([self.frame_buffer])
            sequence = sequence.reshape(sequence.shape + (1,))
            
            # Get prediction
            self.fall_probability = float(self.detector.model.predict(sequence, verbose=0)[0])
            
            # Check for fall alert
            if self.fall_probability > self.fall_threshold:
                if not self.alert_active:
                    self.alert_active = True
                    self.alert_start_time = time.time()
                    self.log_fall_event()
            
            # Update display
            self.update_display()
            
            return self.fall_probability
        
        except Exception as e:
            logging.error(f"Error making prediction: {e}")
    
    def log_fall_event(self):
        """Log details when a fall is detected."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        logging.warning(f"FALL DETECTED at {timestamp} (probability: {self.fall_probability:.2f})")
    
    def init_display(self):
        """Initialize the curses display."""
        try:
            # Initialize curses
            self.stdscr = curses.initscr()
            curses.start_color()
            curses.use_default_colors()
            curses.noecho()
            curses.cbreak()
            curses.curs_set(0)  # Hide cursor
            self.stdscr.keypad(True)
            
            # Initialize color pairs
            curses.init_pair(1, curses.COLOR_GREEN, -1)  # Normal state
            curses.init_pair(2, curses.COLOR_RED, -1)    # Fall detected
            curses.init_pair(3, curses.COLOR_WHITE, -1)  # Inactive sensors
            
            # Get terminal size
            max_y, max_x = self.stdscr.getmaxyx()
            min_width = self.grid_width * 4 + 6   # 4 chars per cell + margins
            min_height = self.grid_height + 6     # grid + margins
            
            if max_y < min_height or max_x < min_width:
                raise ValueError(
                    f"Terminal too small. Needs at least {min_width}x{min_height}, "
                    f"got {max_x}x{max_y}. Please resize your terminal."
                )
            
            # Clear screen and initialize display
            self.stdscr.clear()
            self.update_display()
            logging.info("Display initialized successfully")
            
        except Exception as e:
            logging.error(f"Error initializing display: {e}")
            self.cleanup_display()
            raise
    
    def cleanup_display(self):
        """Clean up the curses display."""
        if self.stdscr is not None:
            self.stdscr.keypad(False)
            curses.nocbreak()
            curses.echo()
            curses.endwin()
    
    def stop_recording(self):
        """Stop recording the current sequence."""
        if not self.recording:
            return
        
        self.recording = False
        logging.info("Recording stopped")
        
        # Show labeling menu if we have recorded frames
        if self.current_sequence:
            # Save sequence temporarily
            temp_sequence = self.current_sequence.copy()
            temp_predictions = self.prediction_results.copy()
            
            # Properly cleanup curses before showing terminal menu
            self.cleanup_display()
            
            # Show stats and menu
            print("\nSequence Stats:")
            print(f"Sequence length: {len(temp_sequence)} frames")
            print(f"Fall detections: {sum(1 for pred in temp_predictions if pred['probability'] >= self.fall_threshold)}/{len(temp_predictions)} frames")
            print(f"Max fall probability: {max([p['probability'] for p in temp_predictions]) if temp_predictions else 0:.1%}")
            print("\nTag options:")
            print("T: true_positive  (correctly detected fall)")
            print("F: false_positive (incorrectly detected fall)")
            print("M: missed_fall    (missed actual fall)")
            print("C: correct_normal (correctly identified normal activity)")
            
            # Get user input
            while True:
                tag = input("\nEnter tag (T/F/M/C): ").upper()
                if tag in self.valid_tags:
                    # Save sequence with label
                    self.recorded_sequences.append({
                        'frames': temp_sequence,
                        'predictions': temp_predictions,
                        'label': self.valid_tags[tag],
                        'timestamp': datetime.now().isoformat()
                    })
                    logging.info(f"Sequence labeled as {self.valid_tags[tag]}")
                    break
                print("Invalid tag. Please use T, F, M, or C.")
            
            # Clear current sequence
            self.current_sequence = []
            self.prediction_results = []
            
            # Reinitialize display
            self.init_display()
    
    def save_sequences(self):
        """Save recorded sequences after prompting for tags."""
        if not self.recorded_sequences:
            return
        
        # Save to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"predictions/prediction_sequences_{timestamp}.json"
        
        data = {
            "sequences": self.recorded_sequences,
            "metadata": {
                "grid_width": self.grid_width,
                "grid_height": self.grid_height,
                "pixel_resolution": self.pixel_resolution,
                "model_path": os.path.basename(self.detector.model_path),  # Add model path
                "timestamp": datetime.now().isoformat()
            }
        }
        
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
            
        print(f"\nSaved {len(self.recorded_sequences)} sequences to {filename}")
        
        # Clear recorded sequences
        self.recorded_sequences = []
        
        # Restore curses
        self.stdscr.clear()
        curses.doupdate()

    def run(self):
        """Main loop for the live predictor."""
        try:
            # Initialize display
            self.init_display()
            
            # Connect to MQTT broker
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start()
            
            # Main loop
            while True:
                # Get keyboard input
                key = self.stdscr.getch()
                if key != -1:
                    if chr(key).upper() == 'Q':
                        if self.recorded_sequences:
                            # Cleanup curses before saving
                            self.cleanup_display()
                            self.save_sequences()
                        break
                    elif chr(key).upper() == 'R':
                        if not self.recording:
                            self.start_recording()
                        else:
                            self.stop_recording()
                
                # Update display
                self.update_display()
                
                # Sleep briefly to prevent high CPU usage
                time.sleep(0.01)
                
        except KeyboardInterrupt:
            pass
        finally:
            self.client.disconnect()
            # Make sure we cleanup curses properly
            self.cleanup_display()
    
    def update_display(self):
        """Update the display with current sensor data and fall predictions."""
        if self.stdscr is None:
            logging.error("Display not initialized")
            return
            
        try:
            # Get window dimensions
            max_y, max_x = self.stdscr.getmaxyx()
            
            # Clear the screen
            self.stdscr.clear()
            
            # Draw title with fall probability and recording status
            title = f" Fall Detection Monitor - Probability: {self.fall_probability:.1%} "
            if self.recording:
                title += "[ Recording... ]"
            title_x = max(0, min(max_x - len(title), (max_x - len(title)) // 2))
            if title_x + len(title) < max_x:
                self.stdscr.addstr(0, title_x, title[:max_x-title_x-1])
            
            # Calculate grid area
            grid_start_y = 2  # Leave space for title
            grid_start_x = 4  # Leave space for row numbers
            
            # Select color based on fall probability
            grid_color = curses.color_pair(2) if self.fall_probability >= self.fall_threshold else curses.color_pair(1)
            
            # Draw grid and row numbers
            for y in range(min(self.grid_height, max_y - grid_start_y - 3)):
                # Draw row number if it fits
                if grid_start_x > 2:
                    row_num = str(self.grid_height - y - 1).rjust(2)
                    self.stdscr.addstr(grid_start_y + y, 1, row_num)
                
                # Draw grid cells
                for x in range(min(self.grid_width, (max_x - grid_start_x) // 4)):
                    cell_x = grid_start_x + x * 4
                    if cell_x + 3 >= max_x:
                        break
                    
                    # Get cell state
                    cell = "[ ]"
                    color = curses.color_pair(3)  # Default inactive
                    
                    if self.current_frame[y, x]:
                        cell = "███"
                        color = grid_color  # Active - red or green based on fall probability
                    
                    try:
                        self.stdscr.addstr(grid_start_y + y, cell_x, cell, color)
                    except curses.error:
                        pass  # Skip if cell doesn't fit
            
            # Draw column numbers if there's space
            col_y = grid_start_y + min(self.grid_height, max_y - grid_start_y - 3) + 1
            if col_y < max_y - 1:
                for x in range(min(self.grid_width, (max_x - grid_start_x) // 4)):
                    col_x = grid_start_x + x * 4
                    if col_x + 1 >= max_x:
                        break
                    try:
                        self.stdscr.addstr(col_y, col_x, f"{x:2d}")
                    except curses.error:
                        pass
            
            # Draw fall alert if active
            if self.fall_probability >= self.fall_threshold:
                alert_str = "⚠️  FALL DETECTED!  ⚠️"
                try:
                    alert_y = max_y - 3
                    alert_x = max(0, (max_x - len(alert_str)) // 2)
                    self.stdscr.addstr(alert_y, alert_x, alert_str, 
                                     curses.color_pair(2) | curses.A_BOLD)
                except curses.error:
                    pass
            
            # Draw status line
            status_y = max_y - 1
            status = " Press 'R' to toggle recording, 'Q' to quit and save recordings "
            status_x = max(0, (max_x - len(status)) // 2)
            try:
                self.stdscr.addstr(status_y, status_x, status)
            except curses.error:
                pass
            
            # Refresh display
            self.stdscr.refresh()
            
        except Exception as e:
            logging.error(f"Error updating display: {e}")
            logging.exception("Full traceback:")
    
    def start_recording(self):
        """Start recording the current sequence."""
        if not self.recording:
            self.recording = True
            self.current_sequence = []
            self.prediction_results = []
            logging.info("Started recording sequence")
    
    def save_sequences(self):
        """Save recorded sequences after prompting for tags."""
        if not self.recorded_sequences:
            return
        
        # Save to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"predictions/prediction_sequences_{timestamp}.json"
        
        data = {
            "sequences": self.recorded_sequences,
            "metadata": {
                "grid_width": self.grid_width,
                "grid_height": self.grid_height,
                "pixel_resolution": self.pixel_resolution,
                "model_path": os.path.basename(self.detector.model_path),  # Add model path
                "timestamp": datetime.now().isoformat()
            }
        }
        
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
            
        print(f"\nSaved {len(self.recorded_sequences)} sequences to {filename}")
        
        # Clear recorded sequences
        self.recorded_sequences = []
        
        # Restore curses
        self.stdscr.clear()
        curses.doupdate()

def get_available_models():
    """Get list of available models sorted by timestamp."""
    models_dir = 'models'
    if not os.path.exists(models_dir):
        return []
    
    # Get all .keras files
    model_files = [f for f in os.listdir(models_dir) if f.endswith('.keras')]
    
    # Sort by timestamp in filename (if present) or by modification time
    def get_sort_key(filename):
        # Try to extract timestamp from filename
        if '_2024' in filename:
            try:
                # Convert timestamp to float for consistent comparison
                timestamp = filename.split('_')[2].split('.')[0]
                return float(timestamp)
            except:
                pass
        # Use file modification time
        return os.path.getmtime(os.path.join(models_dir, filename))
    
    return sorted(model_files, key=get_sort_key, reverse=True)

def get_latest_model():
    """Get path to latest model file."""
    models = get_available_models()
    if not models:
        return 'models/fall_detector_final.keras'  # Default fallback
    return os.path.join('models', models[0])

def main():
    try:
        # Get latest model
        model_path = get_latest_model()
        if not model_path:
            print("No trained models found. Please train a model first.")
            return
        
        # Create and run predictor
        predictor = LivePredictor(model_path)
        predictor.run()
        
    except Exception as e:
        print(f"Error: {e}")
        logging.error(f"Error in main: {e}")
        logging.exception("Full traceback:")

if __name__ == "__main__":
    main()
