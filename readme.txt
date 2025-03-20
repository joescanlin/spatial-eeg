# Fall Detection System

A real-time fall detection system using floor-based pressure sensors.

## Setup

1. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install requirements:
```bash
pip install -r requirements.txt
```

3. Install MQTT broker (if not already installed):
```bash
# On Ubuntu/Debian
sudo apt-get install mosquitto mosquitto-clients

# On macOS
brew install mosquitto
```

## Running the System

1. Start the MQTT broker:
```bash
mosquitto -v
```

2. Run the simulator:
```bash
python scripts/run_simulator.py --scenario fall
```

3. Run the detector:
```bash
python scripts/run_detector.py
```

## Testing

Run tests:
```bash
pytest tests/
```

## Project Structure

- `src/detector/`: Fall detection algorithm
- `src/simulator/`: Sensor data simulator
- `src/utils/`: Visualization and helper utilities
- `tests/`: Test cases and test data
- `config/`: Configuration files
- `scripts/`: Run scripts for simulator and detector

## Configuration

Edit `config/config.yaml` to adjust:
- Detection parameters
- Simulation settings
- MQTT configuration
