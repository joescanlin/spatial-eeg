from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class SessionCreate(BaseModel):
    patient_id: int
    activity: str = Field(..., pattern="^(gait|balance|stsit|mixed|walking|navigation|obstacle_course|free_exploration)$")
    trial_number: Optional[int] = None  # Trial number for research sessions
    flooring_pattern: Optional[str] = Field(None, max_length=200)  # Flooring condition for this trial
    session_notes: Optional[str] = Field(None, max_length=5000)
    selected_metrics: Optional[List[str]] = None
    environmental_notes: Optional[str] = Field(None, max_length=2000)  # Lab conditions

class SessionOut(BaseModel):
    id: int
    patient_id: int
    activity: str
    trial_number: Optional[int] = None
    flooring_pattern: Optional[str] = None
    start_ts: datetime
    end_ts: Optional[datetime] = None
    session_notes: Optional[str] = None
    selected_metrics: Optional[List[str]] = None
    environmental_notes: Optional[str] = None

    # EEG Integration
    eeg_session_id: Optional[str] = None
    eeg_avg_focus: Optional[float] = None
    eeg_avg_stress: Optional[float] = None
    eeg_avg_attention: Optional[float] = None
    eeg_avg_cognitive_load: Optional[float] = None
    eeg_contact_quality: Optional[Dict[str, Any]] = None
    eeg_band_power_summary: Optional[Dict[str, Any]] = None

    ai_summary: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SessionUpdate(BaseModel):
    end_ts: Optional[datetime] = None
    trial_number: Optional[int] = None
    flooring_pattern: Optional[str] = Field(None, max_length=200)
    session_notes: Optional[str] = Field(None, max_length=5000)
    selected_metrics: Optional[List[str]] = None
    environmental_notes: Optional[str] = Field(None, max_length=2000)

    # EEG Integration
    eeg_session_id: Optional[str] = None
    eeg_avg_focus: Optional[float] = None
    eeg_avg_stress: Optional[float] = None
    eeg_avg_attention: Optional[float] = None
    eeg_avg_cognitive_load: Optional[float] = None
    eeg_contact_quality: Optional[Dict[str, Any]] = None
    eeg_band_power_summary: Optional[Dict[str, Any]] = None

    ai_summary: Optional[str] = None

class SessionMetricsBulkCreate(BaseModel):
    """Schema for bulk creating session metrics"""
    session_id: int
    metrics: List[Dict[str, Any]] 