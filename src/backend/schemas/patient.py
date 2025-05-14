from pydantic import BaseModel
from typing import Optional

class PatientCreate(BaseModel):
    clinic_id: int
    first_name: str
    last_name: str
    height_cm: Optional[float] = None
    dx_icd10: Optional[str] = None

class PatientOut(PatientCreate):
    id: int
    
    class Config:
        orm_mode = True
        from_attributes = True  # For Pydantic v2 compatibility 