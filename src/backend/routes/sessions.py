from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from datetime import datetime

from src.backend.db.session import AsyncSessionLocal
from src.backend.db.models import PTSession, PTPatient
from src.backend.schemas.session import SessionCreate, SessionOut, SessionUpdate
from src.backend.utils.auth import get_current_user

router = APIRouter(prefix="/sessions", tags=["sessions"])

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