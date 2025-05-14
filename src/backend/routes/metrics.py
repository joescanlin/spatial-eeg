from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_
from typing import List, Optional

from src.backend.db.session import AsyncSessionLocal
from src.backend.db.models import PTMetricSample, PTSession
from src.backend.schemas.metric import MetricCreate, MetricOut, MetricAggregated
from src.backend.utils.auth import get_current_user

router = APIRouter(prefix="/metrics", tags=["metrics"])

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@router.post("/", response_model=MetricOut)
async def create_metric(metric: MetricCreate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Create a new metric sample."""
    # Verify session exists
    result = await db.execute(select(PTSession).filter(PTSession.id == metric.session_id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Convert Pydantic model to SQLAlchemy model
    db_metric = PTMetricSample(**metric.dict())
    
    # Add to database
    db.add(db_metric)
    await db.commit()
    await db.refresh(db_metric)
    
    return db_metric

@router.get("/session/{session_id}", response_model=List[MetricOut])
async def get_session_metrics(
    session_id: int, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    """Get metrics for a specific session."""
    # Verify session exists
    result = await db.execute(select(PTSession).filter(PTSession.id == session_id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get latest metrics for this session
    result = await db.execute(
        select(PTMetricSample)
        .filter(PTMetricSample.session_id == session_id)
        .order_by(PTMetricSample.ts.desc())
        .limit(limit)
    )
    metrics = result.scalars().all()
    
    return metrics

@router.get("/session/{session_id}/latest", response_model=Optional[MetricOut])
async def get_latest_session_metric(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get the latest metric for a specific session."""
    # Verify session exists
    result = await db.execute(select(PTSession).filter(PTSession.id == session_id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get latest metric for this session
    result = await db.execute(
        select(PTMetricSample)
        .filter(PTMetricSample.session_id == session_id)
        .order_by(PTMetricSample.ts.desc())
        .limit(1)
    )
    metric = result.scalars().first()
    
    if not metric:
        return None
    
    return metric

@router.get("/session/{session_id}/aggregated", response_model=MetricAggregated)
async def get_aggregated_metrics(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get aggregated metrics for a specific session."""
    # Verify session exists
    session_result = await db.execute(select(PTSession).filter(PTSession.id == session_id))
    session = session_result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get aggregated metrics
    result = await db.execute(
        select(
            PTMetricSample.session_id,
            func.avg(PTMetricSample.cadence_spm).label("avg_cadence_spm"),
            func.avg(PTMetricSample.stride_len_in).label("avg_stride_len_in"),
            func.avg(PTMetricSample.symmetry_idx_pct).label("avg_symmetry_idx_pct"),
            func.avg(PTMetricSample.sway_vel_cm_s).label("avg_sway_vel_cm_s"),
            func.sum(PTMetricSample.sts_reps).label("total_sts_reps"),
            func.sum(PTMetricSample.turn_count).label("total_turn_count")
        )
        .filter(PTMetricSample.session_id == session_id)
        .group_by(PTMetricSample.session_id)
    )
    aggregated = result.first()
    
    if not aggregated:
        # Return zeros if no metrics found
        return MetricAggregated(
            session_id=session_id,
            start_ts=session.start_ts,
            end_ts=session.end_ts,
            avg_cadence_spm=0,
            avg_stride_len_in=0,
            avg_symmetry_idx_pct=0,
            avg_sway_vel_cm_s=0,
            total_sts_reps=0,
            total_turn_count=0
        )
    
    # Combine with session timestamps
    return MetricAggregated(
        session_id=session_id,
        start_ts=session.start_ts,
        end_ts=session.end_ts,
        avg_cadence_spm=aggregated.avg_cadence_spm,
        avg_stride_len_in=aggregated.avg_stride_len_in,
        avg_symmetry_idx_pct=aggregated.avg_symmetry_idx_pct,
        avg_sway_vel_cm_s=aggregated.avg_sway_vel_cm_s,
        total_sts_reps=aggregated.total_sts_reps,
        total_turn_count=aggregated.total_turn_count
    ) 