from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional

@dataclass
class StepFeature:
    t_start: float
    t_end: float
    step_time_s: float
    stance_time_s: float
    swing_time_s: float
    step_len_m: float
    stride_len_m: float
    step_width_m: float
    ds_pct: float  # double support percentage (approximate)

@dataclass
class ActorFeatures:
    track_id: str
    cadence_spm: float
    speed_mps: float
    step_cv: float                 # coefficient of variation of step times
    step_len_cv: float             # coefficient of variation of step lengths
    path_straightness: float       # 0..1, 1 = perfectly straight
    turning_rate_deg_s: float
    steps: List[StepFeature] = field(default_factory=list)
    meta: Dict = field(default_factory=dict)  # free-form (e.g., latest centroids, flags)

@dataclass
class SoftBioPrediction:
    height_cm: float
    height_ci_cm: Tuple[float, float]
    gender_value: str
    p_male: float
    age_bin: str
    age_range_years: Tuple[int, int]
    confidence: float
    quality: Dict

    def to_dict(self) -> Dict:
        return {
            "height_cm": self.height_cm,
            "height_ci_cm": list(self.height_ci_cm),
            "gender": {"value": self.gender_value, "p_male": self.p_male},
            "age": {
                "bin": self.age_bin,
                "range_years": list(self.age_range_years),
                "confidence": self.confidence,
            },
            "quality": self.quality,
        }
