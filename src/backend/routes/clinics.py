from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from src.backend.db.session import AsyncSessionLocal
from src.backend.db.models import PTClinic
from src.backend.schemas.clinic import ClinicCreate, ClinicOut
from src.backend.utils.auth import get_current_user

router = APIRouter(prefix="/clinics", tags=["clinics"])

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@router.post("/", response_model=ClinicOut)
async def create_clinic(clinic: ClinicCreate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Create a new clinic."""
    # Convert Pydantic model to SQLAlchemy model
    db_clinic = PTClinic(
        name=clinic.name,
        area_ft2=clinic.area_ft2
    )
    
    # Add to database
    db.add(db_clinic)
    await db.commit()
    await db.refresh(db_clinic)
    
    return db_clinic

@router.get("/", response_model=List[ClinicOut])
async def list_clinics(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """List all clinics."""
    # Query database
    result = await db.execute(select(PTClinic).offset(skip).limit(limit))
    clinics = result.scalars().all()
    
    return clinics

@router.get("/{clinic_id}", response_model=ClinicOut)
async def get_clinic(clinic_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Get a specific clinic by ID."""
    # Query database
    result = await db.execute(select(PTClinic).filter(PTClinic.id == clinic_id))
    clinic = result.scalars().first()
    
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    return clinic

@router.put("/{clinic_id}", response_model=ClinicOut)
async def update_clinic(clinic_id: int, clinic: ClinicCreate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Update a clinic."""
    # Query database
    result = await db.execute(select(PTClinic).filter(PTClinic.id == clinic_id))
    db_clinic = result.scalars().first()
    
    if not db_clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    # Update fields
    db_clinic.name = clinic.name
    db_clinic.area_ft2 = clinic.area_ft2
    
    await db.commit()
    await db.refresh(db_clinic)
    
    return db_clinic

@router.delete("/{clinic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_clinic(clinic_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Delete a clinic."""
    # Query database
    result = await db.execute(select(PTClinic).filter(PTClinic.id == clinic_id))
    db_clinic = result.scalars().first()
    
    if not db_clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    
    # Delete record
    await db.delete(db_clinic)
    await db.commit()
    
    return None 