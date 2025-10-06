from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import json
import os
from pathlib import Path

from src.backend.db.session import AsyncSessionLocal
from src.backend.db.models import PTSession, PTPatient
from src.backend.schemas.session import SessionCreate, SessionOut, SessionUpdate
from src.backend.utils.auth import get_current_user

router = APIRouter(prefix="/sessions", tags=["sessions"])

# Path to session data directory
SESSION_DATA_DIR = Path(__file__).parent.parent.parent.parent / "session_data"


class EEGSessionData(BaseModel):
    """Schema for saving EEG + floor sensor session data"""
    patient_id: int
    flooring_pattern: str
    start_time: str
    end_time: str
    duration: int
    eeg_data: Dict[str, Any]
    floor_data: Dict[str, Any]

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@router.post("/", response_model=SessionOut)
async def create_session(session: SessionCreate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Start a new session."""
    # Verify patient exists
    result = await db.execute(select(PTPatient).filter(PTPatient.id == session.patient_id))
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Create new session
    db_session = PTSession(
        patient_id=session.patient_id,
        activity=session.activity,
        start_ts=datetime.utcnow(),
        end_ts=None
    )
    
    # Add to database
    db.add(db_session)
    await db.commit()
    await db.refresh(db_session)
    
    return db_session

@router.post("/{session_id}/stop", response_model=SessionOut)
async def stop_session(session_id: int, session_update: SessionUpdate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Stop an active session."""
    # Get session
    result = await db.execute(select(PTSession).filter(PTSession.id == session_id))
    db_session = result.scalars().first()
    
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if db_session.end_ts:
        raise HTTPException(status_code=400, detail="Session already ended")
    
    # Update end time
    db_session.end_ts = session_update.end_ts
    
    await db.commit()
    await db.refresh(db_session)
    
    return db_session

@router.get("/", response_model=List[SessionOut])
async def list_sessions(skip: int = 0, limit: int = 100, patient_id: int = None, active_only: bool = False, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """List all sessions, optionally filtered by patient or active status."""
    query = select(PTSession)
    
    # Add patient filter if specified
    if patient_id is not None:
        query = query.filter(PTSession.patient_id == patient_id)
    
    # Filter active sessions (end_ts is NULL)
    if active_only:
        query = query.filter(PTSession.end_ts == None)
    
    # Execute query with pagination
    result = await db.execute(query.offset(skip).limit(limit))
    sessions = result.scalars().all()
    
    return sessions

@router.get("/{session_id}", response_model=SessionOut)
async def get_session(session_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Get a specific session by ID."""
    result = await db.execute(select(PTSession).filter(PTSession.id == session_id))
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return session

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Delete a session."""
    result = await db.execute(select(PTSession).filter(PTSession.id == session_id))
    db_session = result.scalars().first()

    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.delete(db_session)
    await db.commit()

    return None


@router.post("/save-eeg-session")
async def save_eeg_session(session_data: EEGSessionData, db: AsyncSession = Depends(get_db)):
    """
    Save EEG + floor sensor session data to database and generate session files.

    This endpoint:
    1. Creates a new PTSession record in the database
    2. Generates session files in session_data directory:
       - metadata_eeg.json (EEG metadata and cognitive metrics)
       - metadata_floor.json (floor sensor metadata and gait metrics)
       - combined_timeseries.csv (time-series data for ML)
    """
    # Verify patient exists
    result = await db.execute(select(PTPatient).filter(PTPatient.id == session_data.patient_id))
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Count existing sessions for this patient to determine trial number
    result = await db.execute(
        select(PTSession)
        .filter(PTSession.patient_id == session_data.patient_id)
        .order_by(PTSession.start_ts.desc())
    )
    existing_sessions = result.scalars().all()
    trial_number = len(existing_sessions) + 1

    # Extract EEG metrics
    eeg_metrics = session_data.eeg_data.get('metrics', {})
    eeg_band_power = session_data.eeg_data.get('bandPower', {})
    eeg_contact_quality = session_data.eeg_data.get('contactQuality', {})

    # Extract floor metrics
    floor_balance = session_data.floor_data.get('balanceMetrics', {})
    floor_gait = session_data.floor_data.get('gaitMetrics', {})

    # Parse timestamps and convert to timezone-naive UTC
    start_dt = datetime.fromisoformat(session_data.start_time.replace('Z', '+00:00'))
    end_dt = datetime.fromisoformat(session_data.end_time.replace('Z', '+00:00'))

    # Remove timezone info (database expects naive datetimes in UTC)
    start_dt = start_dt.replace(tzinfo=None)
    end_dt = end_dt.replace(tzinfo=None)

    # Create PTSession record
    db_session = PTSession(
        patient_id=session_data.patient_id,
        trial_number=trial_number,
        flooring_pattern=session_data.flooring_pattern,
        start_ts=start_dt,
        end_ts=end_dt,
        activity="EEG + Floor Fusion Research Session",
        # EEG metrics
        eeg_avg_focus=eeg_metrics.get('focus', 0) if eeg_metrics else 0,
        eeg_avg_stress=eeg_metrics.get('stress', 0) if eeg_metrics else 0,
        eeg_avg_attention=eeg_metrics.get('engagement', 0) if eeg_metrics else 0,
        eeg_avg_cognitive_load=(eeg_metrics.get('stress', 0) + (1 - eeg_metrics.get('relaxation', 1))) * 50 if eeg_metrics else 0,
        eeg_contact_quality=eeg_contact_quality if isinstance(eeg_contact_quality, dict) else {},
        eeg_band_power_summary=eeg_band_power if isinstance(eeg_band_power, dict) else {},
    )

    db.add(db_session)
    await db.commit()
    await db.refresh(db_session)

    # Generate session files
    try:
        await generate_session_files(
            patient=patient,
            session=db_session,
            trial_number=trial_number,
            session_data=session_data
        )
    except Exception as e:
        print(f"Warning: Failed to generate session files: {e}")
        # Don't fail the request if file generation fails

    return {
        "success": True,
        "session_id": db_session.id,
        "trial_number": trial_number,
        "message": f"Session saved successfully for {patient.first_name} {patient.last_name}"
    }


async def generate_session_files(patient: PTPatient, session: PTSession, trial_number: int, session_data: EEGSessionData):
    """Generate session data files in session_data directory"""

    # Create subject directory
    subject_dir = SESSION_DATA_DIR / f"Subject_{patient.id:03d}_{patient.first_name}_{patient.last_name}"
    os.makedirs(subject_dir, exist_ok=True)

    # Create session directory
    session_date = session.start_ts.strftime("%Y-%m-%d")
    session_dir = subject_dir / f"Session_{trial_number:02d}_{session_date}"
    os.makedirs(session_dir, exist_ok=True)

    # 1. Generate metadata_eeg.json
    eeg_metadata = {
        "metadata": {
            "device": "Emotiv Insight",
            "channels": ["AF3", "AF4", "T7", "T8", "Pz"],
            "sample_rate_hz": 128,
            "performance_metrics_rate_hz": 8,
            "session_number": trial_number,
            "flooring_pattern": session_data.flooring_pattern,
            "timestamp": session.start_ts.isoformat(),
            "duration_seconds": session_data.duration,
        },
        "cognitive_metrics_summary": {
            "avg_focus": session.eeg_avg_focus,
            "avg_stress": session.eeg_avg_stress,
            "avg_attention": session.eeg_avg_attention,
            "avg_cognitive_load": session.eeg_avg_cognitive_load,
        },
        "band_power_summary": session.eeg_band_power_summary or {},
        "contact_quality": session.eeg_contact_quality or {},
    }

    with open(session_dir / "metadata_eeg.json", "w") as f:
        json.dump(eeg_metadata, f, indent=2)

    # 2. Generate metadata_floor.json
    floor_metadata = {
        "metadata": {
            "grid_width": 12,
            "grid_height": 15,
            "pixel_resolution": 4,
            "timestamp": session.start_ts.isoformat(),
            "session_number": trial_number,
            "flooring_pattern": session_data.flooring_pattern,
            "duration_seconds": session_data.duration,
        },
        "summary_metrics": {
            "avg_cadence_spm": session_data.floor_data.get('gaitMetrics', {}).get('cadence', 0),
            "avg_symmetry_pct": session_data.floor_data.get('gaitMetrics', {}).get('symmetry', 0),
            "balance_score": session_data.floor_data.get('balanceMetrics', {}).get('stabilityScore', 0),
            "total_steps": session_data.floor_data.get('gaitMetrics', {}).get('stepCount', 0),
        }
    }

    with open(session_dir / "metadata_floor.json", "w") as f:
        json.dump(floor_metadata, f, indent=2)

    # 3. Generate combined_timeseries.csv (simplified version)
    import csv
    with open(session_dir / "combined_timeseries.csv", "w", newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            'timestamp',
            'cadence_spm',
            'symmetry_pct',
            'balance_score',
            'step_count',
            'eeg_focus',
            'eeg_stress',
            'eeg_attention',
            'eeg_cognitive_load'
        ])

        # Write single summary row (can be expanded to time-series in future)
        floor_gait = session_data.floor_data.get('gaitMetrics', {})
        floor_balance = session_data.floor_data.get('balanceMetrics', {})

        writer.writerow([
            session.start_ts.isoformat(),
            floor_gait.get('cadence', 0),
            floor_gait.get('symmetry', 0),
            floor_balance.get('stabilityScore', 0),
            floor_gait.get('stepCount', 0),
            session.eeg_avg_focus or 0,
            session.eeg_avg_stress or 0,
            session.eeg_avg_attention or 0,
            session.eeg_avg_cognitive_load or 0,
        ])

    print(f"✓ Generated session files in {session_dir}")