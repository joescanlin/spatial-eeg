#!/usr/bin/env python3

import sys
from pathlib import Path
import json
import numpy as np
from datetime import datetime
import paho.mqtt.client as mqtt
import curses
import logging
import time
import os

# Setup logging
logging.basicConfig(
    filename='live_monitor.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

class LiveMonitor:
    def __init__(self):
        # Setup MQTT client with a unique client ID
        client_id = f'floor_monitor_{int(time.time())}'
        self.client = mqtt.Client(client_id=client_id)
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect
        
        # Grid dimensions (12 wide x 15 long, 4" pixels)
        self.grid_width = 12  # Width is 12 pixels
        self.grid_height = 15  # Height is 15 pixels
        self.pixel_resolution = 4  # inches
        
        # Initialize frame buffer with zeros (15 rows x 12 columns)
        self.current_frame = np.zeros((self.grid_height, self.grid_width), dtype=bool)
        
        # MQTT settings
        self.broker = "169.254.100.100"
        self.port = 1883
        self.topics = [
            ("controller/networkx/frame/rft", 0),
            ("analysis/path/rft/active", 0),
            ("analysis/path/rft/complete", 0)
        ]
        self.connected = False
        self.last_message_time = time.time()
        self.message_count = 0
        
        # Recording state
        self.recording = False
        self.current_sequence = []
        self.recorded_sequences = []
        self.scenario_types = {
            'F': 'fall',          # Actual falls
            'W': 'walk',          # Normal walking
            'O': 'object',        # Static objects (suitcase, box)
            'S': 'sit',           # Sitting down
            'B': 'bend',          # Bending over
            'D': 'drop'           # Dropping objects
        }
        
        # Display settings
        self.stdscr = None
        self.status_message = ""
        
    def on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker."""
        if rc == 0:
            self.connected = True
            logger.info(f"Connected to MQTT broker with result code: {rc}")
            
            # Subscribe to all topics
            for topic, qos in self.topics:
                self.client.subscribe(topic, qos)
                logger.info(f"Subscribed to topic: {topic}")
            
            print(f"\nConnected to MQTT broker {self.broker}:{self.port}")
        else:
            self.connected = False
            logger.error(f"Failed to connect to MQTT broker. Return code: {rc}")

    def on_disconnect(self, client, userdata, rc):
        """Callback when disconnected from MQTT broker."""
        logger.warning(f"Disconnected from MQTT broker with result code: {rc}")
        if rc != 0:
            logger.error("Unexpected disconnection. Attempting to reconnect...")
            self.client.reconnect()

    def on_message(self, client, userdata, msg):
        """Handle incoming MQTT messages."""
        try:
            # Update last message time
            self.last_message_time = time.time()
            
            # Log raw message
            logger.info(f"Received MQTT message on topic: {msg.topic}")
            logger.info(f"Raw payload: {msg.payload.decode()}")  # Changed to INFO level temporarily
            
            # Parse JSON data
            try:
                data = json.loads(msg.payload.decode())
                logger.info(f"Parsed JSON structure: {list(data.keys())}")  # Log the actual keys we get
            except json.JSONDecodeError as e:
                # Try parsing as plain array
                try:
                    frame_data = eval(msg.payload.decode())  # Safely evaluate as Python literal
                    if isinstance(frame_data, list):
                        # Treat the data as direct frame data
                        logger.info("Received direct array data")
                        data = {'frame': frame_data}
                    else:
                        logger.error(f"Unexpected data format after eval: {type(frame_data)}")
                        return
                except Exception as e:
                    logger.error(f"Failed to parse message as JSON or array: {e}")
                    logger.error(f"Raw message: {msg.payload}")
                    return
            
            self.message_count += 1
            
            if msg.topic == "controller/networkx/frame/rft":
                # Extract frame data from the payload.data field
                if 'payload' in data and 'data' in data['payload']:
                    frame_data = data['payload']['data']
                    logger.debug(f"Received frame data shape: {len(frame_data)}x{len(frame_data[0]) if frame_data else 0}")
                    
                    try:
                        # Convert 2D array to numpy array
                        frame_matrix = np.array(frame_data, dtype=bool)
                        
                        # Check if dimensions match our grid
                        if frame_matrix.shape != (self.grid_height, self.grid_width):
                            logger.error(f"Frame size mismatch: got {frame_matrix.shape}, expected ({self.grid_height}, {self.grid_width})")
                            return
                        
                        # Update the current frame
                        self.current_frame = frame_matrix
                        
                        active_count = np.sum(self.current_frame)
                        logger.debug(f"Frame processed: {active_count} active sensors")
                        
                        if active_count > 0:
                            active_positions = np.where(self.current_frame)
                            logger.debug("Active sensor positions (y,x):")
                            for y, x in zip(active_positions[0], active_positions[1]):
                                logger.debug(f"  ({y},{x})")
                        
                        # Force immediate display update
                        self.update_display()
                        self.stdscr.refresh()
                        
                    except Exception as e:
                        logger.error(f"Error processing frame data: {e}")
                        logger.exception("Frame processing error:")
            else:
                # Extract frame data - expecting 2D array in 'frame' key
                if 'frame' not in data:
                    logger.error(f"No 'frame' key in message. Available keys: {list(data.keys())}")
                    return
                    
                frame_data = data['frame']
                if not isinstance(frame_data, list) or not frame_data:
                    logger.error(f"Invalid frame data format: {frame_data}")
                    return
                    
                logger.debug(f"Received frame data shape: {len(frame_data)}x{len(frame_data[0]) if frame_data else 0}")
                
                try:
                    # Convert 2D array to numpy array
                    frame_matrix = np.array(frame_data, dtype=bool)
                    
                    # Check if dimensions match our grid
                    if frame_matrix.shape != (self.grid_height, self.grid_width):
                        logger.error(f"Frame size mismatch: got {frame_matrix.shape}, expected ({self.grid_height}, {self.grid_width})")
                        return
                    
                    # Flip the matrix vertically so (0,0) is at bottom left
                    self.current_frame = np.flipud(frame_matrix)
                    
                    active_count = np.sum(self.current_frame)
                    logger.debug(f"Frame processed: {active_count} active sensors")
                    
                    if active_count > 0:
                        active_positions = np.where(self.current_frame)
                        logger.debug("Active sensor positions (y,x):")
                        for y, x in zip(active_positions[0], active_positions[1]):
                            logger.debug(f"  ({y},{x})")
                    
                    # Force immediate display update
                    self.update_display()
                    self.stdscr.refresh()
                    
                except Exception as e:
                    logger.error(f"Error processing frame data: {e}")
                    logger.exception("Frame processing error:")
            
            if self.recording:
                self.current_sequence.append({
                    'frame': frame_data,
                    'timestamp': datetime.now().isoformat()
                })
                logger.info(f"Recorded frame {len(self.current_sequence)} for {self.current_label} sequence")
            
        except Exception as e:
            logger.error(f"Error in message handler: {e}")
            logger.exception("Full traceback:")

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
            curses.init_pair(1, curses.COLOR_GREEN, -1)  # Active sensors
            curses.init_pair(2, curses.COLOR_WHITE, -1)  # Inactive sensors
            curses.init_pair(3, curses.COLOR_CYAN, -1)   # Status messages
            
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
            logger.info("Display initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing display: {e}")
            self.cleanup()
            raise

    def update_display(self):
        """Update the display with current sensor data."""
        if self.stdscr is None:
            logger.error("Display not initialized")
            return
            
        try:
            # Get window dimensions
            max_y, max_x = self.stdscr.getmaxyx()
            
            # Clear the screen
            self.stdscr.clear()
            
            # Draw title, ensuring it fits
            title = f" Floor Sensor Monitor ({self.grid_width}x{self.grid_height}) "
            title_x = max(0, min(max_x - len(title), (max_x - len(title)) // 2))
            if title_x + len(title) < max_x:
                self.stdscr.addstr(0, title_x, title[:max_x-title_x-1])
            
            # Calculate grid area
            grid_start_y = 2  # Leave space for title
            grid_start_x = 4  # Leave space for row numbers
            
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
                    color = curses.color_pair(2)  # Default inactive
                    
                    if self.current_frame[y, x]:
                        cell = "███"
                        color = curses.color_pair(1)  # Active
                    
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
            
            # Draw status line if there's space
            status_y = max_y - 2
            if status_y > col_y + 1:
                status = " [Q]uit | [F]all | [W]alk | [O]bject | [S]it | [B]end | [D]rop | [X] Stop Recording "
                status_x = max(0, min(max_x - len(status), (max_x - len(status)) // 2))
                try:
                    self.stdscr.addstr(status_y, status_x, status[:max_x-status_x-1])
                except curses.error:
                    pass
            
            # Update the screen
            self.stdscr.refresh()
            
        except curses.error as e:
            logger.error(f"Display error: {e}")
        except Exception as e:
            logger.error(f"Unexpected display error: {e}")
            logger.exception("Full traceback:")

    def start_recording(self, label):
        """Start recording a sequence."""
        self.recording = True
        self.current_sequence = []
        self.current_label = label
        logger.info(f"Started recording {label} sequence")
    
    def stop_recording(self):
        """Stop recording the current sequence."""
        if self.recording:
            self.recording = False
            if len(self.current_sequence) > 0:
                sequence_data = {
                    'label': self.current_label,
                    'timestamp': datetime.now().isoformat(),
                    'frames': self.current_sequence
                }
                self.recorded_sequences.append(sequence_data)
                logger.info(f"Stopped recording. Sequence length: {len(self.current_sequence)}")
    
    def save_recordings(self):
        """Save recorded sequences to file."""
        if not self.recorded_sequences:
            logger.info("No sequences to save")
            return

        # Create a timestamp for the filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir = Path("data")
        output_dir.mkdir(exist_ok=True)
        output_path = output_dir / f"recorded_sequences_{timestamp}.json"
        
        # Store sequence count for logging
        num_sequences = len(self.recorded_sequences)
        
        # Add notes to sequences if needed
        for sequence in self.recorded_sequences:
            if sequence['label'] in ['object', 'fall', 'walk', 'sit', 'bend', 'drop']:
                # Temporarily disable curses to get input
                curses.endwin()
                note = input(f"Enter notes for {sequence['label']} sequence (press Enter to skip): ")
                if note.strip():
                    sequence['notes'] = note
                # Restore curses
                self.init_display()
        
        # Save to file with metadata
        with open(output_path, 'w') as f:
            json.dump({
                'metadata': {
                    'grid_width': self.grid_width,
                    'grid_height': self.grid_height,
                    'pixel_resolution': self.pixel_resolution,
                    'timestamp': datetime.now().isoformat(),
                    'total_sequences': num_sequences
                },
                'sequences': self.recorded_sequences
            }, f, indent=2)
        
        # Print success message after successful save
        print(f"\nSuccessfully saved {num_sequences} sequences to {output_path}")
        logger.info(f"Successfully saved {num_sequences} sequences to {output_path}")
        
        # Clear sequences after successful save
        self.recorded_sequences = []
        
    def cleanup(self):
        """Clean up curses."""
        if self.stdscr is not None:
            self.stdscr.keypad(False)
            curses.nocbreak()
            curses.echo()
            curses.endwin()
    
    def run(self):
        """Main run loop."""
        try:
            # Connect to MQTT broker
            logger.info(f"Connecting to MQTT broker {self.broker}:{self.port}...")
            self.client.connect(self.broker, self.port, 60)
            
            # Start MQTT loop in a separate thread
            self.client.loop_start()
            
            # Initialize display
            self.init_display()
            
            # Main loop
            while True:
                try:
                    # Check MQTT connection
                    if not self.connected:
                        logger.warning("MQTT connection lost, attempting to reconnect...")
                        self.client.reconnect()
                    
                    # Get user input
                    key = self.stdscr.getch()
                    if key != -1:
                        key_char = chr(key).upper()
                        if key_char == 'Q':
                            # Save any remaining recordings before quitting
                            self.save_recordings()
                            break
                        elif key_char in self.scenario_types:
                            self.start_recording(self.scenario_types[key_char])
                        elif key_char == 'X':  # Changed from 'O' to 'X' for stop
                            self.stop_recording()
                    
                    # Update display periodically
                    self.update_display()
                    time.sleep(0.1)
                    
                except curses.error as e:
                    logger.error(f"Curses error in main loop: {e}")
                    continue
                
        except KeyboardInterrupt:
            logger.info("Received keyboard interrupt")
        except Exception as e:
            logger.error(f"Error in main loop: {e}")
            logger.exception("Full traceback:")
        finally:
            self.client.loop_stop()
            self.client.disconnect()
            self.cleanup()
            self.save_recordings()

def main():
    monitor = LiveMonitor()
    monitor.run()

if __name__ == "__main__":
    main()
