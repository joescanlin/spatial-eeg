import asyncio
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from typing import AsyncGenerator, Optional
import os
import logging
from unittest.mock import MagicMock, AsyncMock

# Import from your application
from src.backend.db.models import Base
from src.backend.db.session import AsyncSessionLocal
from src.utils.mqtt_client import MQTTClient

# Configure test logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test database URL - Use SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Create a test engine for the database."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()

@pytest_asyncio.fixture
async def test_db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session for each test."""
    async_session = sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
        await session.rollback()

@pytest.fixture
def override_get_db(test_db_session):
    """Override the get_db dependency for FastAPI tests."""
    async def _override_get_db():
        try:
            yield test_db_session
        finally:
            await test_db_session.close()
    
    return _override_get_db

@pytest.fixture
def mock_mqtt_client():
    """Create a mock MQTT client for testing."""
    client = MagicMock()
    client.connect = AsyncMock(return_value=True)
    client.disconnect = AsyncMock(return_value=True)
    client.publish = AsyncMock(return_value=True)
    client.subscribe = AsyncMock(return_value=True)
    
    return client

@pytest_asyncio.fixture
async def test_mqtt_broker():
    """Simulate an MQTT broker for testing."""
    broker = MagicMock()
    broker.start = AsyncMock(return_value=True)
    broker.stop = AsyncMock(return_value=True)
    broker.publish = AsyncMock(return_value=True)
    broker.subscribe = AsyncMock(return_value=True)
    broker.messages = []
    
    # Method to simulate publishing a message
    async def mock_publish(topic, payload, qos=0, retain=False):
        broker.messages.append({"topic": topic, "payload": payload})
        return True
    
    broker.publish.side_effect = mock_publish
    
    return broker

@pytest.fixture
def test_app(override_get_db):
    """Create a test FastAPI app instance."""
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from src.backend.routes import (
        auth_router,
        clinics_router,
        patients_router,
        sessions_router,
        metrics_router
    )
    
    app = FastAPI(title="SmartStep-PT API Test")
    
    # Include all routers
    app.include_router(auth_router, prefix="/api")
    app.include_router(clinics_router, prefix="/api")
    app.include_router(patients_router, prefix="/api")
    app.include_router(sessions_router, prefix="/api")
    app.include_router(metrics_router, prefix="/api")
    
    # Override the database dependency
    from main import get_db
    app.dependency_overrides[get_db] = override_get_db
    
    # Create and return the test client
    client = TestClient(app)
    client.app = app  # Store the app on the client for test access
    return client 