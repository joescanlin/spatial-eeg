from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SessionCreate(BaseModel):
    patient_id: int
    activity: str  # gait, balance, stsit, mixed

class SessionOut(BaseModel):
    id: int
    patient_id: int
    activity: str  
    start_ts: datetime
    end_ts: Optional[datetime] = None
    
    class Config:
        orm_mode = True
        from_attributes = True  # For Pydantic v2 compatibility

class SessionUpdate(BaseModel):
    end_ts: datetime 