# Spatial EEG System - Ubuntu Deployment Guide

Complete deployment guide for the Spatial EEG multi-basestation sensor fusion research platform.

## System Overview

The system consists of three components:

1. **Launcher Service** (port 3000) - Control panel for managing the system
2. **Backend Server** (port 5001) - Python/Flask server handling MQTT, EEG, and data processing
3. **Frontend App** (port 5000) - React/Vite web application for visualization

## Prerequisites

The Ubuntu laptop should have:
- Ubuntu 20.04 LTS or newer
- Python 3.8 or higher
- Node.js 16 or higher and npm
- Git
- Internet connection (for initial setup and updates)
- Access to MQTT broker (169.254.100.100:1883)

## Initial Deployment

### Step 1: Clone the Repository

```bash
cd ~
git clone https://github.com/joescanlin/spatial-eeg.git
cd spatial-eeg
```

### Step 2: Run Setup Script

The setup script will install all dependencies and create the desktop shortcut:

```bash
chmod +x setup.sh
./setup.sh
```

This will:
- Install Python dependencies (Flask, paho-mqtt, numpy, psutil, etc.)
- Install frontend dependencies (React, Vite, etc.)
- Create a desktop shortcut on the user's desktop
- Set up the start script

### Step 3: Launch the System

You have three options to start the launcher:

**Option A: Desktop Shortcut (Recommended for researchers)**
- Double-click the "Spatial EEG System" icon on the desktop

**Option B: Start Script**
```bash
cd ~/spatial-eeg
./start.sh
```

**Option C: Direct Python**
```bash
cd ~/spatial-eeg
python3 launcher.py
```

### Step 4: Access the Control Panel

Once the launcher starts:
1. Open a web browser
2. Navigate to: `http://localhost:3000`
3. You'll see the control panel with system status and buttons

### Step 5: Start the Main System

From the control panel:
1. Click **"Start System"** button
2. Wait for both backend and frontend to start (status indicators will turn green)
3. Click the **"Main Application"** quick link to open the application at `http://localhost:5000`

## Using the Control Panel

### System Status

The control panel shows real-time status of:
- **Launcher**: Always online (green)
- **Backend (Port 5001)**: Python server status
- **Frontend (Port 5000)**: React app status

### Control Buttons

- **▶ Start System**: Starts both backend and frontend
- **■ Stop System**: Stops both services
- **↻ Restart System**: Restarts both services (useful after crashes)

### Software Updates

To check for and install updates from GitHub:

1. Click **"Check for Updates"** button
2. If updates are available, you'll see the number of commits and changes
3. Click **"Install Updates"** to download and apply them
4. The system will automatically restart after updates

### Viewing Logs

Click **"View Logs"** to see recent system activity and troubleshoot issues.

### Quick Access Links

- **Main Application**: Opens the full research interface
- **Live Gait View**: Direct access to gait analysis
- **Unified Grid**: View 4-basestation sensor fusion
- **EEG Monitor**: EEG data visualization

## Daily Workflow for Researchers

### Starting a Session

1. Double-click "Spatial EEG System" desktop icon
2. Browser opens to control panel at `localhost:3000`
3. Click "Start System" button
4. Wait for green status indicators
5. Click "Main Application" to begin research

### Running Experiments

1. From the main app, navigate to "Subjects" tab
2. Create or select a research subject
3. Click "EEG" tab to start an EEG recording session
4. Floor sensor data is automatically captured and fused from all 4 basestations
5. All data is synchronized and saved together

### Ending a Session

1. Stop any active recordings in the app
2. Close the browser tab
3. Return to control panel
4. Click "Stop System" button
5. Close the control panel browser tab

## Troubleshooting

### Backend Won't Start

**Symptoms**: Backend status stays red after clicking "Start System"

**Solutions**:
1. Check MQTT broker is accessible: `ping 169.254.100.100`
2. Verify Python dependencies: `pip3 list | grep flask`
3. Check logs in control panel for error messages
4. Try "Restart System" button

### Frontend Won't Start

**Symptoms**: Frontend status stays red

**Solutions**:
1. Check port 5000 isn't already in use: `lsof -ti :5000`
2. Verify Node.js is installed: `node --version`
3. Reinstall dependencies: `cd ~/spatial-eeg/web_working && npm install`
4. Check logs for npm errors

### Basestation Not Connecting

**Symptoms**: Unified grid shows no data from one or more basestations

**Solutions**:
1. Check physical basestation power and network
2. Verify MQTT topics in control panel logs
3. Review config.yaml basestation configuration
4. Ensure MQTT broker is running

### EEG Stream Not Working

**Symptoms**: EEG view shows no data

**Solutions**:
1. Ensure EmotivPRO is running and streaming
2. Check EEG headset is connected and sensors have good contact
3. Verify LSL stream name in config.yaml matches EmotivPRO settings
4. Check backend logs for LSL connection errors

### System Crashes or Freezes

**Solutions**:
1. Open control panel
2. Click "Stop System"
3. Wait 5 seconds
4. Click "Start System"
5. If problem persists, check logs and restart Ubuntu

## Configuration

### MQTT Settings

Edit `~/spatial-eeg/web_working/config.yaml`:

```yaml
mqtt:
  broker: 169.254.100.100
  port: 1883

basestations:
  devices:
    "630":
      mqtt_topic: basestation/630/frame
    "631":
      mqtt_topic: basestation/631/frame
    "632":
      mqtt_topic: basestation/632/frame
    "633":
      mqtt_topic: basestation/633/frame
```

### Basestation Coordinate Calibration

If physical sensor alignment changes, adjust offsets in `config.yaml`:

```yaml
basestations:
  unified_grid:
    width: 80
    height: 54

  devices:
    "630":
      width: 40
      height: 24
      offsetX: 0    # Adjust X position
      offsetY: 0    # Adjust Y position
      mqtt_topic: basestation/630/frame

    "631":
      width: 40
      height: 24
      offsetX: 40
      offsetY: 0
      mqtt_topic: basestation/631/frame

    "632":
      width: 40
      height: 30
      offsetX: 0
      offsetY: 24
      mqtt_topic: basestation/632/frame

    "633":
      width: 40
      height: 30
      offsetX: 40
      offsetY: 24
      mqtt_topic: basestation/633/frame
```

**No code changes needed** - just edit the YAML file and restart the system.

### EEG Configuration

```yaml
eeg:
  enabled: true
  stream_name: EEG        # Must match EmotivPRO outlet name
  max_hz: 32
  channel_labels: ["AF3","T7","Pz","T8","AF4"]
```

## Updating the System

### Receiving Updates from GitHub

When new features or fixes are pushed to the repository:

**Method 1: Control Panel (Easiest)**
1. Open control panel
2. Click "Check for Updates"
3. Review changes
4. Click "Install Updates"
5. System restarts automatically

**Method 2: Manual Git Pull**
```bash
cd ~/spatial-eeg
git pull origin main
./setup.sh  # Reinstall dependencies if needed
```

## Data Management

### Session Data Location

Research session data is saved in:
```
~/spatial-eeg/session_exports/
```

Each session includes:
- Unified floor sensor grid data (80×54 pixels, all 4 basestations)
- EEG data (synchronized timestamps)
- Subject metadata
- Saved in Parquet format for efficient analysis

### Backing Up Data

Periodically copy session data to external storage:
```bash
cp -r ~/spatial-eeg/session_exports/ /media/backup/eeg-sessions/
```

## Network Configuration

### Required Network Access

The system needs access to:
- MQTT Broker: `169.254.100.100:1883`
- GitHub (for updates): `github.com` (HTTPS)
- Local network only (no internet required for operation)

### Firewall Settings

If Ubuntu firewall is enabled, allow local ports:
```bash
sudo ufw allow 3000/tcp  # Launcher
sudo ufw allow 5000/tcp  # Frontend
sudo ufw allow 5001/tcp  # Backend
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Researcher Desktop                                         │
│                                                             │
│  [Desktop Icon] → Double Click                              │
│         ↓                                                   │
│  ┌──────────────────────────────────────────────┐          │
│  │ Launcher Service (Port 3000)                 │          │
│  │ - Control Panel UI                           │          │
│  │ - Process Management                         │          │
│  │ - Update Management                          │          │
│  └──────────────────────────────────────────────┘          │
│         ↓ Start System                                      │
│  ┌─────────────────────┐    ┌────────────────────────┐     │
│  │ Backend (Port 5001) │←───│ Frontend (Port 5000)   │     │
│  │ - MQTT Handler      │    │ - React/Vite App       │     │
│  │ - 4-BS Fusion       │    │ - Real-time Viz        │     │
│  │ - EEG LSL Client    │    │ - Subject Management   │     │
│  │ - Session Writer    │    │ - Session Recording    │     │
│  └─────────────────────┘    └────────────────────────┘     │
│         ↓                                                   │
│  ┌─────────────────────────────────────────────┐           │
│  │ Data Storage: ~/spatial-eeg/session_exports/│           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                     ↓
        External MQTT Broker & Sensors
        (169.254.100.100:1883)
          ├─ Basestation #630 (40×24)
          ├─ Basestation #631 (40×24)
          ├─ Basestation #632 (40×30)
          └─ Basestation #633 (40×30)
```

## Support

For issues not covered in this guide:
1. Check the launcher logs (View Logs button in control panel)
2. Check backend logs: `~/spatial-eeg/web_working/server.log`
3. Check launcher logs: `~/spatial-eeg/launcher.log`
4. Contact system administrator with log files

## Quick Reference Commands

```bash
# Start launcher manually
cd ~/spatial-eeg && python3 launcher.py

# Check what's running on ports
lsof -ti :3000  # Launcher
lsof -ti :5000  # Frontend
lsof -ti :5001  # Backend

# View logs
tail -f ~/spatial-eeg/launcher.log
tail -f ~/spatial-eeg/web_working/server.log

# Update system manually
cd ~/spatial-eeg
git pull origin main

# Reinstall dependencies
cd ~/spatial-eeg && ./setup.sh

# Kill stuck processes
pkill -f "python.*launcher.py"
pkill -f "python.*server.py"
pkill -f "vite"
```

## System Requirements

### Minimum Hardware
- CPU: 4 cores, 2.5 GHz
- RAM: 8 GB
- Storage: 50 GB free (for session data)
- Network: 100 Mbps Ethernet

### Recommended Hardware
- CPU: 8 cores, 3.0 GHz+
- RAM: 16 GB
- Storage: 500 GB SSD
- Network: 1 Gbps Ethernet

### Software Versions
- Ubuntu 20.04 LTS or newer
- Python 3.8+
- Node.js 16+
- Git 2.25+

## License

This system is for research use only. All subject data should be handled according to IRB protocols and HIPAA regulations.
