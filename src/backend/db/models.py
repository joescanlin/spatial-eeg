from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, ForeignKey, JSON, Text, Numeric
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
    first_name = Column(String)
    last_name = Column(String)
    height_cm = Column(Float)
    dx_icd10 = Column(String)
    
    # Relationships
    clinic = relationship("PTClinic", back_populates="patients")
    sessions = relationship("PTSession", back_populates="patient")

class PTSession(Base):
    __tablename__ = "pt_sessions"
    
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("pt_patients.id"))
    activity = Column(String)   # gait, balance, stsit, mixed
    start_ts = Column(DateTime)
    end_ts = Column(DateTime, nullable=True)
    
    # Relationships
    patient = relationship("PTPatient", back_populates="sessions")
    metrics = relationship("PTMetricSample", back_populates="session", cascade="all,delete")

class PTMetricSample(Base):
    __tablename__ = "pt_metric_samples"
    
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("pt_sessions.id"))
    ts = Column(DateTime, index=True)
    cadence_spm = Column(Float)
    stride_len_in = Column(Float)
    cadence_cv_pct = Column(Float)
    symmetry_idx_pct = Column(Float)
    dbl_support_pct = Column(Float)
    turn_count = Column(Integer)
    avg_turn_angle_deg = Column(Float)
    sway_path_cm = Column(Float)
    sway_vel_cm_s = Column(Float)
    sway_area_cm2 = Column(Float)
    left_pct = Column(Float)
    right_pct = Column(Float)
    ant_pct = Column(Float)
    post_pct = Column(Float)
    active_area_pct = Column(Float)
    sts_reps = Column(Integer)
    sts_avg_time_s = Column(Float)
    
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