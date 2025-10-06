# Soft Biometrics Demo - Complete Startup Guide

## Pre-requisites
- MQTT Broker running at 169.254.100.100:1883
- Sensor grid publishing to topic: `controller/networkx/frame/rft`
- Python dependencies: `paho-mqtt`, `numpy`, `scikit-learn`, `pyyaml`, `flask`

## Startup Sequence (2 Services Required) ✨ SIMPLIFIED

### 1. Start Flask Backend Server (Integrated Softbio)
**Location:** `web_working/`
**Purpose:** Integrated backend with softbio processing + SSE bridge

```bash
cd web_working/
python server.py
```

**What it does:**
- Runs Flask server on port 8000
- Connects to MQTT broker at 169.254.100.100:1883
- **Initializes soft biometrics components inline**
- Subscribes to `controller/networkx/frame/rft` (sensor input)
- **Processes gait analysis and predictions in real-time**
- Provides SSE endpoint at `/api/softbio-stream`
- Bridges predictions directly to frontend via SSE

**Expected output:**
```
Soft biometrics components initialized successfully
✅ Successfully connected to MQTT broker
Server running on http://0.0.0.0:8000
```

### 2. Start Frontend UI
**Location:** `web_working/`
**Purpose:** React UI for real-time visualization

```bash
cd web_working/
npm run dev
```

**What it does:**
- Starts Vite development server on port 5000
- Proxies API requests to Flask backend at port 8000
- Connects to `/api/softbio-stream` for real-time updates
- Displays soft biometrics UI at http://localhost:5000

**Expected output:**
```
VITE v5.4.19  ready in 316 ms
➜  Local:   http://localhost:5000/
```

## Data Flow Architecture ✨ SIMPLIFIED

```
Sensor Grid (15×12 @ 10Hz)
    ↓
MQTT Broker (169.254.100.100:1883)
Topic: controller/networkx/frame/rft
    ↓
Flask Backend Server (Integrated)
- Feature extraction (gait analysis)
- Baseline model predictions
- SSE Bridge (/api/softbio-stream)
    ↓
React Frontend (localhost:5000)
- Real-time UI updates
- Gender, height, age predictions
```

**Key Change:** Soft biometrics processing now happens **inline** within the Flask server, eliminating the need for a separate predictor service!

## Configuration Files

### MQTT Settings
- **Integrated Backend:** `server.py` → `MQTT_BROKER = '169.254.100.100'`
- **Softbio Config:** `softbio/config/softbio.yaml` (model parameters only)

### Topics
- **Input:** `controller/networkx/frame/rft` (sensor frames)
- **Internal Processing:** Soft biometrics predictions generated inline
- **Frontend SSE:** `/api/softbio-stream` (real-time updates)

## Troubleshooting

### Frontend shows "Connection status: Disconnected"
- Check Flask backend is running on port 8000
- Verify `/api/softbio-stream` endpoint is accessible
- Look for proxy errors in Vite console

### No predictions appearing
- Verify integrated backend connected to MQTT broker
- Check sensor grid is publishing to correct topic
- Look for "Softbio prediction for track..." in backend logs

### MQTT connection issues
- Verify broker is running at 169.254.100.100:1883
- Check network connectivity to broker
- Ensure topic names match exactly in all services

### Dependencies missing
```bash
pip install paho-mqtt numpy scikit-learn pyyaml flask flask-cors
npm install  # for frontend dependencies
```

## Live Demo Validation ✨ SIMPLIFIED

1. **Start 2 services** in the order above:
   - `python server.py` (integrated backend)
   - `npm run dev` (frontend)
2. **Open browser** to http://localhost:5000
3. **Verify UI shows:**
   - Grid visualization on left (15×12)
   - Summary cards and console on right
   - Connection status shows "Connected"
4. **Walk across sensor grid**
5. **Watch for:**
   - Real-time grid activations
   - Predictions appearing in console
   - Summary cards updating with gender/height/age
   - Confidence improving as steps accumulate

## Expected Prediction Format

The system will output predictions every 500ms per tracked person:

```json
{
  "ts": "2025-09-24T15:13:30.567Z",
  "track_id": "a1",
  "pred": {
    "gender": {"value": "male", "p_male": 0.73},
    "height_cm": 176.4,
    "height_ci_cm": [170.0, 182.0],
    "age": {"bin": "adult", "range_years": [25, 45], "confidence": 0.62},
    "quality": {"n_steps": 6, "flags": []}
  },
  "features": {
    "cadence_spm": 112,
    "speed_mps": 1.33,
    "step_cv": 0.08,
    "step_len_cv": 0.12
  }
}
```

This represents the complete end-to-end soft biometrics pipeline ready for live sensor demonstration.