from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from src.utils.config import get_settings

settings = get_settings()
Base = declarative_base()

class Clinic(Base):
    __tablename__ = "clinics"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, index=True)
    area_ft2 = Column(Float)
    sub_rate = Column(Float, default=settings.SUB_RATE_PER_FT2)
    patients = relationship("Patient", back_populates="clinic")

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True)
    clinic_id = Column(Integer, ForeignKey("clinics.id"))
    first_name = Column(String)
    last_name = Column(String)
    height_cm = Column(Float)
    dx_icd10 = Column(String)
    clinic = relationship("Clinic", back_populates="patients")
    sessions = relationship("Session", back_populates="patient")

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    activity = Column(String)   # gait, balance, stsit, mixed
    start_ts = Column(DateTime)
    end_ts = Column(DateTime, nullable=True)
    patient = relationship("Patient", back_populates="sessions")
    metrics = relationship("MetricSample", back_populates="session", cascade="all,delete")

class MetricSample(Base):
    __tablename__ = "metric_samples"
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
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
    session = relationship("Session", back_populates="metrics")

class BillingInvoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True)
    clinic_id = Column(Integer, ForeignKey("clinics.id"))
    period_start = Column(DateTime)
    period_end = Column(DateTime)
    billable_area = Column(Float)
    amount_due = Column(Float)
    paid = Column(Boolean, default=False) 