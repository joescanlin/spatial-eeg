
# Soft Biometrics via Gait — Zero-Data Baseline (Workspace Duplication Guide)

**Purpose:** Duplicate the existing fall-detection workspace and spin up a soft-biometrics (height, age, gender) pipeline using the **same MQTT → SSE → Vite** stack. This version ships a **zero-training baseline** (rule-based + lightweight model with priors) so we can demo live **today** and later drop in a trained model without changing wiring.

---

## TL;DR (for Cursor / Claude Agent)

1. **Clone & Rename**
   - Duplicate the repo to `sfs-softbio`.
   - Keep the existing **MQTT broker config** and **SSE server**.
   - Copy `.env` (or `config.yaml`) values from fall detector; only adjust new topic names below.

2. **Add New MQTT Topics**
   - **Input (unchanged):** `controller/networkx/frame/rft`
   - **Output (new):**
     - `softbio/prediction` (one object per tracked actor)
     - `softbio/debug/features` (optional per-step features for debug overlay)

3. **Add New Files (backend)**
   - `src/softbio/config/softbio.yaml` (defaults & coefficients)
   - `src/softbio/feature_extractor.py` (gait features from 4" boolean grid @ 10 Hz)
   - `src/softbio/baseline_model.py` (no-training estimator; pluggable ONNX later)
   - `src/softbio/predictor.py` (MQTT in → features → predictions → MQTT out)
   - `src/softbio/mqtt_bridge.py` (SSE bridge if not already generic)

4. **Front-end**
   - Reuse the **grid renderer**.
   - Subscribe to SSE events that mirror `softbio/prediction`.
   - Add a right-side card: **Gender (p), Height (cm ± CI), Age (bin + CI)**.
   - Add a **confidence/quality pill** and a **debug toggle** to show features.

5. **Run**
   - `python -m src.softbio.predictor` (publishes `softbio/prediction`)
   - Start your existing SSE server and Vite app.
   - Walk across the mat; watch live attributes update.

---

## 1) Repo Duplication & Config

- Duplicate the current working app (fall-detection version) → `sfs-softbio`.
- Keep broker/env the same; add a new section in `config/config.yaml` or `.env`:

```yaml
softbio:
  input_topic: controller/networkx/frame/rft
  output_topic: softbio/prediction
  debug_topic: softbio/debug/features
  # Grid geometry (fallbacks if not provided by frames)
  grid:
    width: 12
    height: 15
    cell_meters: 0.1016   # 4 inches
  # Tracking and step detection
  tracking:
    max_assign_dist_cells: 5
    min_stance_frames: 3      # require >= 300ms stance @10Hz
    min_swing_frames: 2
    max_gap_frames: 5
  # Baseline coefficients (tunable; literature-informed defaults)
  baseline:
    # Height from stride (two steps). stride_m ≈ k_stride_height * height_m  -> height = stride / k
    k_stride_height: 0.83
    # Step-based fallback: step_m ≈ k_step_height * height_m
    k_step_height: 0.415
    # Age via double-support and variability thresholds (bins)
    age_bins:
      - {name: "child",   ds_pct_max: 22, speed_mps_min: 0.9}
      - {name: "adult",   ds_pct_max: 30, speed_mps_min: 0.8}
      - {name: "older",   ds_pct_max: 40, speed_mps_min: 0.6}
      - {name: "elderly", ds_pct_max: 100, speed_mps_min: 0.0}
    # Gender logistic (weights are placeholders; tune later)
    gender_logistic:
      bias: 0.0
      w_norm_step_len:  1.0   # + longer normalized steps -> more likely male
      w_cadence:       -0.7   # + higher cadence -> more likely female
      w_step_width:     0.4   # + wider step -> more likely male
      w_ds_pct:        -0.5   # + higher double support -> more likely female
```

> **Note:** Coefficients are **defaults** for demo purposes. They are **not final**; we will calibrate later with in-house data or pretrained weights.

---

## 2) Feature Extraction (4\" boolean grid @ 10 Hz)

`src/softbio/feature_extractor.py`

Responsibilities:

- **Blob & centroid per frame** (connected components over 1s and 0s).
- **Track actors** across frames (Hungarian match on centroid distance + overlap).
- **Step segmentation** per actor:
  - Stance: consecutive frames with foot-contact blob present near last known foot location.
  - Swing: gap frames for that foot.
  - Alternate left/right by spatial separation along walking axis; if uncertain, alternate temporally.
- **Per-step features** (rolling window of ≥6–8 steps preferred; work with ≥3):
  - timings: step_time, stance_time, swing_time, cadence
  - spatial: step_len_m, stride_len_m (same-foot), step_width_m
  - speed_mps = mean_step_len_m * cadence / 120
  - regularity: CV of step_time and step_len; path straightness; turning rate
  - double_support_pct (approx from overlap between opposite-foot stances)

**Skeleton:**

```python
class GaitFeatureExtractor:
    def __init__(self, grid_w, grid_h, cell_m, cfg):
        ...
    def ingest_frame(self, frame_15x12_bool, t):
        # 1) find blobs, centroids
        # 2) assign to existing tracks; create new if needed
        # 3) update foot-contact states; detect step events
        # 4) maintain rolling per-actor feature buffers
        # returns: list[ActorFeatures]
```

Emit to `softbio/debug/features` (optional) for overlay.

---

## 3) Zero-Training Baseline Model

`src/softbio/baseline_model.py`

A small, interpretable estimator that **does not require training data**:

- **Height (cm):**
  - Prefer **stride-based**: `height_m = stride_len_m / k_stride_height`
  - Fallback **step-based**: `height_m = step_len_m / k_step_height`
  - CI heuristic from variability (± 1σ mapped to cm).

- **Gender (probability male):**
  - Features: normalized step length (step_len / estimated height), cadence, step width, double-support %.
  - Logistic `p = sigmoid(b + Σ w_i * x_i)` with weights from config.

- **Age (bin + midpoint years):**
  - Rule-based binning using **double-support %**, **speed**, and **variability**.
  - Optional midpoint years for display (e.g., adult → 30–45 default range).

**Interface:**

```python
class SoftBioBaseline:
    def __init__(self, cfg):
        ...
    def predict(self, actor_features_window) -> dict:
        return {
          "height_cm": 176.4, "height_ci_cm": [170.0, 182.0],
          "gender": {"value": "male", "p_male": 0.73},
          "age": {"bin": "adult", "range_years": [25, 45], "confidence": 0.62},
          "quality": {"n_steps": 6, "flags": []}
        }
```

Later, when we have trained weights (XGBoost/ONNX or Keras), we **swap** this class for a learned model with the same output schema.

---

## 4) Live Predictor (MQTT → Predictions → MQTT)

`src/softbio/predictor.py`

- Subscribe to `controller/networkx/frame/rft` (existing).
- Maintain per-actor buffers via `GaitFeatureExtractor`.
- Every time a new step completes (or every 500 ms), run `SoftBioBaseline.predict(...)`.
- Publish to `softbio/prediction`:

```json
{
  "ts": "2025-09-22T20:12:34.567Z",
  "track_id": "a1",
  "pred": {
    "gender": {"value":"male","p_male":0.73},
    "height_cm": 176.4, "height_ci_cm": [170.0,182.0],
    "age": {"bin":"adult","range_years":[25,45],"confidence":0.62},
    "quality": {"n_steps": 6, "flags": []}
  },
  "features": {
    "cadence_spm": 112, "step_len_m": 0.71, "stride_len_m": 1.42,
    "speed_mps": 1.33, "step_width_m": 0.11, "ds_pct": 24.0
  }
}
```

---

## 5) SSE Bridge & Frontend

**Backend SSE (if needed):** mirror `softbio/prediction` to an SSE route, e.g. `/events/softbio` with event type `softbio:prediction`.

**Frontend (Vite/React):**
- Reuse the grid visualizer component.
- Add a `SoftBioPanel` card that listens for `softbio:prediction` and displays:
  - Gender with probability bar
  - Height (cm ± CI)
  - Age bin + range
  - Step cadence, speed
  - Quality flags (e.g., “low steps”, “turning”, “crossing”)
- Add a “Debug” toggle to subscribe to `softbio/debug/features` and draw step vectors / footprints.

---

## 6) Commands (Dev & Demo)

```bash
# 0) Install deps (same as fall detector + paho-mqtt)
pip install numpy paho-mqtt scikit-learn

# 1) Start predictor (MQTT → predictions)
python -m src.softbio.predictor --config config/config.yaml

# 2) Run SSE bridge (if separate) & Vite frontend
pnpm dev

# 3) Walk across the mat and watch predictions in the UI
```

---

## 7) Quality, Safety, and Fallbacks

- Emit **quality flags** when fewer than 3 steps, irregular cadence, or turning > 25°/stride.
- If confidence is low, **abstain** (show “insufficient data yet”).
- Do not persist PII; store only aggregate features and synthetic track IDs for demo.

---

## 8) Swapping in a Trained Model (Later)

- Keep the same **features schema**.
- Drop in `src/softbio/onnx_model.py` with an ONNXRuntime session and identical `predict(...)` output.
- Add a toggle in `softbio.yaml`: `use_model: baseline|onnx|keras`.

---

## 9) File Tasks (for Cursor / Claude)

- Create files:
  - `src/softbio/config/softbio.yaml`
  - `src/softbio/feature_extractor.py`
  - `src/softbio/baseline_model.py`
  - `src/softbio/predictor.py`
- Wire new **MQTT → SSE** route (or extend existing).
- Add **SoftBioPanel** component to frontend and subscribe to SSE.
- Add a **/health/softbio** endpoint returning model/feature extractor status.

---

## 10) Demo Script (1-minute)

1. Start predictor + frontend.
2. Subject walks straight line across mat.
3. UI shows: “collecting steps…”, then soft biometrics with updating confidence.
4. Toggle **Debug** to show step vectors and cadence.
5. End with “This runs on our existing stack; training upgrade is a drop-in.”

---

### Appendix: Why this works without training

- Height follows stride/step length strongly; the constants provide a reasonable first-pass estimate subject to calibration.
- Gender differences appear in normalized step length, cadence, step width, and double-support.
- Age influences double-support %, speed, and regularity; binning provides a stable, honest baseline.
- We expose uncertainty and abstain when data is weak.
