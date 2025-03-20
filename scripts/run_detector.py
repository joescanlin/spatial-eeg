import os
import sys
import yaml
import argparse
from pathlib import Path

# Add src to Python path
current_dir = Path(__file__).parent
project_root = current_dir.parent
sys.path.append(str(project_root))

from src.detector.fall_detector import FallDetectionSystem

def load_config(config_path: str) -> dict:
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

def main():
    parser = argparse.ArgumentParser(description='Run Fall Detection System')
    parser.add_argument('--config', 
                       default='config/config.yaml',
                       help='Path to configuration file')
    args = parser.parse_args()
    
    # Load configuration
    config = load_config(args.config)
    
    # Create and start fall detection system
    system = FallDetectionSystem(
        mqtt_broker=config['mqtt']['broker'],
        mqtt_port=config['mqtt']['port'],
        topic=config['mqtt']['raw_data_topic']
    )
    
    try:
        system.start()
        print("Fall detection system started. Press Ctrl+C to stop.")
        
        # Keep the program running
        while True:
            pass
    except KeyboardInterrupt:
        system.stop()
        print("\nFall detection system stopped.")

if __name__ == "__main__":
    main()
