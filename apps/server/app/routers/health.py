from fastapi import APIRouter, Response, status

from app.core.config import settings
from app.db.mongo import db

router = APIRouter(tags=["health"])


@router.get("/health/version")
def version() -> dict:
    return {"app": "bureau-ordre", "version": settings.app_version, "api": "v1", "db": "mongodb"}


@router.get("/health/ready")
def ready(response: Response) -> dict:
    # Real readiness: confirm the database is actually reachable, not just that the
    # HTTP server bound. The desktop launcher polls this before revealing the app,
    # so a network/Atlas problem surfaces as a clear error instead of a broken UI.
    try:
        db.command("ping")
        return {"ready": True}
    except Exception:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"ready": False}
