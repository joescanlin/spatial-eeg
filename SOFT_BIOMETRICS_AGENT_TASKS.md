
# Soft Biometrics v1 — Agent Implementation Tasks (Post-README)

**Scope:** These tasks are executed **after** the agent has followed the root `SOFT_BIOMETRICS_README.md` to copy files and set up the project structure. Do **not** refactor existing code. Additive changes only.

**Repo Map (from audit):**
- Backend root: `web_working/` (Flask `server.py` is the active backend)
- Python package root: `web_working/`
- Frontend root (Vite React): `web_working/`
- MQTT input topic (frames): `controller/networkx/frame/rft`
- New MQTT output topic (soft-bio): `softbio/prediction`
- New SSE route (to implement): `/api/softbio-stream`
- Frontend SSE event name: `softbio:prediction`

---

## 0) Preconditions checklist

- [ ] The following files exist (installed via README steps or provided stubs):
  - `web_working/softbio/__init__.py`
  - `web_working/softbio/types.py`
  - `web_working/softbio/feature_extractor.py`
  - `web_working/softbio/baseline_model.py`
  - `web_working/softbio/predictor.py`
  - `web_working/softbio/config/softbio.yaml`
  - `web_working/src/components/SoftBioPanel.tsx`
  - `web_working/src/types/softbio.ts`
- [ ] Python deps installed in the same env as `server.py`: `paho-mqtt`, `numpy`, `PyYAML`
- [ ] The fall-detection app still runs (no regressions).

---

## 1) Wire the Flask SSE bridge to stream soft-bio predictions

**File:** `web_working/server.py`

The backend already bridges MQTT → SSE for other streams. Mirror that pattern for the new topic `softbio/prediction` and route `/api/softbio-stream`.

> Follow the existing coding style (logging, error handling, auth headers, heartbeats). If helper utilities (e.g., `utils/mqtt_client.py`) are already used, keep using them.

### 1.1 Add global queue and constants

Place near other SSE/MQTT globals:

```python
# --- Soft-bio SSE/MQTT globals ---
import queue
SOFTBIO_TOPIC = "softbio/prediction"
_softbio_q = queue.Queue(maxsize=1000)
```

### 1.2 Subscribe and register callback

Where other topics are subscribed:

```python
def _on_softbio_message(client, userdata, msg):
    try:
        payload = msg.payload.decode("utf-8")
        _softbio_q.put_nowait(payload)  # enqueue raw JSON string
    except queue.Full:
        # Optional: log and drop
        pass

mqtt_client.message_callback_add(SOFTBIO_TOPIC, _on_softbio_message)
mqtt_client.subscribe(SOFTBIO_TOPIC, qos=0)
```

> If you use a different variable than `mqtt_client` for the Paho client, use that. If subscriptions are centralized, add the above in that section instead.

### 1.3 Add the SSE route

Match your existing SSE route style (headers, keepalive). Minimal version:

```python
from flask import Response, stream_with_context

@app.route("/api/softbio-stream")
def softbio_stream():
    @stream_with_context
    def gen():
        # Optional: initial comment for proxies
        yield ": softbio stream open\n\n"
        while True:
            data = _softbio_q.get()  # blocks
            # Name the SSE event for frontend filtering
            yield f"event: softbio:prediction\ndata: {data}\n\n"
    return Response(gen(), mimetype="text/event-stream")
```

**Acceptance:** Starting the server should expose `GET /api/softbio-stream` as a long-lived SSE connection, emitting events named `softbio:prediction` with JSON payloads produced by the predictor.

---

## 2) Frontend: ensure the panel listens to the new route

**File:** `web_working/src/components/SoftBioPanel.tsx`

Confirm the SSE URL is **`/api/softbio-stream`** and event name is **`softbio:prediction`**:

```ts
const [url] = useState<string>("/api/softbio-stream");
es.addEventListener("softbio:prediction", onMsg as any);
```

Mount the panel on a dashboard page (example):

```tsx
// e.g., web_working/src/pages/Dashboard.tsx
import SoftBioPanel from "@/components/SoftBioPanel";
// ...
<SoftBioPanel />
```

**Acceptance:** The panel renders; when someone walks, values update after ≥3 steps.

---

## 3) Runtime commands (for reference)

In separate terminals from `web_working/`:

```bash
# A) Flask SSE bridge
python server.py

# B) Soft-bio predictor (MQTT → softbio/prediction)
python -m softbio.predictor --config softbio/config/softbio.yaml --host <broker> --port 1883

# C) Frontend dev server
npm run dev
```

**Acceptance:** Hitting `http://localhost:<port>/api/softbio-stream` shows a hanging connection. Walking across the mat triggers SSE events. The UI shows gender p, height ± CI, and age bin.

---

## 4) Quality & safety

- Emit prediction **only** when ≥3 steps are present; otherwise, abstain. (The stub already sets quality flags.)
- Do not persist PII; track IDs should be synthetic and ephemeral.
- Keep failure isolated—if soft-bio fails, it must not disrupt existing `/api/grid-stream` or `/api/metrics-stream` routes.

---

## 5) Definition of Done (checklist)

- [ ] `softbio` package installed under `web_working/` and importable (`python -c "import softbio; print('ok')"`) runs from `web_working/`.
- [ ] `server.py` subscribes to `softbio/prediction` and exposes `/api/softbio-stream` (SSE) with event `softbio:prediction`.
- [ ] Frontend panel connected to `/api/softbio-stream` and displays live attributes.
- [ ] Running the three processes results in a working demo on real or simulated frames.
- [ ] Existing fall/PT features unaffected.
- [ ] All new code follows the repo’s logging/error/CORS/session style.

---

## 6) Notes for future (do not implement now)

- Swap baseline for ONNX/Keras model keeping the same output schema.
- Add a “quality” badge and an “insufficient steps” placeholder in the panel.
- Optional: `/health/softbio` route to expose model status for ops.
