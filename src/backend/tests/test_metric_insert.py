import pytest
import pytest_asyncio
import json
import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta

from src.backend.db.models import PTPatient, PTClinic, PTSession, PTMetricSample
from src.backend.utils.auth import create_access_token
from src.backend.services.metric_ingest import DBMetricPersister
from src.utils.mqtt_client import MQTTClient
from src.utils.session_cache import SessionCache

# Test clinic and patient fixtures
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
async def test_session(test_db_session: AsyncSession, test_patient):
    """Create a test session."""
    session = PTSession(
        patient_id=test_patient.id,
        activity="gait", 
        start_ts=datetime.utcnow(),
        end_ts=None
    )
    test_db_session.add(session)
    await test_db_session.commit()
    await test_db_session.refresh(session)
    
    # Add session to session cache
    SessionCache().set_session_id(test_patient.id, session.id)
    
    return session

@pytest_asyncio.fixture
async def test_token():
    """Create a test token for authentication."""
    user_data = {
        "sub": "test@example.com",
        "user_id": 1,
        "name": "Test User"
    }
    return create_access_token(user_data)

@pytest_asyncio.fixture
async def test_metric_persister(test_db_session: AsyncSession, mock_mqtt_client):
    """Create a test metric persister."""
    persister = DBMetricPersister(test_db_session)
    persister.mqtt_client = mock_mqtt_client
    return persister

# Sample metrics data for different activities
GAIT_METRIC = {
    "ts": datetime.utcnow().isoformat(),
    "cadence_spm": 110.5,
    "stride_len_in": 30.2,
    "cadence_cv_pct": 5.3,
    "symmetry_idx_pct": 95.0,
    "dbl_support_pct": 20.1,
    "turn_count": 4,
    "avg_turn_angle_deg": 45.0
}

BALANCE_METRIC = {
    "ts": datetime.utcnow().isoformat(),
    "sway_path_cm": 25.4,
    "sway_vel_cm_s": 4.2,
    "sway_area_cm2": 12.3,
    "left_pct": 48.5,
    "right_pct": 51.5,
    "ant_pct": 55.0,
    "post_pct": 45.0
}

@pytest.mark.asyncio
async def test_metric_insert_via_mqtt(test_mqtt_broker, test_session, test_db_session):
    """Test inserting metrics via MQTT message."""
    # Create persister with test dependencies
    persister = DBMetricPersister(test_db_session)
    persister.mqtt_client = test_mqtt_broker
    
    # Start the persister
    await persister.start("localhost", 1883)
    
    # Create metric payload with session information
    metric_data = GAIT_METRIC.copy()
    metric_data["patient_id"] = test_session.patient_id
    
    # Simulate an MQTT message
    topic = "metrics/gait"
    payload = json.dumps(metric_data)
    
    # Process the message
    await persister.on_message(topic, payload)
    
    # Verify the metric was stored in the database
    result = await test_db_session.execute(
        select(PTMetricSample)
        .filter(PTMetricSample.session_id == test_session.id)
    )
    metrics = list(result.scalars().all())
    
    # Check that the metric was inserted
    assert len(metrics) == 1
    assert metrics[0].session_id == test_session.id
    assert metrics[0].cadence_spm == GAIT_METRIC["cadence_spm"]
    assert metrics[0].stride_len_in == GAIT_METRIC["stride_len_in"]
    
    # Stop the persister
    await persister.stop()

@pytest.mark.asyncio
async def test_multiple_metrics_processing(test_mqtt_broker, test_session, test_db_session):
    """Test processing multiple metrics."""
    # Create persister with test dependencies
    persister = DBMetricPersister(test_db_session)
    persister.mqtt_client = test_mqtt_broker
    
    # Start the persister
    await persister.start("localhost", 1883)
    
    # Process multiple messages with different metrics
    for i in range(3):
        # Create metric payload
        if i % 2 == 0:
            # Gait metric
            metric_data = GAIT_METRIC.copy()
            topic = "metrics/gait"
        else:
            # Balance metric
            metric_data = BALANCE_METRIC.copy()
            topic = "metrics/balance"
            
        # Update timestamp to avoid conflicts
        metric_data["ts"] = (datetime.utcnow() + timedelta(seconds=i)).isoformat()
        metric_data["patient_id"] = test_session.patient_id
        
        # Simulate an MQTT message
        payload = json.dumps(metric_data)
        await persister.on_message(topic, payload)
    
    # Give time for processing
    await asyncio.sleep(0.1)
    
    # Verify metrics were stored
    result = await test_db_session.execute(
        select(PTMetricSample)
        .filter(PTMetricSample.session_id == test_session.id)
    )
    metrics = list(result.scalars().all())
    
    # Check that all metrics were inserted
    assert len(metrics) == 3
    
    # Stop the persister
    await persister.stop()

@pytest.mark.asyncio
async def test_metrics_api(test_app, test_session, test_token, test_db_session):
    """Test the metrics API endpoints."""
    # Create some test metrics directly in the database
    for i in range(3):
        metric = PTMetricSample(
            session_id=test_session.id,
            ts=datetime.utcnow() + timedelta(seconds=i),
            cadence_spm=110.0 + i,
            stride_len_in=30.0 + i,
            symmetry_idx_pct=95.0
        )
        test_db_session.add(metric)
    
    await test_db_session.commit()
    
    # Test get metrics for session
    async with AsyncClient(app=test_app.app, base_url="http://test") as ac:
        response = await ac.get(
            f"/api/metrics/?session_id={test_session.id}",
            headers={"Authorization": f"Bearer {test_token}"}
        )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    
    # Verify all metrics belong to the session
    for metric in data:
        assert metric["session_id"] == test_session.id

@pytest.mark.asyncio
async def test_metric_aggregation(test_app, test_session, test_token, test_db_session):
    """Test metric aggregation endpoint."""
    # Create test metrics with different values
    metrics = [
        # Gait metrics
        PTMetricSample(
            session_id=test_session.id,
            ts=datetime.utcnow(),
            cadence_spm=110.0,
            stride_len_in=30.0,
            symmetry_idx_pct=95.0,
            turn_count=2
        ),
        PTMetricSample(
            session_id=test_session.id,
            ts=datetime.utcnow() + timedelta(seconds=1),
            cadence_spm=112.0,
            stride_len_in=31.0,
            symmetry_idx_pct=96.0,
            turn_count=3
        ),
        # Balance metric
        PTMetricSample(
            session_id=test_session.id,
            ts=datetime.utcnow() + timedelta(seconds=2),
            sway_vel_cm_s=4.0,
            left_pct=49.0,
            right_pct=51.0
        )
    ]
    
    for metric in metrics:
        test_db_session.add(metric)
    
    await test_db_session.commit()
    
    # Set session end time to enable aggregation
    test_session.end_ts = datetime.utcnow() + timedelta(seconds=10)
    await test_db_session.commit()
    
    # Test aggregation API
    async with AsyncClient(app=test_app.app, base_url="http://test") as ac:
        response = await ac.get(
            f"/api/metrics/aggregate/{test_session.id}",
            headers={"Authorization": f"Bearer {test_token}"}
        )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    
    # Verify aggregation results
    assert data["session_id"] == test_session.id
    
    # Check averages (may need adjustment based on your actual aggregation logic)
    assert 110.0 <= data.get("avg_cadence_spm", 0) <= 112.0
    assert 30.0 <= data.get("avg_stride_len_in", 0) <= 31.0
    assert data.get("total_turn_count", 0) == 5  # Sum of turn counts 