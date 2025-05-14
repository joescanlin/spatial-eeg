import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.backend.db.models import PTPatient, PTClinic
from src.backend.schemas.patient import PatientCreate
from src.backend.utils.auth import create_access_token

# Test patient data
TEST_PATIENT = {
    "first_name": "Test",
    "last_name": "Patient",
    "height_cm": 175.0,
    "dx_icd10": "M54.5"  # Low back pain
}

@pytest_asyncio.fixture
async def test_clinic(test_db_session: AsyncSession):
    """Create a test clinic."""
    clinic = PTClinic(name="Test Clinic")
    test_db_session.add(clinic)
    await test_db_session.commit()
    await test_db_session.refresh(clinic)
    return clinic

@pytest_asyncio.fixture
async def test_token():
    """Create a test token for authentication."""
    user_data = {
        "sub": "test@example.com",
        "user_id": 1,
        "name": "Test User"
    }
    return create_access_token(user_data)

async def create_test_patient(db_session: AsyncSession, clinic_id: int):
    """Helper to create a test patient."""
    patient_data = TEST_PATIENT.copy()
    patient_data["clinic_id"] = clinic_id
    
    patient = PTPatient(**patient_data)
    db_session.add(patient)
    await db_session.commit()
    await db_session.refresh(patient)
    return patient

# CRUD Tests
@pytest.mark.asyncio
async def test_create_patient(test_app, test_clinic, test_token, test_db_session):
    """Test creating a new patient."""
    # Prepare test data
    patient_data = TEST_PATIENT.copy()
    patient_data["clinic_id"] = test_clinic.id
    
    # Make request with authorization
    async with AsyncClient(app=test_app.app, base_url="http://test") as ac:
        response = await ac.post(
            "/api/patients/",
            json=patient_data,
            headers={"Authorization": f"Bearer {test_token}"}
        )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == TEST_PATIENT["first_name"]
    assert data["last_name"] == TEST_PATIENT["last_name"]
    assert data["clinic_id"] == test_clinic.id
    
    # Verify in database
    result = await test_db_session.execute(
        select(PTPatient).filter(PTPatient.id == data["id"])
    )
    patient = result.scalars().first()
    assert patient is not None
    assert patient.first_name == TEST_PATIENT["first_name"]

@pytest.mark.asyncio
async def test_get_patient(test_app, test_clinic, test_token, test_db_session):
    """Test retrieving a patient by ID."""
    # Create test patient
    patient = await create_test_patient(test_db_session, test_clinic.id)
    
    # Make request with authorization
    async with AsyncClient(app=test_app.app, base_url="http://test") as ac:
        response = await ac.get(
            f"/api/patients/{patient.id}",
            headers={"Authorization": f"Bearer {test_token}"}
        )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == patient.id
    assert data["first_name"] == patient.first_name
    assert data["last_name"] == patient.last_name

@pytest.mark.asyncio
async def test_list_patients(test_app, test_clinic, test_token, test_db_session):
    """Test listing all patients."""
    # Create test patients
    for i in range(3):
        patient_data = TEST_PATIENT.copy()
        patient_data["first_name"] = f"Test{i}"
        patient_data["clinic_id"] = test_clinic.id
        
        patient = PTPatient(**patient_data)
        test_db_session.add(patient)
    
    await test_db_session.commit()
    
    # Make request with authorization
    async with AsyncClient(app=test_app.app, base_url="http://test") as ac:
        response = await ac.get(
            "/api/patients/",
            headers={"Authorization": f"Bearer {test_token}"}
        )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3
    
    # Filter by clinic
    async with AsyncClient(app=test_app.app, base_url="http://test") as ac:
        response = await ac.get(
            f"/api/patients/?clinic_id={test_clinic.id}",
            headers={"Authorization": f"Bearer {test_token}"}
        )
    
    # Check filtered response
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3
    for patient in data:
        assert patient["clinic_id"] == test_clinic.id

@pytest.mark.asyncio
async def test_update_patient(test_app, test_clinic, test_token, test_db_session):
    """Test updating a patient."""
    # Create test patient
    patient = await create_test_patient(test_db_session, test_clinic.id)
    
    # Updated data
    update_data = {
        "clinic_id": test_clinic.id,
        "first_name": "Updated",
        "last_name": patient.last_name,
        "height_cm": 180.0,
        "dx_icd10": "M25.5"
    }
    
    # Make request with authorization
    async with AsyncClient(app=test_app.app, base_url="http://test") as ac:
        response = await ac.put(
            f"/api/patients/{patient.id}",
            json=update_data,
            headers={"Authorization": f"Bearer {test_token}"}
        )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == patient.id
    assert data["first_name"] == "Updated"
    assert data["height_cm"] == 180.0
    
    # Verify in database
    await test_db_session.refresh(patient)
    assert patient.first_name == "Updated"
    assert patient.height_cm == 180.0 