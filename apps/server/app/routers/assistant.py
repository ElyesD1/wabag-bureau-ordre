from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from pymongo.database import Database

from app.core.deps import get_current_user, get_db
from app.schemas.assistant import AssistantLogIn, AssistantMessage

router = APIRouter(tags=["assistant"])


@router.get("/assistant/history", response_model=list[AssistantMessage])
def history(
    limit: int = Query(40, ge=1, le=200),
    db: Database = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    rows = list(db.assistant_messages.find({"user_id": user["_id"]}).sort("at", -1).limit(limit))
    rows.reverse()
    return [{"role": r["role"], "text": r["text"], "intent": r.get("intent"), "at": r["at"]} for r in rows]


@router.post("/assistant/log", status_code=204)
def log(body: AssistantLogIn, db: Database = Depends(get_db), user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    db.assistant_messages.insert_many([
        {"user_id": user["_id"], "role": "user", "text": body.user_text, "intent": body.intent, "at": now},
        {"user_id": user["_id"], "role": "bot", "text": body.bot_text, "intent": body.intent, "at": now},
    ])


@router.delete("/assistant/history", status_code=204)
def clear(db: Database = Depends(get_db), user: dict = Depends(get_current_user)):
    db.assistant_messages.delete_many({"user_id": user["_id"]})
