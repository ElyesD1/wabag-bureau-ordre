from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.mail import MailRecord
from app.models.user import AppUser
from app.schemas.mail import MailOut
from app.services.stats import dashboard

router = APIRouter(tags=["stats"])


@router.get("/stats/dashboard")
def dashboard_stats(
    year: int | None = None,
    db: Session = Depends(get_db),
    _: AppUser = Depends(get_current_user),
) -> dict:
    y = year or date.today().year
    data = dashboard(db, y)
    recent = db.scalars(
        select(MailRecord).order_by(MailRecord.created_at.desc()).limit(6)
    ).all()
    data["recent"] = [MailOut.model_validate(r).model_dump(mode="json") for r in recent]
    return data
