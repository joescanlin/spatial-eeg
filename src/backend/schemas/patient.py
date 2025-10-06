from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import date, datetime

class PatientCreate(BaseModel):
    clinic_id: int
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    gender: Optional[str] = Field(None, pattern="^(Male|Female|Other|Prefer not to say)$")
    date_of_birth: Optional[date] = None
    height_cm: Optional[float] = Field(None, gt=0, le=300)

    # Research-specific fields
    flooring_condition: Optional[str] = Field(None, max_length=200)  # e.g., "Pattern A", "Textured"
    cognitive_baseline: Optional[Dict[str, float]] = None  # {focus: 75, stress: 30, attention: 80}
    subject_notes: Optional[str] = Field(None, max_length=5000)

    # Legacy PT field (backward compatibility)
    dx_icd10: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = Field(None, max_length=5000)

class PatientUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    gender: Optional[str] = Field(None, pattern="^(Male|Female|Other|Prefer not to say)$")
    date_of_birth: Optional[date] = None
    height_cm: Optional[float] = Field(None, gt=0, le=300)

    # Research-specific fields
    flooring_condition: Optional[str] = Field(None, max_length=200)
    cognitive_baseline: Optional[Dict[str, float]] = None
    subject_notes: Optional[str] = Field(None, max_length=5000)

    # Legacy PT field
    dx_icd10: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = Field(None, max_length=5000)

class PatientOut(BaseModel):
    id: int
    clinic_id: int
    first_name: str
    last_name: str
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    height_cm: Optional[float] = None

    # Research-specific fields
    flooring_condition: Optional[str] = None
    cognitive_baseline: Optional[Dict[str, float]] = None
    subject_notes: Optional[str] = None

    # Legacy PT field
    dx_icd10: Optional[str] = None
    notes: Optional[str] = None

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Computed field for age
    @property
    def age(self) -> Optional[int]:
        if self.date_of_birth:
            today = date.today()
            return today.year - self.date_of_birth.year - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
        return None
    
    # Computed field for sessions count (would be populated by query)
    sessions_count: Optional[int] = 0
    last_visit: Optional[str] = None
    
    class Config:
        from_attributes = True  # For Pydantic v2 compatibility 