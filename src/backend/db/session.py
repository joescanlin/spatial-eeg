from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from src.utils.config import get_settings
import os

settings = get_settings()

# Get database URL from settings
db_url = settings.DATABASE_URL

# Ensure we're using postgresql:// not postgres:// for SQLAlchemy
if db_url.startswith('postgres://'):
    db_url = db_url.replace('postgres://', 'postgresql://')

# Create sync engine for alembic migrations
engine_sync = create_engine(
    db_url,
    pool_pre_ping=True
)

# Create session factory for sync operations
SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine_sync
)

# Create async engine for async operations
async_db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
engine = create_async_engine(
    async_db_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False) 