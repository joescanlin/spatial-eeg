#!/usr/bin/env python3

import sys
from pathlib import Path
import json
import numpy as np
from datetime import datetime
import paho.mqtt.client as mqtt
import time

# Add src to Python path
current_dir = Path(__file__).parent
project_root = current_dir.parent
sys.path.append(str(project_root))

class SimpleMonitor:
    def __init__(self):
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        
        self.broker = "169.254.100.100"
        self.port = 1883
        self.topic = "sensors/floor/raw"
        
        # Grid dimensions (15x12 with 4" resolution)
        self.grid_width = 15
        self.grid_height = 12
        self.pixel_resolution = 4  # inches
        
        self.recording = False
        self.current_sequence = []
        self.recorded_sequences = []
        self.message_count = 0
    
    def on_connect(self, client, userdata, flags, rc):
        print(f"\nConnected to MQTT broker with result code: {rc}")
        self.client.subscribe(self.topic)
        print(f"Subscribed to topic: {self.topic}")
    
    def on_message(self, client, userdata, msg):
        try:
            data = json.loads(msg.payload.decode())
            self.message_count += 1
            print(f"\rMessages received: {self.message_count}", end="")
            
            if self.recording:
                if 'frame' in data:
                    # Ensure we're handling binary values
                    frame = [bool(x) for x in data['frame']]
                else:
                    frame = [bool(x) for x in data]
                self.current_sequence.append({
                    'frame': frame,
                    'timestamp': datetime.now().isoformat()
                })
                print(f"\rRecording: {len(self.current_sequence)} frames", end="")
        except Exception as e:
            print(f"\nError processing message: {e}")
    
    def start_recording(self, label):
        self.recording = True
        self.current_sequence = []
        self.current_label = label
        print(f"\nStarted recording {label} sequence")
    
    def stop_recording(self):
        if self.recording:
            self.recording = False
            if len(self.current_sequence) > 0:
                sequence_data = {
                    'label': self.current_label,
                    'timestamp': datetime.now().isoformat(),
                    'frames': self.current_sequence
                }
                self.recorded_sequences.append(sequence_data)
                print(f"\nStopped recording. Sequence length: {len(self.current_sequence)} frames")
    
    def save_recordings(self):
        if len(self.recorded_sequences) > 0:
            output_path = Path(project_root) / "data" / "recorded_sequences.json"
            output_path.parent.mkdir(exist_ok=True)
            
            with open(output_path, 'w') as f:
                json.dump(self.recorded_sequences, f, indent=2)
            print(f"\nSaved {len(self.recorded_sequences)} sequences to {output_path}")
        else:
            print("\nNo sequences were recorded")
    
    def run(self):
        print("\nSimple Monitor Starting...")
        print("Controls:")
        print("  'r' - Start recording fall sequence")
        print("  'w' - Start recording walk sequence")
        print("  's' - Stop recording")
        print("  'q' - Quit and save recordings\n")
        
        self.client.connect(self.broker, self.port, 60)
        self.client.loop_start()
        
        try:
            while True:
                cmd = input().lower()
                if cmd == 'r':
                    self.start_recording('fall')
                elif cmd == 'w':
                    self.start_recording('walk')
                elif cmd == 's':
                    self.stop_recording()
                elif cmd == 'q':
                    break
        except KeyboardInterrupt:
            pass
        finally:
            self.client.loop_stop()
            self.client.disconnect()
            self.save_recordings()

def main():
    monitor = SimpleMonitor()
    monitor.run()

if __name__ == "__main__":
    main()
