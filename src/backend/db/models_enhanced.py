from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, ForeignKey, JSON, Text, Numeric, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from src.utils.config import get_settings

Base = declarative_base()
settings = get_settings()

# Enhanced PT Patient model with all required fields
class PTPatient(Base):
    __tablename__ = "pt_patients"
    
    id = Column(Integer, primary_key=True)
    clinic_id = Column(Integer, ForeignKey("pt_clinics.id"))
    
    # Basic Info
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    
    # New required fields
    gender = Column(String(10))  # 'Male', 'Female', 'Other', 'Prefer not to say'
    date_of_birth = Column(Date)  # For calculating age
    
    # Medical Info
    height_cm = Column(Float)
    dx_icd10 = Column(String)  # Primary diagnosis code
    notes = Column(Text)  # Open notes section for additional patient notes
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    clinic = relationship("PTClinic", back_populates="patients")
    sessions = relationship("PTSession", back_populates="patient")

class PTSession(Base):
    __tablename__ = "pt_sessions"
    
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("pt_patients.id"))
    
    # Session Info
    activity = Column(String)   # gait, balance, stsit, mixed
    start_ts = Column(DateTime)
    end_ts = Column(DateTime, nullable=True)
    
    # Session Notes and Metadata
    session_notes = Column(Text)  # PT notes during session
    selected_metrics = Column(JSON)  # Array of selected metric IDs
    
    # AI Summary (for future AI integration)
    ai_summary = Column(Text, nullable=True)  # AI-generated session summary
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    patient = relationship("PTPatient", back_populates="sessions")
    metrics = relationship("PTMetricSample", back_populates="session", cascade="all,delete")

class PTMetricSample(Base):
    __tablename__ = "pt_metric_samples"
    
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("pt_sessions.id"))
    ts = Column(DateTime, index=True)
    
    # Core Gait Metrics
    cadence_spm = Column(Float)  # Steps per minute
    stride_len_in = Column(Float)  # Stride length in inches
    cadence_cv_pct = Column(Float)  # Cadence coefficient of variation
    symmetry_idx_pct = Column(Float)  # Step length symmetry index
    dbl_support_pct = Column(Float)  # Double support percentage
    
    # Stance Time Metrics (NEW)
    left_stance_time_ms = Column(Float)  # Left foot stance time
    right_stance_time_ms = Column(Float)  # Right foot stance time
    stance_time_asymmetry_pct = Column(Float)  # Stance time asymmetry
    
    # Step Length Metrics (NEW)
    left_step_length_cm = Column(Float)  # Left step length
    right_step_length_cm = Column(Float)  # Right step length
    step_length_symmetry_pct = Column(Float)  # Step length symmetry percentage
    
    # Gait Variability (NEW)
    gait_variability_cv_pct = Column(Float)  # Gait variability coefficient of variation
    
    # Balance Metrics
    sway_path_cm = Column(Float)
    sway_vel_cm_s = Column(Float)
    sway_area_cm2 = Column(Float)
    
    # NEW: Enhanced Balance Metrics
    cop_area_cm2 = Column(Float)  # Center of pressure area
    stability_score = Column(Float)  # Overall stability score (0-100)
    weight_shift_quality = Column(Float)  # Weight shift quality score
    
    # Load Distribution
    left_pct = Column(Float)
    right_pct = Column(Float)
    ant_pct = Column(Float)  # Anterior percentage
    post_pct = Column(Float)  # Posterior percentage
    active_area_pct = Column(Float)
    
    # Turn Analysis
    turn_count = Column(Integer)
    avg_turn_angle_deg = Column(Float)
    
    # Sit-to-Stand
    sts_reps = Column(Integer)
    sts_avg_time_s = Column(Float)
    
    # Exercise Metrics
    exercise_completion_pct = Column(Float)  # Exercise completion percentage
    range_of_motion_deg = Column(Float)  # Range of motion in degrees
    
    # Metric Status Flags (for thresholding)
    metric_status = Column(JSON)  # JSON object with status for each metric
    
    # Relationships
    session = relationship("PTSession", back_populates="metrics")

class PTClinic(Base):
    __tablename__ = "pt_clinics"
    
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, index=True)
    area_ft2 = Column(Float)
    sub_rate = Column(Float, default=settings.SUB_RATE_PER_FT2)
    
    # Relationships
    patients = relationship("PTPatient", back_populates="clinic")