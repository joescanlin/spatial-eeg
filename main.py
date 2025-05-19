from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import logging
import asyncio
import json
from fastapi.responses import StreamingResponse
import queue
import time

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

# Create a queue for metrics events
metrics_queue = queue.Queue()

# Metric persister class needs access to the queue
# The line below is inserted right before startup_event function
metric_persister = None

# Create a custom message handler that we can pass to the metric persister
def handle_metric_message(topic, payload):
    """Handle metric messages by adding them to the queue for SSE streaming."""
    try:
        # Add the message to the queue for SSE streaming
        metrics_queue.put({"event": "metrics", "data": payload})
        logger.debug(f"Added metric to queue: {topic}")
    except Exception as e:
        logger.error(f"Error handling metric message: {str(e)}")

# Add OPTIONS method to handle preflight CORS requests
@app.options("/api/metrics-stream")
async def metrics_stream_options():
    """Handle OPTIONS requests for CORS preflight."""
    return {}

@app.get("/api/metrics-stream")
async def metrics_stream(request: Request):
    """SSE endpoint for streaming metrics data to the frontend."""
    # If it's a HEAD request, return headers only
    if request.method == "HEAD":
        return StreamingResponse(
            content=iter([b""]),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        )
    
    async def event_generator():
        try:
            logger.info("Client connected to metrics stream")
            # Keep the connection alive
            while True:
                # Check if the client has disconnected
                if await request.is_disconnected():
                    logger.info("Client disconnected from metrics stream")
                    break
                
                try:
                    # Try to get a message from the queue with a timeout
                    message = metrics_queue.get(timeout=1)
                    # Format it as a server-sent event
                    event_data = f"event: {message['event']}\ndata: {json.dumps(message['data'])}\n\n"
                    yield event_data
                except queue.Empty:
                    # If no messages, send a keepalive event
                    yield f"event: keepalive\ndata: {json.dumps({'timestamp': time.time()})}\n\n"
                    await asyncio.sleep(1)
                    
        except Exception as e:
            logger.error(f"Error in metrics stream: {str(e)}")
            # Close the connection
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    )

# Add a test endpoint to simulate sensor data
@app.post("/api/test-metrics")
async def test_metrics(data: dict):
    """Test endpoint to manually send metrics to connected clients."""
    try:
        logger.info(f"Sending test metrics: {data}")
        # Add the message to the queue
        metrics_queue.put({"event": "metrics", "data": data})
        return {"status": "success", "message": "Test metrics sent"}
    except Exception as e:
        logger.error(f"Error sending test metrics: {str(e)}")
        return {"status": "error", "message": str(e)}

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up the API server")
    
    # Start the metric ingestion service
    global metric_persister
    try:
        # Create DB session
        db = AsyncSessionLocal()
        
        # Create metric persister with custom message handler
        metric_persister = DBMetricPersister(db)
        
        # Register the custom message handler
        metric_persister.register_message_handler(handle_metric_message)
        
        # Start metric persister with the physical sensor grid MQTT broker
        broker_host = "169.254.100.100"  # Physical sensor grid IP address
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