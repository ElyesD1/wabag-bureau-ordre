from datetime import datetime, timezone

from pymongo.database import Database


def log_action(db: Database, *, actor_id, action: str, entity=None, entity_id=None, detail=None) -> None:
    db.audit_log.insert_one({
        "actor_id": actor_id,
        "action": action,
        "entity": entity,
        "entity_id": entity_id,
        "detail": detail,
        "at": datetime.now(timezone.utc),
        "ip": None,
    })
