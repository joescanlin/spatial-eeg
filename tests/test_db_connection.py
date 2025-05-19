import pytest
import asyncio
from sqlalchemy import text
from src.backend.db.session import engine

@pytest.mark.asyncio
async def test_supabase_connects():
    async with engine.begin() as conn:
        result = await conn.execute(text("select 1"))
        assert result.scalar() == 1 