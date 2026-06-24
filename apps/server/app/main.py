from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import attachments, auth, documents, exports, health, stats, users

app = FastAPI(title="WABAG · Bureau d'Ordre API", version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(attachments.router)
app.include_router(exports.router)
app.include_router(users.router)
app.include_router(stats.router)
