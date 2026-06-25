from datetime import date

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.core.deps import get_current_user, get_db
from app.services.serialize import serialize_mail
from app.services.stats import dashboard

router = APIRouter(tags=["stats"])


@router.get("/stats/dashboard")
def dashboard_stats(year: int | None = None, db: Database = Depends(get_db), _: dict = Depends(get_current_user)) -> dict:
    y = year or date.today().year
    data = dashboard(db, y)
    recent = list(db.mail.find().sort("created_at", -1).limit(6))
    data["recent"] = [serialize_mail(d) for d in recent]
    return data
