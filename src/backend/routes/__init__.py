from src.backend.routes.auth import router as auth_router
from src.backend.routes.clinics import router as clinics_router
from src.backend.routes.patients import router as patients_router
from src.backend.routes.sessions import router as sessions_router
from src.backend.routes.metrics import router as metrics_router

__all__ = [
    "auth_router",
    "clinics_router",
    "patients_router",
    "sessions_router",
    "metrics_router"
] 