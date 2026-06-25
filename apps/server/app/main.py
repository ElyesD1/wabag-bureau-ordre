from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.security import hash_password
from app.db.mongo import db, ensure_indexes
from app.routers import (
    attachments,
    audit,
    auth,
    documents,
    exports,
    health,
    insights,
    stats,
    users,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        ensure_indexes()
    except Exception:
        # Index creation is best-effort at startup; the app still serves.
        pass
    try:
        if settings.seed_admin_password and db.users.count_documents({}) == 0:
            db.users.insert_one({
                "username": settings.seed_admin_username.lower(),
                "full_name": settings.seed_admin_fullname,
                "password_hash": hash_password(settings.seed_admin_password),
                "role": "admin",
                "preferred_locale": "fr",
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "last_login_at": None,
            })
    except Exception:
        pass
    yield


app = FastAPI(title="WABAG · Bureau d'Ordre API", version=settings.app_version, lifespan=lifespan)

_allow_all = settings.cors_list == ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=not _allow_all,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (health, auth, documents, attachments, exports, users, stats, audit, insights):
    app.include_router(module.router)
