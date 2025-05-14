from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from src.backend.db.session import AsyncSessionLocal
from src.backend.db.models import PTPatient, PTClinic
from src.backend.schemas.patient import PatientCreate, PatientOut
from src.backend.utils.auth import get_current_user

router = APIRouter(prefix="/patients", tags=["patients"])

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@router.post("/", response_model=PatientOut)
async def create_patient(patient: PatientCreate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
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
async def list_patients(skip: int = 0, limit: int = 100, clinic_id: int = None, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
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