from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict
import json
import csv
import io
import zipfile
import os
from pathlib import Path
from datetime import datetime

from src.backend.db.session import AsyncSessionLocal
from src.backend.db.models import PTPatient, PTClinic, PTSession
from src.backend.schemas.patient import PatientCreate, PatientOut
from src.backend.utils.auth import get_current_user

# Path to session data directory
SESSION_DATA_DIR = Path(__file__).parent.parent.parent.parent / "session_data"

router = APIRouter(prefix="/patients", tags=["patients"])

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@router.post("/", response_model=PatientOut)
async def create_patient(patient: PatientCreate, db: AsyncSession = Depends(get_db)):
    """Create a new patient."""
    # Verify clinic exists
    result = await db.execute(select(PTClinic).filter(PTClinic.id == patient.clinic_id))
    clinic = result.scalars().first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    # Convert Pydantic model to SQLAlchemy model
    db_patient = PTPatient(
        clinic_id=patient.clinic_id,
        first_name=patient.first_name,
        last_name=patient.last_name,
        height_cm=patient.height_cm,
        dx_icd10=patient.dx_icd10
    )
    
    # Add to database
    db.add(db_patient)
    await db.commit()
    await db.refresh(db_patient)
    
    return db_patient

@router.get("/", response_model=List[PatientOut])
async def list_patients(skip: int = 0, limit: int = 100, clinic_id: int = None, db: AsyncSession = Depends(get_db)):
    """List all patients, optionally filtered by clinic."""
    query = select(PTPatient)
    
    # Add clinic filter if specified
    if clinic_id is not None:
        query = query.filter(PTPatient.clinic_id == clinic_id)
    
    # Execute query with pagination
    result = await db.execute(query.offset(skip).limit(limit))
    patients = result.scalars().all()
    
    return patients

@router.get("/{patient_id}", response_model=PatientOut)
async def get_patient(patient_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Get a specific patient by ID."""
    result = await db.execute(select(PTPatient).filter(PTPatient.id == patient_id))
    patient = result.scalars().first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    return patient

@router.put("/{patient_id}", response_model=PatientOut)
async def update_patient(patient_id: int, patient: PatientCreate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Update a patient."""
    # Verify clinic exists
    result = await db.execute(select(PTClinic).filter(PTClinic.id == patient.clinic_id))
    clinic = result.scalars().first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    # Get patient
    result = await db.execute(select(PTPatient).filter(PTPatient.id == patient_id))
    db_patient = result.scalars().first()
    
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Update fields
    db_patient.clinic_id = patient.clinic_id
    db_patient.first_name = patient.first_name
    db_patient.last_name = patient.last_name
    db_patient.height_cm = patient.height_cm
    db_patient.dx_icd10 = patient.dx_icd10
    
    await db.commit()
    await db.refresh(db_patient)
    
    return db_patient

@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient(patient_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Delete a patient."""
    result = await db.execute(select(PTPatient).filter(PTPatient.id == patient_id))
    db_patient = result.scalars().first()

    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    await db.delete(db_patient)
    await db.commit()

    return None

@router.get("/{patient_id}/export")
async def export_patient_data(patient_id: int, db: AsyncSession = Depends(get_db)):
    """
    Export all session data for a research subject.
    Returns a ZIP file with the following structure:
    Subject_XXX_Name/
      Session_01_DATE/
        metadata_floor.json
        metadata_eeg.json
        combined_timeseries.csv
    """
    # Get patient/subject
    result = await db.execute(select(PTPatient).filter(PTPatient.id == patient_id))
    patient = result.scalars().first()

    if not patient:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Get all sessions for this patient
    result = await db.execute(
        select(PTSession)
        .filter(PTSession.patient_id == patient_id)
        .order_by(PTSession.start_ts)
    )
    sessions = result.scalars().all()

    if not sessions:
        raise HTTPException(status_code=404, detail="No sessions found for this subject")

    # Create ZIP file in memory
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        subject_folder = f"Subject_{patient_id:03d}_{patient.first_name}_{patient.last_name}"

        for idx, session in enumerate(sessions, 1):
            session_date = session.start_ts.strftime("%Y-%m-%d")
            session_folder = f"{subject_folder}/Session_{idx:02d}_{session_date}"

            # 1. Floor sensor metadata JSON
            floor_metadata = {
                "session_id": session.id,
                "trial_number": session.trial_number,
                "flooring_pattern": session.flooring_pattern,
                "start_time": session.start_ts.isoformat() if session.start_ts else None,
                "end_time": session.end_ts.isoformat() if session.end_ts else None,
                "duration_seconds": session.duration,
                "activity": session.activity,
                "environmental_notes": session.environmental_notes,
                "spatial_metrics_summary": {
                    "avg_cadence": session.avg_cadence,
                    "avg_symmetry": session.avg_symmetry,
                    "avg_step_length_symmetry": session.avg_step_length_symmetry,
                    "avg_stance_time_asymmetry": session.avg_stance_time_asymmetry,
                    "avg_gait_variability": session.avg_gait_variability,
                    "avg_balance_score": session.avg_balance_score,
                    "avg_cop_area": session.avg_cop_area,
                    "avg_sway_velocity": session.avg_sway_velocity,
                    "avg_stability_score": session.avg_stability_score,
                    "total_step_count": session.total_step_count,
                    "load_distribution": session.load_distribution
                }
            }
            zip_file.writestr(
                f"{session_folder}/metadata_floor.json",
                json.dumps(floor_metadata, indent=2)
            )

            # 2. EEG metadata JSON
            eeg_metadata = {
                "session_id": session.id,
                "eeg_session_id": session.eeg_session_id,
                "cognitive_metrics_summary": {
                    "avg_focus": session.eeg_avg_focus,
                    "avg_stress": session.eeg_avg_stress,
                    "avg_attention": session.eeg_avg_attention,
                    "avg_cognitive_load": session.eeg_avg_cognitive_load
                },
                "contact_quality": session.eeg_contact_quality,
                "band_power_summary": session.eeg_band_power_summary
            }
            zip_file.writestr(
                f"{session_folder}/metadata_eeg.json",
                json.dumps(eeg_metadata, indent=2)
            )

            # 3. Combined time-series CSV
            # Parse metrics_data (assumed to be JSON array of time-series points)
            csv_buffer = io.StringIO()
            csv_writer = csv.writer(csv_buffer)

            # Write header
            csv_writer.writerow([
                'timestamp',
                'cadence_spm',
                'symmetry_pct',
                'step_length_symmetry_pct',
                'stance_time_asymmetry_pct',
                'gait_variability',
                'balance_score',
                'cop_area_cm2',
                'sway_velocity_cm_s',
                'stability_score_pct',
                'step_count',
                'eeg_focus',
                'eeg_stress',
                'eeg_attention',
                'eeg_cognitive_load'
            ])

            # Parse and write data rows
            if session.metrics_data:
                try:
                    metrics = json.loads(session.metrics_data) if isinstance(session.metrics_data, str) else session.metrics_data

                    for metric in metrics:
                        csv_writer.writerow([
                            metric.get('timestamp', ''),
                            metric.get('cadence', ''),
                            metric.get('symmetry', ''),
                            metric.get('stepLengthSymmetry', ''),
                            metric.get('stanceTimeAsymmetry', ''),
                            metric.get('gaitVariability', ''),
                            metric.get('balanceScore', ''),
                            metric.get('copArea', ''),
                            metric.get('swayVelocity', ''),
                            metric.get('stabilityScore', ''),
                            metric.get('stepCount', ''),
                            # EEG data (if available in time-series)
                            metric.get('eeg_focus', session.eeg_avg_focus or ''),
                            metric.get('eeg_stress', session.eeg_avg_stress or ''),
                            metric.get('eeg_attention', session.eeg_avg_attention or ''),
                            metric.get('eeg_cognitive_load', session.eeg_avg_cognitive_load or '')
                        ])
                except (json.JSONDecodeError, TypeError):
                    # If metrics_data is not valid JSON, skip
                    pass

            zip_file.writestr(
                f"{session_folder}/combined_timeseries.csv",
                csv_buffer.getvalue()
            )

    # Reset buffer position
    zip_buffer.seek(0)

    # Return ZIP file as streaming response
    filename = f"Subject_{patient_id:03d}_{patient.first_name}_{patient.last_name}_Data.zip"
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/{patient_id}/files")
async def list_patient_files(patient_id: int, db: AsyncSession = Depends(get_db)):
    """
    List all session files for a research subject.
    Returns a tree structure of folders and files.
    """
    # Get patient info
    result = await db.execute(select(PTPatient).filter(PTPatient.id == patient_id))
    patient = result.scalars().first()

    if not patient:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Build subject directory path - try exact match first, then search by ID
    subject_dir = SESSION_DATA_DIR / f"Subject_{patient_id:03d}_{patient.first_name}_{patient.last_name}"

    # If exact match doesn't exist, search for any directory with this subject ID
    if not subject_dir.exists():
        # Look for Subject_XXX_* pattern
        pattern_prefix = f"Subject_{patient_id:03d}_"
        matching_dirs = [d for d in SESSION_DATA_DIR.iterdir() if d.is_dir() and d.name.startswith(pattern_prefix)]

        if matching_dirs:
            subject_dir = matching_dirs[0]  # Use first match
        else:
            return {"sessions": [], "total_sessions": 0}

    # Scan directory structure
    sessions = []
    for session_dir in sorted(subject_dir.iterdir()):
        if session_dir.is_dir() and session_dir.name.startswith("Session_"):
            files = []
            for file_path in sorted(session_dir.iterdir()):
                if file_path.is_file():
                    stat = file_path.stat()
                    files.append({
                        "name": file_path.name,
                        "size_bytes": stat.st_size,
                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })

            sessions.append({
                "name": session_dir.name,
                "path": str(session_dir.relative_to(SESSION_DATA_DIR)),
                "files": files
            })

    return {
        "subject_id": patient_id,
        "subject_name": f"{patient.first_name} {patient.last_name}",
        "sessions": sessions,
        "total_sessions": len(sessions)
    }

@router.get("/{patient_id}/files/download")
async def download_patient_file(patient_id: int, file_path: str, db: AsyncSession = Depends(get_db)):
    """
    Download a specific session file.
    file_path format: "Subject_XXX_Name/Session_YY_DATE/filename.ext"
    """
    # Get patient info
    result = await db.execute(select(PTPatient).filter(PTPatient.id == patient_id))
    patient = result.scalars().first()

    if not patient:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Security: Validate the path is within session_data directory
    full_path = (SESSION_DATA_DIR / file_path).resolve()

    if not str(full_path).startswith(str(SESSION_DATA_DIR.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")

    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    # Determine media type
    media_types = {
        ".json": "application/json",
        ".csv": "text/csv",
        ".txt": "text/plain"
    }
    media_type = media_types.get(full_path.suffix, "application/octet-stream")

    return FileResponse(
        path=full_path,
        media_type=media_type,
        filename=full_path.name
    ) 