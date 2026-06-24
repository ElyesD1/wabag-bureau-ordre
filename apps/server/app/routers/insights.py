from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_role
from app.models.user import AppUser
from app.services.insights import register_insights

router = APIRouter(tags=["insights"])
_REG = {"entree": "E", "sortie": "S"}


@router.get("/registers/{register}/insights")
def insights(
    register: str,
    year: int | None = None,
    overdue_days: int = Query(7, ge=1, le=365),
    db: Session = Depends(get_db),
    _: AppUser = Depends(require_role("admin")),
) -> dict:
    if register not in _REG:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Registre inconnu")
    y = year or date.today().year
    return register_insights(db, _REG[register], y, overdue_days)
