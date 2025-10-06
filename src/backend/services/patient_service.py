"""
Enhanced Patient Service for PT Application
Provides comprehensive patient management with session tracking and metrics aggregation
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, date

from src.backend.db.models import PTPatient, PTSession, PTMetricSample, PTClinic
from src.backend.schemas.patient import PatientCreate, PatientUpdate, PatientOut
from src.backend.schemas.session import SessionCreate, SessionOut
from src.backend.schemas.metric import MetricCreate


class PatientService:
    """Enhanced patient service with comprehensive session and metrics tracking"""
    
    @staticmethod
    async def create_patient(db: AsyncSession, patient_data: PatientCreate) -> PTPatient:
        """Create a new patient with validation"""
        # Verify clinic exists
        clinic_result = await db.execute(select(PTClinic).filter(PTClinic.id == patient_data.clinic_id))
        clinic = clinic_result.scalars().first()
        if not clinic:
            raise ValueError("Clinic not found")
        
        # Create patient
        db_patient = PTPatient(
            clinic_id=patient_data.clinic_id,
            first_name=patient_data.first_name,
            last_name=patient_data.last_name,
            gender=patient_data.gender,
            date_of_birth=patient_data.date_of_birth,
            height_cm=patient_data.height_cm,
            dx_icd10=patient_data.dx_icd10,
            notes=patient_data.notes
        )
        
        db.add(db_patient)
        await db.commit()
        await db.refresh(db_patient)
        
        return db_patient
    
    @staticmethod
    async def get_patients_with_summary(
        db: AsyncSession, 
        clinic_id: Optional[int] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get patients with session count and last visit information"""
        
        # Build base query with session aggregation
        query = select(
            PTPatient,
            func.count(PTSession.id).label('sessions_count'),
            func.max(PTSession.start_ts).label('last_visit')
        ).outerjoin(PTSession).group_by(PTPatient.id)
        
        # Add clinic filter if specified
        if clinic_id is not None:
            query = query.filter(PTPatient.clinic_id == clinic_id)
        
        # Execute query with pagination
        result = await db.execute(query.offset(skip).limit(limit))
        rows = result.all()
        
        # Format results
        patients = []
        for row in rows:
            patient, sessions_count, last_visit = row
            patient_dict = {
                'id': patient.id,
                'clinic_id': patient.clinic_id,
                'first_name': patient.first_name,
                'last_name': patient.last_name,
                'gender': patient.gender,
                'date_of_birth': patient.date_of_birth,
                'height_cm': patient.height_cm,
                'dx_icd10': patient.dx_icd10,
                'notes': patient.notes,
                'created_at': patient.created_at,
                'updated_at': patient.updated_at,
                'sessions_count': sessions_count or 0,
                'last_visit': last_visit.isoformat() if last_visit else None,
            }
            
            # Calculate age if date of birth is available
            if patient.date_of_birth:
                today = date.today()
                age = today.year - patient.date_of_birth.year - (
                    (today.month, today.day) < (patient.date_of_birth.month, patient.date_of_birth.day)
                )
                patient_dict['age'] = age
            else:
                patient_dict['age'] = None
            
            patients.append(patient_dict)
        
        return patients
    
    @staticmethod
    async def get_patient_by_id(db: AsyncSession, patient_id: int) -> Optional[PTPatient]:
        """Get a specific patient by ID"""
        result = await db.execute(select(PTPatient).filter(PTPatient.id == patient_id))
        return result.scalars().first()
    
    @staticmethod
    async def update_patient(
        db: AsyncSession, 
        patient_id: int, 
        patient_data: PatientUpdate
    ) -> Optional[PTPatient]:
        """Update patient information"""
        # Get patient
        result = await db.execute(select(PTPatient).filter(PTPatient.id == patient_id))
        db_patient = result.scalars().first()
        
        if not db_patient:
            return None
        
        # Update fields
        update_data = patient_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_patient, field, value)
        
        await db.commit()
        await db.refresh(db_patient)
        
        return db_patient
    
    @staticmethod
    async def delete_patient(db: AsyncSession, patient_id: int) -> bool:
        """Delete a patient and all associated sessions/metrics"""
        result = await db.execute(select(PTPatient).filter(PTPatient.id == patient_id))
        db_patient = result.scalars().first()
        
        if not db_patient:
            return False
        
        await db.delete(db_patient)
        await db.commit()
        
        return True
    
    @staticmethod
    async def get_patient_sessions(
        db: AsyncSession, 
        patient_id: int,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get sessions for a specific patient with metrics summary"""
        
        # Get sessions with metrics aggregation
        query = select(
            PTSession,
            func.count(PTMetricSample.id).label('metric_count'),
            func.avg(PTMetricSample.cadence_spm).label('avg_cadence'),
            func.avg(PTMetricSample.symmetry_idx_pct).label('avg_symmetry')
        ).outerjoin(PTMetricSample).filter(
            PTSession.patient_id == patient_id
        ).group_by(PTSession.id).order_by(desc(PTSession.start_ts)).limit(limit)
        
        result = await db.execute(query)
        rows = result.all()
        
        sessions = []
        for row in rows:
            session, metric_count, avg_cadence, avg_symmetry = row
            
            # Calculate session duration
            duration_seconds = None
            if session.end_ts and session.start_ts:
                duration = session.end_ts - session.start_ts
                duration_seconds = int(duration.total_seconds())
            
            session_dict = {
                'id': session.id,
                'patient_id': session.patient_id,
                'activity': session.activity,
                'start_ts': session.start_ts,
                'end_ts': session.end_ts,
                'session_notes': session.session_notes,
                'selected_metrics': session.selected_metrics,
                'ai_summary': session.ai_summary,
                'duration_seconds': duration_seconds,
                'metric_count': metric_count or 0,
                'avg_cadence': float(avg_cadence) if avg_cadence else None,
                'avg_symmetry': float(avg_symmetry) if avg_symmetry else None,
            }
            
            sessions.append(session_dict)
        
        return sessions
    
    @staticmethod
    async def get_patient_metrics_summary(
        db: AsyncSession, 
        patient_id: int,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """Get comprehensive metrics summary for a patient"""
        
        # Calculate date range
        from_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Get metrics aggregation
        query = select(
            func.count(PTMetricSample.id).label('total_samples'),
            func.avg(PTMetricSample.cadence_spm).label('avg_cadence'),
            func.avg(PTMetricSample.stride_len_in).label('avg_stride_length'),
            func.avg(PTMetricSample.symmetry_idx_pct).label('avg_symmetry'),
            func.avg(PTMetricSample.stance_time_asymmetry_pct).label('avg_stance_asymmetry'),
            func.avg(PTMetricSample.step_length_symmetry_pct).label('avg_step_symmetry'),
            func.avg(PTMetricSample.gait_variability_cv_pct).label('avg_gait_variability'),
            func.avg(PTMetricSample.cop_area_cm2).label('avg_cop_area'),
            func.avg(PTMetricSample.stability_score).label('avg_stability'),
            func.count(func.distinct(PTSession.id)).label('session_count')
        ).join(PTSession).filter(
            and_(
                PTSession.patient_id == patient_id,
                PTMetricSample.ts >= from_date
            )
        )
        
        result = await db.execute(query)
        row = result.first()
        
        if not row:
            return {
                'patient_id': patient_id,
                'days_analyzed': days_back,
                'total_samples': 0,
                'session_count': 0,
                'metrics': {}
            }
        
        return {
            'patient_id': patient_id,
            'days_analyzed': days_back,
            'total_samples': row.total_samples or 0,
            'session_count': row.session_count or 0,
            'metrics': {
                'cadence_spm': float(row.avg_cadence) if row.avg_cadence else None,
                'stride_length_in': float(row.avg_stride_length) if row.avg_stride_length else None,
                'symmetry_pct': float(row.avg_symmetry) if row.avg_symmetry else None,
                'stance_asymmetry_pct': float(row.avg_stance_asymmetry) if row.avg_stance_asymmetry else None,
                'step_symmetry_pct': float(row.avg_step_symmetry) if row.avg_step_symmetry else None,
                'gait_variability_pct': float(row.avg_gait_variability) if row.avg_gait_variability else None,
                'cop_area_cm2': float(row.avg_cop_area) if row.avg_cop_area else None,
                'stability_score': float(row.avg_stability) if row.avg_stability else None,
            }
        }