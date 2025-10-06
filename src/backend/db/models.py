from sqlalchemy import Column, String, Integer, Float, DateTime, Date, Boolean, ForeignKey, JSON, Text, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from src.utils.config import get_settings

Base = declarative_base()
settings = get_settings()

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    sensors = relationship("Sensor", back_populates="customer")
    
class Sensor(Base):
    __tablename__ = "sensors"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    serial_number = Column(String, unique=True, nullable=False)
    location = Column(String)
    width_ft = Column(Float, nullable=False)  # Width in feet
    length_ft = Column(Float, nullable=False)  # Length in feet
    customer_id = Column(String, ForeignKey("customers.id"))
    active = Column(Boolean, default=True)
    installed_at = Column(DateTime, default=func.now())
    
    # Relationships
    customer = relationship("Customer", back_populates="sensors")
    events = relationship("Event", back_populates="sensor")
    
class Event(Base):
    __tablename__ = "events"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sensor_id = Column(String, ForeignKey("sensors.id"))
    event_type = Column(String, nullable=False)  # "fall", "gait", "sts", etc.
    timestamp = Column(DateTime, default=func.now())
    confidence = Column(Float)
    data = Column(String)  # JSON string with event details
    
    # Relationships
    sensor = relationship("Sensor", back_populates="events")

class Clinic(Base):
    __tablename__ = "clinics"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    address = Column(String)
    phone = Column(String)
    email = Column(String)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    patients = relationship("Patient", back_populates="clinic")
    invoices = relationship("Invoice", back_populates="clinic")

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    clinic_id = Column(String, ForeignKey("clinics.id"))
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    date_of_birth = Column(DateTime)
    email = Column(String)
    phone = Column(String)
    address = Column(String)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    clinic = relationship("Clinic", back_populates="patients")
    sessions = relationship("Session", back_populates="patient")
    
class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"))
    session_date = Column(DateTime, default=func.now())
    session_type = Column(String)  # e.g., "initial assessment", "follow-up", etc.
    notes = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="sessions")
    metric_samples = relationship("MetricSample", back_populates="session")
    
class MetricSample(Base):
    __tablename__ = "metric_samples"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("sessions.id"))
    metric_type = Column(String, nullable=False)  # e.g., "gait", "balance", "strength"
    value = Column(Float)
    timestamp = Column(DateTime, default=func.now())
    meta_data = Column(JSON)  # Additional data related to the metric
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    session = relationship("Session", back_populates="metric_samples")
    
class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    clinic_id = Column(String, ForeignKey("clinics.id"))
    patient_id = Column(String, ForeignKey("patients.id"))
    invoice_date = Column(DateTime, default=func.now())
    amount = Column(Numeric(10, 2))
    paid = Column(Boolean, default=False)
    payment_date = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    clinic = relationship("Clinic", back_populates="invoices")

# New models with Integer primary keys
class PTClinic(Base):
    __tablename__ = "pt_clinics"
    
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, index=True)
    area_ft2 = Column(Float)
    sub_rate = Column(Float, default=settings.SUB_RATE_PER_FT2)
    
    # Relationships
    patients = relationship("PTPatient", back_populates="clinic")

class PTPatient(Base):
    __tablename__ = "pt_patients"

    id = Column(Integer, primary_key=True)
    clinic_id = Column(Integer, ForeignKey("pt_clinics.id"))

    # Basic Info
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)

    # Demographics
    gender = Column(String(10))  # 'Male', 'Female', 'Other', 'Prefer not to say'
    date_of_birth = Column(DateTime)  # For calculating age
    height_cm = Column(Float)

    # Research Context (replaces PT diagnosis)
    flooring_condition = Column(String)  # e.g., "Pattern A", "Textured Grid", "Smooth"
    cognitive_baseline = Column(JSON)  # Pre-trial baseline: {focus: 75, stress: 30, attention: 80}
    subject_notes = Column(Text)  # General notes about research subject

    # Legacy PT field (kept for backward compatibility with existing data)
    dx_icd10 = Column(String)  # Can be repurposed or left null for research subjects
    notes = Column(Text)  # Alias for subject_notes

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
    activity = Column(String)   # walking, navigation, obstacle_course, free_exploration
    trial_number = Column(Integer)  # Trial number for this subject (1, 2, 3...)
    flooring_pattern = Column(String)  # Specific pattern tested this session
    start_ts = Column(DateTime)
    end_ts = Column(DateTime, nullable=True)

    # Session Notes and Metadata
    session_notes = Column(Text)  # Researcher observations during trial
    selected_metrics = Column(JSON)  # Array of selected metric IDs (spatial + cognitive)
    environmental_notes = Column(Text)  # Lighting, temperature, other conditions

    # EEG Data Integration
    eeg_session_id = Column(String, nullable=True)  # Reference to EEG session (if recorded)
    eeg_avg_focus = Column(Float)  # Average focus level during session (0-100)
    eeg_avg_stress = Column(Float)  # Average stress level (0-100)
    eeg_avg_attention = Column(Float)  # Average attention (0-100)
    eeg_avg_cognitive_load = Column(Float)  # Average cognitive load (0-100)
    eeg_contact_quality = Column(JSON)  # Contact quality summary: {overall: 85, channels: {...}}
    eeg_band_power_summary = Column(JSON)  # Band power averages: {theta: {...}, alpha: {...}, ...}

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

class PTBillingInvoice(Base):
    __tablename__ = "pt_invoices"
    
    id = Column(Integer, primary_key=True)
    clinic_id = Column(Integer, ForeignKey("pt_clinics.id"))
    period_start = Column(DateTime)
    period_end = Column(DateTime)
    billable_area = Column(Float)
    amount_due = Column(Float)
    paid = Column(Boolean, default=False) 