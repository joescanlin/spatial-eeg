# REPO_QUICKMAP - EEG + Floor Path Integration Guide

## 1. Runtime & Entrypoint (≤10 lines)
- **Language**: Python 3.10+ (see web_working/venv/lib/python3.10)
- **Main services**:
  - FastAPI backend: `python main.py` or `uvicorn main:app --host 0.0.0.0 --port 8000`
  - Flask SSE server: `python web_working/server.py`
  - PT Analytics: `python start_pt_analytics.py`
  - Frontend: `npm run dev` (Vite on port 5173)
- **No Docker/Compose** found in repo

## 2. Floor Data Flow (≤12 lines)
- **MQTT Broker**: `169.254.100.100:1883` (config.yaml:2)
- **Subscribe topics**:
  - `controller/networkx/frame/rft` - Main sensor frames
  - `sensors/floor/raw` - Raw sensor data
- **Publish topics**:
  - `pt/metrics` - PT analytics metrics
  - `softbio/prediction` - Soft biometrics output
- **Path reconstruction**: `src/pt_analytics/services/stream_to_metrics.py:on_message()`
- **Timestamps**: System clock via `datetime.now()` (stream_to_metrics.py:83)
- **Session start/stop**: `src/backend/routes/sessions.py` - POST `/sessions/` and `/sessions/{id}/stop`
- **QoS**: Default 1 (src/utils/mqtt_client.py:117)

## 3. Session Persistence (≤8 lines)
- **Database**: PostgreSQL via asyncpg (main.py:12, models.py)
- **Tables**: `pt_sessions`, `pt_metric_samples` (src/backend/db/models.py:169-196)
- **Session creation**: `src/backend/routes/sessions.py:create_session()`
- **No file-based session export** found - all DB persistence
- **Recording sequences**: `data/recorded_sequences.json` (scripts/simple_monitor.py:81)
- **Predictions**: `predictions/` directory (scripts/live_predictor.py:355)

## 4. UI Tap (≤6 lines)
- **Path viz server**: `web_working/server.py` - Flask on default port 5000
- **Frontend**: Vite dev server on port 5173 (package.json:11)
- **Data flow**: Server-Sent Events (SSE) via `/api/grid-stream` endpoint
- **Hook**: `useDataStream.ts:72` - EventSource connection
- **MQTT → SSE bridge**: `web_working/server.py:on_message()` → `grid_updates` queue

## 5. EEG Hook - In-Process Hook
- **File:Function**: `web_working/server.py:on_message()` at line 284
- **Justification**: Already aggregates MQTT sensor data and has access to session state; adding LSL reader here keeps all sensor fusion in one process.

## 6. Concrete TODOs
- Add dependency: `pip install pylsl==1.16.2` to requirements.txt
- Create `src/utils/lsl_client.py` module with LSLInlet wrapper class
- Add LSL inlet initialization in `web_working/server.py:__init__` section (after line 98)
- Modify `web_working/server.py:on_message()` to merge EEG samples with floor frames
- Add EEG data field to frame structure in `grid_updates` queue
- Create `src/utils/session_writer.py` to save combined JSON/Parquet files
- Add EEG config section to `web_working/config.yaml`
- Extend SSE message format to include `eeg_data` field
- Add EEG visualization component in `web_working/src/components/`
- Update `useDataStream.ts` to parse EEG data from SSE events

## 7. Exact Run Commands

### Dev Run (Local)
```bash
# Terminal 1 - Backend API
cd /Users/jscanlin/Documents/spatial-eeg
python main.py

# Terminal 2 - Flask SSE Server
python web_working/server.py

# Terminal 3 - PT Analytics (optional)
python start_pt_analytics.py

# Terminal 4 - Frontend
cd web_working
npm run dev
```

### Open UI
- Navigate to: `http://localhost:5173`
- PT Session view is default
- Live Gait view shows real-time metrics

### Verify MQTT Connection
```bash
# Check MQTT status
curl http://localhost:5000/api/mqtt/status
```

---

## Quick Discovery Commands
- Find MQTT usage: `grep -r "mqtt.Client" src/`
- Find session handling: `grep -r "SessionCache\|session_id" src/`
- Find SSE endpoints: `grep -r "EventSource\|event-stream" web_working/`
- Find frame processing: `grep -r "parse_frame\|process_frame" src/`