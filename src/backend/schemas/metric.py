from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class MetricCreate(BaseModel):
    session_id: int
    ts: datetime
    
    # Core Gait Metrics
    cadence_spm: Optional[float] = Field(None, ge=0, le=300)
    stride_len_in: Optional[float] = Field(None, ge=0, le=120)
    cadence_cv_pct: Optional[float] = Field(None, ge=0, le=100)
    symmetry_idx_pct: Optional[float] = Field(None, ge=0, le=100)
    dbl_support_pct: Optional[float] = Field(None, ge=0, le=100)
    
    # NEW: Stance Time Metrics
    left_stance_time_ms: Optional[float] = Field(None, ge=0, le=5000)
    right_stance_time_ms: Optional[float] = Field(None, ge=0, le=5000)
    stance_time_asymmetry_pct: Optional[float] = Field(None, ge=0, le=100)
    
    # NEW: Step Length Metrics
    left_step_length_cm: Optional[float] = Field(None, ge=0, le=200)
    right_step_length_cm: Optional[float] = Field(None, ge=0, le=200)
    step_length_symmetry_pct: Optional[float] = Field(None, ge=0, le=100)
    
    # NEW: Gait Variability
    gait_variability_cv_pct: Optional[float] = Field(None, ge=0, le=100)
    
    # Balance Metrics
    sway_path_cm: Optional[float] = Field(None, ge=0)
    sway_vel_cm_s: Optional[float] = Field(None, ge=0)
    sway_area_cm2: Optional[float] = Field(None, ge=0)
    
    # NEW: Enhanced Balance Metrics
    cop_area_cm2: Optional[float] = Field(None, ge=0)
    stability_score: Optional[float] = Field(None, ge=0, le=100)
    weight_shift_quality: Optional[float] = Field(None, ge=0, le=100)
    
    # Load Distribution
    left_pct: Optional[float] = Field(None, ge=0, le=100)
    right_pct: Optional[float] = Field(None, ge=0, le=100)
    ant_pct: Optional[float] = Field(None, ge=0, le=100)
    post_pct: Optional[float] = Field(None, ge=0, le=100)
    active_area_pct: Optional[float] = Field(None, ge=0, le=100)
    
    # Turn Analysis
    turn_count: Optional[int] = Field(None, ge=0)
    avg_turn_angle_deg: Optional[float] = Field(None, ge=0, le=360)
    
    # Sit-to-Stand
    sts_reps: Optional[int] = Field(None, ge=0)
    sts_avg_time_s: Optional[float] = Field(None, ge=0)
    
    # NEW: Exercise Metrics
    exercise_completion_pct: Optional[float] = Field(None, ge=0, le=100)
    range_of_motion_deg: Optional[float] = Field(None, ge=0, le=360)
    
    # NEW: Metric Status for AI Analysis
    metric_status: Optional[Dict[str, str]] = None

class MetricOut(MetricCreate):
    id: int
    
    class Config:
        from_attributes = True
        from_attributes = True  # For Pydantic v2 compatibility

class MetricBulkCreate(BaseModel):
    """Schema for bulk creating metrics"""
    metrics: List[MetricCreate]

class MetricAggregated(BaseModel):
    session_id: int
    start_ts: datetime
    end_ts: Optional[datetime] = None
    
    # Aggregated Core Metrics
    avg_cadence_spm: Optional[float] = None
    avg_stride_len_in: Optional[float] = None
    avg_symmetry_idx_pct: Optional[float] = None
    avg_sway_vel_cm_s: Optional[float] = None
    
    # Aggregated NEW Metrics
    avg_stance_time_asymmetry_pct: Optional[float] = None
    avg_step_length_symmetry_pct: Optional[float] = None
    avg_gait_variability_cv_pct: Optional[float] = None
    avg_cop_area_cm2: Optional[float] = None
    avg_stability_score: Optional[float] = None
    
    # Totals
    total_sts_reps: Optional[int] = None
    total_turn_count: Optional[int] = None
    
    # Session Quality Indicators
    data_quality_score: Optional[float] = None  # Overall data quality 0-100
    total_data_points: Optional[int] = None 