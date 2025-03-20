import os
import sys
import yaml
import argparse
from pathlib import Path

# Add src to Python path
current_dir = Path(__file__).parent
project_root = current_dir.parent
sys.path.append(str(project_root))

from src.simulator.sensor_simulator import FloorSensorSimulator, ScenarioType

def load_config(config_path: str) -> dict:
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

def main():
    # Create simulator instance for scenario listing
    simulator = FloorSensorSimulator()
    
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Run Sensor Simulator')
    parser.add_argument('--config', 
                       default='config/config.yaml',
                       help='Path to configuration file')
    parser.add_argument('--scenario',
                       choices=[s.value for s in ScenarioType],
                       help='Simulation scenario to run')
    parser.add_argument('--list',
                       action='store_true',
                       help='List available scenarios')
    
    args = parser.parse_args()
    
    # List scenarios if requested
    if args.list:
        simulator.list_scenarios()
        return
    
    if not args.scenario:
        parser.print_help()
        return
    
    # Load configuration
    config = load_config(args.config)
    
    # Create simulator instance
    simulator = FloorSensorSimulator(
        width_feet=config['simulator']['room_width_feet'],
        length_feet=config['simulator']['room_length_feet']
    )
    
    # Run simulation
    try:
        simulator.run_simulation(
            mqtt_broker=config['mqtt']['broker'],
            mqtt_port=config['mqtt']['port'],
            scenario=args.scenario
        )
    except KeyboardInterrupt:
        print("\nSimulator stopped.")

if __name__ == "__main__":
    main()
