# Soft Biometrics Model Architecture & Implementation

## **Current Model: Zero-Training Baseline (Rule-Based + Lightweight Logistic)**

This is a **demonstration-ready baseline** that requires **no training data** and provides immediate predictions. It's designed to be replaced later with a trained ML model while keeping the same interface.

## **System Architecture**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            SOFT BIOMETRICS PIPELINE                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────┐
│  15×12 Sensor   │    │  Feature         │    │  Baseline       │    │  Predictions │
│  Grid (4" cells)│───▶│  Extractor       │───▶│  Model          │───▶│  (JSON)      │
│  @ 10 Hz        │    │                  │    │                 │    │              │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────┘
        │                       │                       │                      │
        │                       │                       │                      │
        ▼                       ▼                       ▼                      ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────┐
│ Boolean frames  │    │ • Track people   │    │ • Height: stride│    │ • Gender: %  │
│ [True/False]    │    │ • Detect steps   │    │   relationships │    │ • Height: cm │
│ Raw activations │    │ • Measure gait   │    │ • Gender: gait  │    │ • Age: bin   │
│                 │    │   parameters     │    │   features      │    │ • Quality    │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────┘
```

## **Baseline Model Components**

### **1. Height Estimation (Physics-Based)**
```
Method: Biomechanical Relationships
├── PRIMARY: height_m = stride_length_m / 0.83
├── FALLBACK: height_m = step_length_m / 0.415
└── OUTPUT: height_cm ± confidence_interval
```

**Literature Basis**: Well-established anthropometric ratios
- Stride length ≈ 83% of height for normal walking
- Step length ≈ 41.5% of height
- **No training required** - uses universal biomechanics

### **2. Gender Classification (Logistic Regression)**
```
p_male = sigmoid(bias + Σ(weight_i × feature_i))

Features:
├── normalized_step_length = step_length / estimated_height  (+1.0 → male)
├── cadence_spm                                              (-0.7 → female)
├── step_width_m                                             (+0.4 → male)
└── double_support_pct                                       (-0.5 → female)

Weights: [bias=0.0, w_norm=1.0, w_cad=-0.7, w_width=0.4, w_ds=-0.5]
```

**Rationale**: Gender differences in gait are well-documented
- Males: longer relative steps, wider stance, less double-support time
- Females: higher cadence, narrower steps, more cautious gait patterns

### **3. Age Classification (Rule-Based Binning)**
```
Age Determination Decision Tree:
├── double_support% ≤ 22 AND speed ≥ 0.9 m/s → "child" [6-17 years]
├── double_support% ≤ 30 AND speed ≥ 0.8 m/s → "adult" [18-45 years]
├── double_support% ≤ 40 AND speed ≥ 0.6 m/s → "older" [46-65 years]
└── else                                    → "elderly" [66-90 years]
```

**Physiological Basis**: Age-related gait changes
- Children: Fast, confident walking
- Adults: Optimal gait efficiency
- Older adults: Increased caution, slower speeds
- Elderly: Significant double-support for stability

## **Feature Extraction Pipeline**

```
┌─────────────────────────────────────────────────────────────────┐
│                    GAIT FEATURE EXTRACTOR                       │
└─────────────────────────────────────────────────────────────────┘

Input: 15×12 Boolean Grid @ 10Hz
│
├── STEP 1: Blob Detection
│   └── Find connected components → centroids
│
├── STEP 2: Person Tracking
│   ├── Assign centroids to tracks (Hungarian matching)
│   └── Create new tracks for unknown people
│
├── STEP 3: Step Segmentation
│   ├── Detect stance phases (min 3 frames = 300ms)
│   ├── Alternate left/right foot assignment
│   └── Calculate step timing and distances
│
└── STEP 4: Gait Parameter Calculation
    ├── Temporal: cadence, step_time, stance_time, swing_time
    ├── Spatial: step_length, stride_length, step_width
    ├── Dynamic: speed, double_support_percentage
    └── Variability: coefficient_of_variation (step timing & length)
```

## **Real-Time Processing Flow**

```
Sensor Grid State Machine:

IDLE ──sensor_activation──▶ TRACKING ──no_activity──▶ IDLE
 │                              │                       ▲
 │                              │                       │
 └──────────────────────────────┼───────────────────────┘
                                │
                                ▼
                         ┌─────────────┐
                         │  Per Frame  │
                         │(every 100ms)│
                         └─────────────┘
                                │
                         ┌─────────────┐
                         │ Extract     │◀── frame_boolean[15][12]
                         │ Features    │
                         └─────────────┘
                                │
                         ┌─────────────┐
                         │ Generate    │◀── if (steps ≥ 3 AND
                         │ Prediction  │     time_since_last > 500ms)
                         └─────────────┘
                                │
                         ┌─────────────┐
                         │ Publish     │───▶ MQTT: softbio/prediction
                         │ Results     │
                         └─────────────┘
```

## **Model Strengths & Limitations**

### **✅ Strengths (Current Implementation)**
- **Zero training required** - works immediately
- **Interpretable** - every prediction is explainable
- **Real-time** - sub-second response times
- **Robust** - handles varying walking speeds and patterns
- **Extensible** - easy to swap for trained models later

### **⚠️ Limitations (Baseline Trade-offs)**
- **Fixed coefficients** - not personalized to specific populations
- **Simple tracking** - currently single-person optimized
- **Basic step detection** - uses time-based alternation vs. spatial analysis
- **Limited accuracy** - placeholder weights need calibration

### **🔄 Future ML Upgrade Path**
```
Current: Rule-Based Baseline
    ↓
Collect Training Data
    ↓
Train: XGBoost/Random Forest
    ↓
Deploy: ONNX Runtime Model
    ↓
Same Interface: predict(features) → {gender, height, age}
```

## **Configuration & Tuning**

The model is **entirely configurable** via `softbio.yaml`:

```yaml
baseline:
  k_stride_height: 0.83    # Tunable for population
  k_step_height: 0.415     # Tunable for population

  gender_logistic:         # Trainable weights
    bias: 0.0
    w_norm_step_len: 1.0
    w_cadence: -0.7
    w_step_width: 0.4
    w_ds_pct: -0.5

  age_bins:               # Adjustable thresholds
    - {name: "child", ds_pct_max: 22, speed_mps_min: 0.9}
    - {name: "adult", ds_pct_max: 30, speed_mps_min: 0.8}
    # ... etc
```

This baseline provides **immediate demo capability** while establishing the infrastructure for future ML model deployment with **zero code changes** to the prediction pipeline.