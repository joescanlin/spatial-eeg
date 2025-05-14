from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class MetricCreate(BaseModel):
    session_id: int
    ts: datetime
    cadence_spm: Optional[float] = None
    stride_len_in: Optional[float] = None
    cadence_cv_pct: Optional[float] = None
    symmetry_idx_pct: Optional[float] = None
    dbl_support_pct: Optional[float] = None
    turn_count: Optional[int] = None
    avg_turn_angle_deg: Optional[float] = None
    sway_path_cm: Optional[float] = None
    sway_vel_cm_s: Optional[float] = None
    sway_area_cm2: Optional[float] = None
    left_pct: Optional[float] = None
    right_pct: Optional[float] = None
    ant_pct: Optional[float] = None
    post_pct: Optional[float] = None
    active_area_pct: Optional[float] = None
    sts_reps: Optional[int] = None
    sts_avg_time_s: Optional[float] = None

class MetricOut(MetricCreate):
    id: int
    
    class Config:
        orm_mode = True
        from_attributes = True  # For Pydantic v2 compatibility

class MetricAggregated(BaseModel):
    session_id: int
    start_ts: datetime
    end_ts: Optional[datetime] = None
    avg_cadence_spm: Optional[float] = None
    avg_stride_len_in: Optional[float] = None
    avg_symmetry_idx_pct: Optional[float] = None
    avg_sway_vel_cm_s: Optional[float] = None
    total_sts_reps: Optional[int] = None
    total_turn_count: Optional[int] = None 