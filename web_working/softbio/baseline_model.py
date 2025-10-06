from __future__ import annotations
import math
from typing import Dict, Tuple

from .types import ActorFeatures, SoftBioPrediction

def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))

class SoftBioBaseline:
    """Zero-training baseline model.

    Uses:
      - Height from stride/step constants (configurable).
      - Gender via logistic over normalized step length, cadence, step width, ds%%.
      - Age via rule-based binning on ds%% and speed.
    """
    def __init__(self, cfg: Dict):
        self.cfg = cfg
        self.k_stride = float(cfg['baseline']['k_stride_height'])
        self.k_step   = float(cfg['baseline']['k_step_height'])
        self.age_bins = cfg['baseline']['age_bins']
        self.gender_w = cfg['baseline']['gender_logistic']

    def predict(self, af: ActorFeatures) -> SoftBioPrediction:
        # --- Height ---
        # Prefer stride, fallback step
        stride_len_m = max((s.stride_len_m for s in af.steps), default=0.0)
        step_len_m   = max((s.step_len_m for s in af.steps), default=0.0)
        if stride_len_m > 0:
            height_m = stride_len_m / self.k_stride
        elif step_len_m > 0:
            height_m = step_len_m / self.k_step
        else:
            height_m = 1.70  # neutral default
        # crude CI from variability
        sd_factor = max(0.03, min(0.12, af.step_len_cv * 0.5))
        height_cm = height_m * 100.0
        h_ci = (height_cm*(1.0 - sd_factor), height_cm*(1.0 + sd_factor))

        # Pull a few aggregate features
        ds_pct = sum(s.ds_pct for s in af.steps) / max(1, len(af.steps))
        step_width_m = sum(s.step_width_m for s in af.steps) / max(1, len(af.steps))
        norm_step_len = (step_len_m / (height_m+1e-6))

        # --- Gender (prob male) ---
        # Sensor grid calibrated normalization factors
        cadence_norm = af.cadence_spm / 130.0  # Higher reference for sensor grid walking
        width_norm = step_width_m / 0.10
        ds_norm = ds_pct / 20.0

        z = (
            float(self.gender_w['bias'])
            + float(self.gender_w['w_norm_step_len']) * norm_step_len
            + float(self.gender_w['w_cadence']) * cadence_norm    # Research: 110 spm ref
            + float(self.gender_w['w_step_width']) * width_norm     # Research: 10cm ref
            + float(self.gender_w['w_ds_pct']) * ds_norm              # Research: 20% ref
        )
        p_male = _sigmoid(z)
        gender_value = "male" if p_male >= 0.5 else "female"

        # Debug: Log actual feature values for analysis
        import logging
        logging.info(f"DEBUG - Gender prediction for {af.track_id}:")
        logging.info(f"  Raw features: cadence={af.cadence_spm:.1f}, step_width={step_width_m:.3f}m, ds_pct={ds_pct:.1f}%, norm_step_len={norm_step_len:.3f}")
        logging.info(f"  Normalized: cadence={cadence_norm:.3f}, width={width_norm:.3f}, ds={ds_norm:.3f}")
        logging.info(f"  Weights: step={self.gender_w['w_norm_step_len']}, cadence={self.gender_w['w_cadence']}, width={self.gender_w['w_step_width']}, ds={self.gender_w['w_ds_pct']}")
        logging.info(f"  Logistic z={z:.3f}, p_male={p_male:.3f} -> {gender_value}")
        logging.info(f"  Steps used: {len(af.steps)}, height={height_cm:.1f}cm")

        # --- Age bin ---
        age_bin = "adult"
        age_range = (18, 45)
        for b in self.age_bins:
            if ds_pct <= b['ds_pct_max'] and af.speed_mps >= b['speed_mps_min']:
                age_bin = b['name']
                age_range = tuple(b.get('years', [18,45]))  # type: ignore
                break
        # simple confidence: more steps + lower variability
        conf = max(0.2, min(0.95, (len(af.steps)/8.0) * (1.0 - min(0.6, af.step_cv))))

        quality = {
            "n_steps": len(af.steps),
            "flags": [f for f in [
                "low_steps" if len(af.steps) < 3 else None,
                "high_variability" if af.step_cv > 0.25 else None,
            ] if f]
        }

        return SoftBioPrediction(
            height_cm=height_cm,
            height_ci_cm=h_ci,
            gender_value=gender_value,
            p_male=p_male,
            age_bin=age_bin,
            age_range_years=age_range,   # type: ignore
            confidence=conf,
            quality=quality
        )
