# Emotiv Cortex Quick Start Guide

## 🚀 Get Running in 5 Minutes

This guide gets you from zero to streaming EEG data as quickly as possible.

---

## Prerequisites

- ✅ **Emotiv Insight headset** (not version 2.0)
- ✅ **Emotiv Pro subscription** (required for EEG, metrics, band power)
- ✅ **macOS/Windows/Linux** computer
- ✅ **Python 3.10+** installed
- ✅ **Node.js 18+** installed

---

## Step 1: Get Emotiv Credentials (5 minutes)

1. Go to https://www.emotiv.com/my-account/cortex-apps/
2. Click "Create New App"
3. Fill in:
   - **App Name:** `spatial-eeg-research`
   - **Description:** `Geriatric flooring research`
4. Click "Create"
5. Copy your **Client ID** and **Client Secret**
6. Note your **License ID** from account page

---

## Step 2: Configure Application (2 minutes)

```bash
cd /path/to/spatial-eeg

# Copy example config
cp .env.emotiv.example .env.emotiv

# Edit with your credentials (use nano, vim, or any editor)
nano .env.emotiv
```

Paste your credentials:
```env
EMOTIV_CLIENT_ID=your_actual_client_id_here
EMOTIV_CLIENT_SECRET=your_actual_client_secret_here
EMOTIV_LICENSE_ID=your_actual_license_id_here
```

Save and exit.

---

## Step 3: Install Dependencies (3 minutes)

```bash
# Backend dependencies
pip install websockets python-dotenv

# Already have these, but just in case:
pip install fastapi uvicorn sqlalchemy psycopg2-binary

# Frontend (if not already done)
cd web_working
npm install
cd ..
```

---

## Step 4: Start Emotiv Services (1 minute)

1. Open **Emotiv Launcher**
2. Login with your EmotivID
3. Turn on your **Insight headset**
4. Wait for headset to appear as "Connected" in Launcher
5. Leave Launcher running (minimize it)

---

## Step 5: Update Backend to Load EEG Routes (2 minutes)

Edit your main server file (e.g., `web_working/server.py` or `src/backend/main.py`):

```python
from fastapi import FastAPI
from src.backend.routes.eeg_session import (
    router as eeg_router,
    initialize_cortex,
    shutdown_cortex
)
import os
from dotenv import load_dotenv

# Load Emotiv config
load_dotenv('.env.emotiv')

app = FastAPI()

# Add EEG routes
app.include_router(eeg_router)

# ... your other routes ...

@app.on_event("startup")
async def startup():
    """Initialize Cortex on startup"""
    client_id = os.getenv('EMOTIV_CLIENT_ID')
    client_secret = os.getenv('EMOTIV_CLIENT_SECRET')
    license_id = os.getenv('EMOTIV_LICENSE_ID')

    if client_id and client_secret:
        print("🧠 Initializing Emotiv Cortex...")
        success = await initialize_cortex(client_id, client_secret, license_id)
        if success:
            print("✅ Cortex initialized successfully!")
        else:
            print("⚠️  Cortex initialization failed - check logs")
    else:
        print("⚠️  Emotiv credentials not found - EEG features disabled")

@app.on_event("shutdown")
async def shutdown():
    """Cleanup on shutdown"""
    print("🧠 Shutting down Cortex...")
    await shutdown_cortex()
```

---

## Step 6: Start Application (1 minute)

```bash
# Terminal 1: Start backend
python web_working/server.py
# or
python start_pt_analytics.py

# Terminal 2: Start frontend (if separate)
cd web_working
npm run dev
```

Look for this in the backend logs:
```
🧠 Initializing Emotiv Cortex...
Connecting to Cortex API at wss://localhost:6868
✓ Connected to Cortex API
Cortex version: 2.x.x
✓ User logged in: your_email@example.com
✓ Access granted
✓ Authentication successful
✓ Cortex initialized successfully!
```

---

## Step 7: Test EEG Streaming (2 minutes)

### Option A: Via UI

1. Open browser: `http://localhost:5173` (or your frontend port)
2. Click the **"EEG"** button in top navigation
3. Click **"Start Session"** button
4. You should see:
   - ✅ "Connected" status
   - ✅ 5 channels shown
   - ✅ Contact quality indicators
   - ✅ Cognitive metrics updating
   - ✅ Band power visualization
   - ✅ EEG signal bars moving

### Option B: Via API (Testing)

```bash
# Check status
curl http://localhost:8000/api/eeg/status

# List headsets
curl http://localhost:8000/api/eeg/headsets

# Start session
curl -X POST http://localhost:8000/api/eeg/session/start \
  -H "Content-Type: application/json" \
  -d '{"streams": ["eeg", "met", "pow", "mot", "eq", "dev"]}'

# Get latest metrics
curl http://localhost:8000/api/eeg/data/metrics

# Get contact quality
curl http://localhost:8000/api/eeg/data/contact-quality

# Stop session
curl -X POST http://localhost:8000/api/eeg/session/stop
```

---

## ✅ Success Checklist

If everything is working, you should see:

- [x] Backend logs show "Cortex initialized successfully"
- [x] EEG view shows "Connected" status
- [x] Contact quality shows sensors (may be red until headset worn)
- [x] Cognitive metrics show numbers (even if low)
- [x] Band power visualization shows bars
- [x] EEG signal panel shows moving bars

---

## 🐛 Common Issues

### "Cortex not initialized"

**Cause:** Credentials missing or Emotiv Launcher not running

**Fix:**
1. Check `.env.emotiv` file exists and has correct credentials
2. Start Emotiv Launcher
3. Login to Launcher
4. Restart backend

### "Failed to authenticate"

**Cause:** Invalid credentials or expired session

**Fix:**
1. Verify credentials at https://www.emotiv.com/my-account/cortex-apps/
2. Check you copied entire Client ID and Secret (no spaces)
3. Try generating new credentials

### "No headsets found"

**Cause:** Headset not connected or turned off

**Fix:**
1. Turn on Insight headset
2. Wait for blue LED
3. Check Emotiv Launcher shows headset
4. Click "Refresh" in Launcher if needed
5. Try clicking "Start Session" again

### "Failed to subscribe to eeg/met/pow"

**Cause:** No Emotiv Pro subscription

**Fix:**
1. Go to https://www.emotiv.com/my-account/
2. Subscribe to Emotiv Pro
3. Verify license ID in `.env.emotiv`
4. Restart backend

### "All sensors show poor quality"

**Cause:** Headset not worn or sensors dry

**Fix:**
1. Put headset on properly
2. Moisten sensors with water or saline
3. Adjust headset position
4. Make sure Pz sensor (back) touches scalp
5. Move hair away from sensors

---

## 🎯 Next Steps

Once streaming is working:

1. **Test Recording:**
   - Click "Start Session" (recording button)
   - Walk on floor sensors
   - Click "Add Marker" when changing patterns
   - Click "Stop Session"
   - Data saved to Emotiv cloud

2. **Export Data:**
   ```bash
   curl -X POST http://localhost:8000/api/eeg/recording/export \
     -H "Content-Type: application/json" \
     -d '{
       "record_ids": ["your_record_id"],
       "folder": "./eeg_exports",
       "format": "CSV"
     }'
   ```

3. **Analyze:**
   - Open exported CSV in Python/R
   - Look for correlations between:
     - Floor patterns → Cognitive load (beta power)
     - Hesitation → Stress metrics
     - Smooth navigation → Alpha power

4. **Read Full Guide:**
   - See `CORTEX_INTEGRATION_GUIDE.md` for complete documentation
   - Includes research workflow, data interpretation, troubleshooting

---

## 📊 What Each Metric Means

| Metric | Range | Good | Bad | Meaning |
|--------|-------|------|-----|---------|
| **Engagement** | 0-100% | >70% | <30% | Focus/attention on task |
| **Stress** | 0-100% | <30% | >70% | Frustration/anxiety |
| **Focus** | 0-100% | >70% | <30% | Sustained attention |
| **Relaxation** | 0-100% | >70% | <30% | Calm, confident state |
| **Contact Quality** | 0-4 | 3-4 | 0-2 | Sensor-scalp connection |
| **Alpha Power** | Variable | High | Low | Relaxed alertness |
| **Beta Power** | Variable | Moderate | Very High | High = anxiety/effort |
| **Cognitive Load** | Ratio | <1.5 | >2.5 | Beta/Alpha ratio |

**For Geriatric Research:**
- **Good floor pattern:** High alpha, low stress, smooth gait
- **Bad floor pattern:** High beta, high stress, irregular gait
- **Pz channel (parietal):** Key for spatial processing

---

## 💡 Pro Tips

1. **Always check contact quality first** - Poor contact = unreliable data
2. **Moisturize sensors** - Dry sensors give poor quality
3. **Use markers liberally** - Mark every floor pattern change
4. **Export after each session** - Don't lose data
5. **Monitor latency** - Should stay <100ms
6. **Let subject acclimate** - 2-3 minutes for stable baseline

---

## 🆘 Need Help?

1. Check `CORTEX_INTEGRATION_GUIDE.md` for detailed docs
2. Check backend logs for error messages
3. Check Emotiv Launcher for headset status
4. Verify Pro subscription is active
5. Try reconnecting headset in Launcher

---

**You're ready to start your geriatric flooring research! 🎉**