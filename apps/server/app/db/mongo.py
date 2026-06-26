import certifi
import gridfs
from pymongo import ASCENDING, MongoClient
from pymongo.database import Database

from app.core.config import settings

# One thread-safe client for the whole process (pymongo pools connections).
# tlsCAFile=certifi.where() pins the CA bundle so the TLS handshake to Atlas
# succeeds in frozen/PyInstaller builds regardless of the host's system CA store
# (without this, a bundled binary with no CA store times out connecting to Atlas).
_client = MongoClient(
    settings.mongodb_uri,
    serverSelectionTimeoutMS=30000,
    connectTimeoutMS=30000,
    tz_aware=True,
    tlsCAFile=certifi.where(),
)


def get_database(name: str | None = None) -> Database:
    return _client[name or settings.mongodb_db]


db: Database = get_database()


def gridfs_for(database: Database) -> gridfs.GridFS:
    return gridfs.GridFS(database)


def ensure_indexes(database: Database | None = None) -> None:
    d = database or db
    d.users.create_index([("username", ASCENDING)], unique=True)
    d.mail.create_index([("register", ASCENDING), ("year", ASCENDING), ("seq", ASCENDING)], unique=True)
    d.mail.create_index([("no_ordre", ASCENDING)], unique=True)
    d.mail.create_index([("register", ASCENDING), ("seq", ASCENDING)])
    d.status_history.create_index([("mail_id", ASCENDING)])
    d.audit_log.create_index([("at", ASCENDING)])
    d.attachments.create_index([("mail_id", ASCENDING)], unique=True)
    d.assistant_messages.create_index([("user_id", ASCENDING), ("at", ASCENDING)])
