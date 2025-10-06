from pydantic import BaseModel
from typing import Optional

class ClinicCreate(BaseModel):
    name: str
    area_ft2: float

class ClinicOut(ClinicCreate):
    id: int
    sub_rate: float
    
    class Config:
        from_attributes = True
        from_attributes = True  # For Pydantic v2 compatibility 