from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health/version")
def version() -> dict:
    return {"app": "bureau-ordre", "version": settings.app_version, "api": "v1"}
