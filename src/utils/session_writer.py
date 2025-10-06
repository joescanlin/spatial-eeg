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