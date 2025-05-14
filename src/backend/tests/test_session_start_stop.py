import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta

from src.backend.db.models import PTPatient, PTClinic, PTSession
from src.backend.schemas.session import SessionCreate, SessionUpdate
from src.backend.utils.auth import create_access_token

# Test session data
TEST_SESSION = {
    "activity": "gait"  # gait, balance, stsit, mixed
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
async def test_patient(test_db_session: AsyncSession, test_clinic):
    """Create a test patient."""
    patient = PTPatient(
        clinic_id=test_clinic.id,
        first_name="Test",
        last_name="Patient",
        height_cm=175.0,
        dx_icd10="M54.5"
    )
    test_db_session.add(patient)
    await test_db_session.commit()
    await test_db_session.refresh(patient)
    return patient

@pytest_asyncio.fixture
async def test_token():
    """Create a test token for authentication."""
    user_data = {
        "sub": "test@example.com",
        "user_id": 1,
        "name": "Test User"
    }
    return create_access_token(user_data)

@pytest.mark.asyncio
async def test_start_session(test_app, test_patient, test_token, test_db_session):
    """Test starting a new session."""
    # Prepare session data
    session_data = TEST_SESSION.copy()
    session_data["patient_id"] = test_patient.id
    
    # Make request with authorization
    async with AsyncClient(app=test_app.app, base_url="http://test") as ac:
        response = await ac.post(
            "/api/sessions/",
            json=session_data,
            headers={"Authorization": f"Bearer {test_token}"}
        )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["patient_id"] == test_patient.id
    assert data["activity"] == TEST_SESSION["activity"]
    assert data["start_ts"] is not None
    assert data["end_ts"] is None  # End time should be None for new session
    
    # Verify in database
    result = await test_db_session.execute(
        select(PTSession).filter(PTSession.id == data["id"])
    )
    session = result.scalars().first()
    assert session is not None
    assert session.patient_id == test_patient.id
    assert session.activity == TEST_SESSION["activity"]
    assert session.start_ts is not None
    assert session.end_ts is None

@pytest.mark.asyncio
async def test_end_session(test_app, test_patient, test_token, test_db_session):
    """Test ending a session."""
    # Create a session
    start_time = datetime.utcnow() - timedelta(minutes=30)  # Session started 30 mins ago
    session = PTSession(
        patient_id=test_patient.id,
        activity=TEST_SESSION["activity"],
        start_ts=start_time,
        end_ts=None
    )
    test_db_session.add(session)
    await test_db_session.commit()
    await test_db_session.refresh(session)
    
    # End session data
    end_time = datetime.utcnow()
    end_data = {"end_ts": end_time.isoformat()}
    
    # Make request with authorization
    async with AsyncClient(app=test_app.app, base_url="http://test") as ac:
        response = await ac.put(
            f"/api/sessions/{session.id}",
            json=end_data,
            headers={"Authorization": f"Bearer {test_token}"}
        )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == session.id
    assert data["end_ts"] is not None
    
    # Verify in database
    await test_db_session.refresh(session)
    assert session.end_ts is not None

@pytest.mark.asyncio
async def test_get_patient_sessions(test_app, test_patient, test_token, test_db_session):
    """Test retrieving sessions for a patient."""
    # Create multiple sessions for the patient
    for _ in range(3):
        start_time = datetime.utcnow() - timedelta(days=_)
        session = PTSession(
            patient_id=test_patient.id,
            activity=TEST_SESSION["activity"],
            start_ts=start_time,
            end_ts=start_time + timedelta(minutes=45)
        )
        test_db_session.add(session)
    
    await test_db_session.commit()
    
    # Make request with authorization
    async with AsyncClient(app=test_app.app, base_url="http://test") as ac:
        response = await ac.get(
            f"/api/sessions/?patient_id={test_patient.id}",
            headers={"Authorization": f"Bearer {test_token}"}
        )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3
    
    # Verify all sessions belong to the patient
    for session in data:
        assert session["patient_id"] == test_patient.id

@pytest.mark.asyncio
async def test_session_duration(test_app, test_patient, test_token, test_db_session):
    """Test session duration calculation."""
    # Create a completed session
    start_time = datetime.utcnow() - timedelta(hours=1)
    end_time = datetime.utcnow() - timedelta(minutes=15)
    
    session = PTSession(
        patient_id=test_patient.id,
        activity=TEST_SESSION["activity"],
        start_ts=start_time,
        end_ts=end_time
    )
    test_db_session.add(session)
    await test_db_session.commit()
    await test_db_session.refresh(session)
    
    # Make request with authorization
    async with AsyncClient(app=test_app.app, base_url="http://test") as ac:
        response = await ac.get(
            f"/api/sessions/{session.id}",
            headers={"Authorization": f"Bearer {test_token}"}
        )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    
    # Calculate expected duration (45 minutes)
    expected_duration_minutes = 45
    
    # Parse datetime strings from response
    session_start = datetime.fromisoformat(data["start_ts"].replace("Z", "+00:00"))
    session_end = datetime.fromisoformat(data["end_ts"].replace("Z", "+00:00"))
    
    # Calculate actual duration in minutes
    actual_duration = (session_end - session_start).total_seconds() / 60
    
    # Verify duration is approximately correct (allow 1 minute margin)
    assert abs(actual_duration - expected_duration_minutes) < 1 