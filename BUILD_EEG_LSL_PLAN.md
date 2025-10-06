What we’re adding
	1.	EEG LSL inlet (reads raw EEG from EmotivPRO LSL outlet).
	2.	Unified session writer (writes EEG + floor events to one artifact).
	3.	SSE payload update + simple EEG panel (live trace next to path viz).

Minimal changes, by file

0) Dependencies
	•	Python: pylsl, pyarrow (Parquet), pandas

pip install pylsl==1.16.2 pyarrow pandas
# also add to your requirements.txt

1) New config (create web_working/config.yaml entries)
eeg:
  enabled: true
  stream_name: EEG            # EmotivPRO default outlet name
  max_hz: 32                  # downsample target for UI
  status_log_sec: 10
  channel_labels: ["AF3","T7","Pz","T8","AF4"]   # Insight default; adjust if needed
session_export:
  enabled: true
  dir: "./session_exports"
  format: "parquet"           # fallback "csv"

  
2) New module: src/utils/lsl_client.py

A minimal, thread-safe LSL reader that buffers recent samples and supports snapshot (for UI) and drain (for writer).

# src/utils/lsl_client.py
from typing import List, Tuple, Optional
from pylsl import StreamInlet, resolve_byprop, TimeoutError
from collections import deque
import threading, time

class LSLReader:
    def __init__(self, stream_name: str = "EEG", max_buffer_sec: float = 10.0):
        self.stream_name = stream_name
        self.inlet: Optional[StreamInlet] = None
        self.buf = deque()  # list of (t_epoch, [ch...])
        self.lock = threading.Lock()
        self.running = False
        self.max_buffer_sec = max_buffer_sec

    def start(self):
        if self.running: return
        streams = resolve_byprop("name", self.stream_name, timeout=5)
        if not streams:
            raise RuntimeError(f"LSL stream '{self.stream_name}' not found")
        self.inlet = StreamInlet(streams[0], max_buflen=self.max_buffer_sec)
        self.running = True
        threading.Thread(target=self._loop, daemon=True).start()

    def _loop(self):
        while self.running:
            try:
                chunk, ts = self.inlet.pull_chunk(timeout=0.05)
                if chunk and ts:
                    now = time.time()
                    with self.lock:
                        for i, row in enumerate(chunk):
                            self.buf.append((ts[i], row))
                        # trim buffer
                        cutoff = now - self.max_buffer_sec
                        while self.buf and self.buf[0][0] < cutoff:
                            self.buf.popleft()
            except TimeoutError:
                pass
            except Exception:
                time.sleep(0.1)

    def stop(self):
        self.running = False

    def snapshot_latest(self, n: int = 32) -> List[Tuple[float, List[float]]]:
        """Return up to n most recent samples (for UI)."""
        with self.lock:
            return list(self.buf)[-n:]

    def drain_since(self, t_min: float) -> List[Tuple[float, List[float]]]:
        """Pop and return samples with ts >= t_min (for writer)."""
        out = []
        with self.lock:
            while self.buf and self.buf[0][0] < t_min:
                self.buf.popleft()
            while self.buf:
                out.append(self.buf.popleft())
        return out

3) New module: src/utils/session_writer.py

Writes a single Parquet (or CSV) containing both EEG and floor events with a shared schema.
# src/utils/session_writer.py
from pathlib import Path
from typing import List, Dict, Any, Optional
import time, json
import pandas as pd

class SessionWriter:
    """
    Unified writer for EEG + floor frames.
    Schema (long format):
      t_epoch (float), src (str: "EEG"|"FLOOR"), session_id (str),
      ch (int, optional), val (float, optional),  # for EEG rows
      x (float, optional), y (float, optional),   # for floor rows
      payload (str, optional)                     # JSON dump of original
    """
    def __init__(self, session_id: str, out_dir: str, fmt: str = "parquet"):
        self.session_id = session_id
        self.out_dir = Path(out_dir); self.out_dir.mkdir(parents=True, exist_ok=True)
        self.fmt = fmt
        self.rows: List[Dict[str, Any]] = []
        self.meta: Dict[str, Any] = {"session_id": session_id, "started_at": time.time()}

    def add_floor_frame(self, t_epoch: float, xy: Optional[Dict[str, float]], raw: Dict[str, Any]):
        row = {"t_epoch": t_epoch, "src": "FLOOR", "session_id": self.session_id,
               "x": xy.get("x") if xy else None, "y": xy.get("y") if xy else None,
               "payload": json.dumps(raw, ensure_ascii=False)}
        self.rows.append(row)

    def add_eeg_chunk(self, samples: List, channel_labels: List[str]):
        # samples: List[(t_epoch, [ch...])]
        for t, vec in samples:
            for ch_idx, val in enumerate(vec):
                self.rows.append({
                    "t_epoch": float(t), "src": "EEG", "session_id": self.session_id,
                    "ch": ch_idx, "val": float(val)
                })
        self.meta["eeg_channels"] = channel_labels

    def finalize(self) -> str:
        df = pd.DataFrame(self.rows)
        ts = int(time.time())
        base = f"{self.session_id}_{ts}"
        out = self.out_dir / f"{base}.{ 'parquet' if self.fmt=='parquet' else 'csv'}"
        if self.fmt == "parquet":
            df.to_parquet(out, index=False)
        else:
            df.to_csv(out, index=False)
        # write meta sidecar
        with open(self.out_dir / f"{base}.meta.json", "w") as f:
            json.dump(self.meta, f, indent=2)
        return str(out)

4) Modify web_working/server.py

Hook LSL in, enrich SSE payloads with downsampled EEG, and push both streams to SessionWriter.

Imports (top of file)

# web_working/server.py (add)
import time
from threading import Lock
from src.utils.lsl_client import LSLReader
from src.utils.session_writer import SessionWriter
import yaml, os

Init (near existing init / after MQTT setup)

# Load config
CFG = {}
cfg_path = os.path.join(os.path.dirname(__file__), "config.yaml")
if os.path.exists(cfg_path):
    CFG = yaml.safe_load(open(cfg_path))
EEG_CFG = CFG.get("eeg", {"enabled": False})
EXP_CFG = CFG.get("session_export", {"enabled": False, "dir": "./session_exports", "format":"parquet"})

# EEG
eeg_reader = None
eeg_lock = Lock()
if EEG_CFG.get("enabled"):
    try:
        eeg_reader = LSLReader(stream_name=EEG_CFG.get("stream_name","EEG"))
        eeg_reader.start()
        print("[EEG] LSL inlet started")
    except Exception as e:
        print(f"[EEG] LSL not available: {e}")
        eeg_reader = None

# Session writer (created per active session)
session_writer = None
active_session_id = None

Session start/stop hooks
(If you already have HTTP routes for sessions, call these from there. Otherwise, minimally detect from your existing sessions.py flow.)
def session_start(session_id: str):
    global session_writer, active_session_id
    active_session_id = session_id
    if EXP_CFG.get("enabled"):
        session_writer = SessionWriter(session_id, EXP_CFG["dir"], EXP_CFG.get("format","parquet"))
        print(f"[SESSION] writer initialized for {session_id}")

def session_stop():
    global session_writer, active_session_id
    if session_writer:
        out = session_writer.finalize()
        print(f"[SESSION] export complete → {out}")
        session_writer = None
    active_session_id = None

MQTT → on_message() enrichment
Add EEG snapshot for UI and forward both streams to writer.

def on_message(client, userdata, msg):
    global session_writer, active_session_id
    t_now = time.time()

    # Existing: parse floor frame
    payload = parse_floor_payload(msg.topic, msg.payload)  # your existing util
    xy = payload.get("xy") if isinstance(payload, dict) else None

    # UI EEG snapshot (downsampled)
    eeg_ui = None
    if eeg_reader:
        samples = eeg_reader.snapshot_latest(n=EEG_CFG.get("max_hz", 32))
        # keep only value by channel for last sample (very light for UI)
        if samples:
            t_last, vec = samples[-1]
            eeg_ui = {"t_epoch": t_last, "vals": vec, "labels": EEG_CFG.get("channel_labels", [])}

    # Push combined event to SSE queue (add `eeg` field)
    grid_updates.put({
        "t_epoch": t_now,
        "floor": payload,
        "eeg": eeg_ui
    })

    # Write to session file
    if session_writer and active_session_id:
        # floor row
        session_writer.add_floor_frame(t_now, xy, payload)
        # drain EEG since last write (optional: tighter sync)
        if eeg_reader:
            drained = eeg_reader.drain_since(t_now - 1.0)  # adjust window if needed
            if drained:
                session_writer.add_eeg_chunk(drained, EEG_CFG.get("channel_labels", []))

(Optional) EEG status endpoint
@app.route("/api/eeg/status")
def eeg_status():
    ok = bool(eeg_reader and eeg_reader.running)
    return {"ok": ok, "stream": EEG_CFG.get("stream_name","EEG")}

5) SSE payload schema (UI contract)

SSE JSON (/api/grid-stream) now looks like:
{
  "t_epoch": 1732900000.123,
  "floor": { "xy": {"x": 1.23, "y": 4.56}, "...": "..." },
  "eeg": {
    "t_epoch": 1732900000.115,
    "vals": [3.1, 2.8, 1.4, 0.9, 2.2],
    "labels": ["AF3","T7","Pz","T8","AF4"]
  }
}
The UI can render a rolling strip-chart using eeg.vals and keep a small ring buffer on the client.

6) Frontend changes
	•	Update web_working/src/hooks/useDataStream.ts (or wherever you parse SSE) to read event.eeg and expose it.
	•	New component web_working/src/components/EEGPanel.tsx (minimal example):
import React, { useRef, useEffect } from "react";

export default function EEGPanel({ sample }: { sample?: { vals: number[], labels: string[] } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current || !sample) return;
    const ctx = canvasRef.current.getContext("2d"); if (!ctx) return;
    const W = canvasRef.current.width, H = canvasRef.current.height;
    ctx.clearRect(0,0,W,H);
    // Simple bar render
    const vals = sample.vals || [];
    const max = Math.max(1, ...vals.map(v => Math.abs(v)));
    const w = W / Math.max(1, vals.length);
    vals.forEach((v,i) => {
      const h = (Math.abs(v)/max) * (H-10);
      ctx.fillRect(i*w+4, H-h-4, w-8, h);
    });
  }, [sample]);
  return <canvas ref={canvasRef} width={300} height={80} style={{ width:"100%", height:80 }} />;
}

	•	Place EEGPanel next to your path viz, fed by the latest SSE eeg sample.

7) Session export – where files appear
	•	Directory: ./session_exports/
	•	Files:
	•	SESSIONID_<unix>.parquet (or .csv) – long format rows for EEG and floor.
	•	SESSIONID_<unix>.meta.json – channel labels and session metadata.

9) Smoke tests
	•	With EmotivPRO running and LSL outlet enabled:
	•	curl http://localhost:5000/api/eeg/status → {"ok": true, ...}
	•	Open the UI; confirm EEG panel updates while floor frames stream.
	•	Start/stop a session; verify files appear in ./session_exports.

Notes & options
	•	Tighter sync: If you need tighter alignment, replace the simple drain_since() window with a small ring buffer keyed by time and match nearest timestamps during add_floor_frame.
	•	Performance: If server.py gets busy, move the writer to a small background thread/queue to decouple disk I/O from the SSE loop.
	•	Channels: Update channel_labels in config.yaml if your Insight reports a different ordering.