# Fall Detection System User Guide

This guide explains how to use the various components of the fall detection system.

## Table of Contents
1. [Live Monitor](#live-monitor)
2. [Live Predictor](#live-predictor)
3. [Training the Model](#training-the-model)
4. [Data Analyzer](#data-analyzer)

## Live Monitor

The Live Monitor (`live_monitor.py`) provides real-time visualization of the pressure sensor grid data.

### Features
- Real-time display of 12x15 pressure sensor grid
- Recording capability for collecting training data
- MQTT integration for sensor data collection

### How to Use
1. Start the monitor:
   ```bash
   python scripts/live_monitor.py
   ```

2. Display Elements:
   - Grid shows 12x15 sensor array
   - Active sensors shown as filled blocks (███)
   - Inactive sensors shown as empty brackets [ ]
   - Row and column numbers for grid reference

3. Controls:
   - Press keys to record different types of activities:
     * `F`: Record fall sequence
     * `W`: Record walking sequence
     * `O`: Record static object sequence
     * `S`: Record sitting sequence
     * `B`: Record bending sequence
     * `D`: Record dropping object sequence
   - Press `X` to stop recording
   - Press `Q` to quit

4. Recording Process:
   - Press the corresponding key to start recording
   - Perform the activity
   - Press `X` to stop recording
   - The sequence will be saved automatically

## Live Predictor

The Live Predictor (`live_predictor.py`) uses the trained model to detect falls in real-time.

### Features
- Real-time fall detection using trained model
- Visual display of sensor data
- Fall probability indicator
- Recording capability for validation

### How to Use
1. Start the predictor:
   ```bash
   python scripts/live_predictor.py
   ```

2. Display Elements:
   - Grid shows current sensor state
   - Color indicates fall probability:
     * Green: Normal activity
     * Red: Potential fall detected
   - Fall probability percentage shown
   - Recording status indicator

3. Controls:
   - `R`: Start/Stop recording for validation
   - `Q`: Quit and save recorded sequences

4. Fall Detection:
   - System automatically processes sensor data
   - Alerts shown when fall probability exceeds threshold
   - Recording can be used to validate detections

## Training the Model

The training process uses recorded sequences to train the fall detection model.

### Steps to Train
1. Collect training data using Live Monitor
2. Train the model:
   ```bash
   python scripts/train_model.py
   ```

### Training Process
1. System loads recorded sequences from the `data/` directory
2. Data is preprocessed and split into training/validation sets
3. Model is trained on the sequences with the following features:
   - Sequence length: 10 frames
   - Training metrics tracked:
     * Accuracy
     * Loss
     * Validation accuracy
     * Validation loss
4. Training visualizations are generated showing:
   - Training vs Validation Accuracy
   - Training vs Validation Loss
5. Trained model is saved to `models/` directory with timestamp
6. Training logs are saved to `logs/training_[timestamp].log`

## Data Analyzer

The Data Analyzer (`data_analyzer.py`) provides visualization and analysis tools for recorded sequences.

### Features
- Sequence visualization using animated heatmaps
- Statistical analysis of sensor activations
- Sequence playback and review
- Support for both recorded and prediction sequences

### How to Use
1. Run the analyzer:
   ```bash
   python scripts/data_analyzer.py
   ```

2. Available Analysis:
   - Animate sequences as heatmaps
   - View sequence statistics
   - Compare multiple sequences
   - Export visualizations

3. Visualization Options:
   - Heatmap view of sensor activations
   - Frame-by-frame playback
   - Customizable playback speed
   - Activity labels displayed

4. Statistical Analysis:
   - Sensor activation patterns
   - Sequence duration statistics
   - Activity distribution
   - Model performance metrics

## Additional Notes

- Ensure MQTT broker is running and accessible
- Terminal should be large enough to display the grid
- Recorded sequences are saved in the `data/` directory
- Models are saved in the `models/` directory

For technical support or to report issues, please contact the system administrator.
