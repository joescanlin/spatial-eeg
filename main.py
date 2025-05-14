from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import logging
import asyncio

from src.backend.db.session import AsyncSessionLocal
from src.backend.db import models
from src.backend.routes import (
    auth_router,
    clinics_router,
    patients_router, 
    sessions_router,
    metrics_router
)
from src.backend.services.metric_ingest import DBMetricPersister

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="SmartStep-PT API",
    description="API for physical therapy monitoring and analytics",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth_router, prefix="/api")
app.include_router(clinics_router, prefix="/api")
app.include_router(patients_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")
app.include_router(metrics_router, prefix="/api")

# Dependency to get DB session
async def get_db():
    db = AsyncSessionLocal()
    try:
        yield db
    finally:
        await db.close()

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to PT Analytics API"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Global variable to store the metric persister
metric_persister = None

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up the API server")
    
    # Start the metric ingestion service
    global metric_persister
    try:
        # Create DB session
        db = AsyncSessionLocal()
        
        # Create metric persister
        metric_persister = DBMetricPersister(db)
        
        # Start metric persister (use localhost if running in development)
        broker_host = "localhost"  # Change to your MQTT broker host
        broker_port = 1883
        await metric_persister.start(broker_host, broker_port)
        
        logger.info(f"Metric ingestion service started, connected to {broker_host}:{broker_port}")
    except Exception as e:
        logger.error(f"Failed to start metric ingestion service: {str(e)}", exc_info=True)

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down the API server")
    
    # Stop the metric ingestion service
    global metric_persister
    if metric_persister:
        try:
            await metric_persister.stop()
            logger.info("Metric ingestion service stopped")
        except Exception as e:
            logger.error(f"Error stopping metric ingestion service: {str(e)}", exc_info=True)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 