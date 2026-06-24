# Server Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the FastAPI + PostgreSQL backend foundation for the WABAG Bureau d'Ordre: schema + migrations, the concurrency-safe per-year auto-numbering (proven by a parallel test), Argon2id+JWT auth with audit stamping, and the core document CRUD (Saisie / Consultation / Modification-Statut) for both registers.

**Architecture:** Sync SQLAlchemy 2.0 (psycopg3) with `def` endpoints (FastAPI runs them in a threadpool) so the numbering transaction's row-lock logic is explicit and correct. All numbers are minted server-side in one transaction via an `INSERT … ON CONFLICT … RETURNING` on a per-`(register, year)` counter row; `no_ordre` is a Postgres STORED generated column. Clients hold only a JWT; the server is the sole DB-credential holder and stamps `created_by`/`modified_by`. Status changes append to an INSERT-only `status_history`.

**Tech Stack:** Python 3.12 · FastAPI · SQLAlchemy 2.0 · Alembic · psycopg3 · Pydantic v2 · passlib[argon2] / argon2-cffi · PyJWT · pytest · PostgreSQL 16.

> **Scope:** This plan covers the backend through core CRUD. Attachments (PDF upload/stream), Excel/PDF exports, the Electron+React client, and the Windows packaging are **separate follow-up plans**. This plan alone yields a runnable, tested API.

> **Local dev DB note:** install Postgres for dev with `brew install postgresql@16 && brew services start postgresql@16`. (This is the *dev* DB only — the production server is packaged as a native Windows service per the deploy spec.) Use a **Python 3.12** venv (`brew install python@3.12`) to avoid bleeding-edge wheel gaps on 3.14.

---

## File Structure

```
apps/server/
├─ pyproject.toml              # deps + tool config (ruff, pytest)
├─ .env.example                # DATABASE_URL, JWT_SECRET, …
├─ alembic.ini
├─ alembic/
│  ├─ env.py                   # wires Alembic to app metadata + settings
│  └─ versions/0001_initial.py # all 6 tables
├─ app/
│  ├─ main.py                  # FastAPI app, router mounting, /health
│  ├─ core/
│  │  ├─ config.py             # pydantic-settings Settings
│  │  ├─ security.py           # argon2 hash/verify, JWT encode/decode
│  │  └─ deps.py               # get_db, get_current_user, require_role
│  ├─ db/
│  │  ├─ base.py               # DeclarativeBase + naming convention
│  │  └─ session.py            # engine + SessionLocal
│  ├─ models/
│  │  ├─ user.py               # app_user
│  │  ├─ mail.py               # mail_counter, mail_record
│  │  ├─ history.py            # status_history
│  │  └─ audit.py              # attachment (stub FK target), audit_log
│  ├─ schemas/
│  │  ├─ auth.py               # LoginIn, TokenOut, UserOut
│  │  └─ mail.py               # MailCreate, MailOut, StatusUpdate, PageOut
│  ├─ services/
│  │  └─ numbering.py          # allocate_and_insert() — the only number minter
│  └─ routers/
│     ├─ auth.py               # POST /auth/login, /auth/me
│     ├─ documents.py          # create, list (filter/sort/paginate), get, update-status
│     └─ health.py             # GET /health/version
├─ scripts/
│  └─ seed_admin.py            # create first admin
└─ tests/
   ├─ conftest.py              # test DB engine + fixtures
   ├─ test_numbering.py        # concurrency: N parallel Saisie → 0 dup / 0 gap
   ├─ test_auth.py
   └─ test_documents.py
```

---

### Task 1: Project setup & configuration

**Files:**
- Create: `apps/server/pyproject.toml`
- Create: `apps/server/.env.example`
- Create: `apps/server/app/__init__.py` (empty), `apps/server/app/core/__init__.py` (empty)
- Create: `apps/server/app/core/config.py`

- [ ] **Step 1: Write `pyproject.toml`**

```toml
[project]
name = "wabag-bureau-ordre-server"
version = "1.0.0"
requires-python = ">=3.11"
dependencies = [
  "fastapi>=0.115",
  "uvicorn[standard]>=0.32",
  "sqlalchemy>=2.0.36",
  "psycopg[binary]>=3.2",
  "alembic>=1.14",
  "pydantic>=2.9",
  "pydantic-settings>=2.6",
  "passlib[argon2]>=1.7.4",
  "argon2-cffi>=23.1",
  "pyjwt>=2.10",
  "python-multipart>=0.0.12",
]

[project.optional-dependencies]
dev = ["pytest>=8.3", "httpx>=0.27", "ruff>=0.8"]

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-v"

[tool.ruff]
line-length = 100
```

- [ ] **Step 2: Write `.env.example`**

```bash
DATABASE_URL=postgresql+psycopg://bo_app:bo_app_pw@localhost:5432/bureau_ordre
JWT_SECRET=change-me-32-bytes-min-in-production
JWT_ACCESS_TTL_MIN=30
JWT_REFRESH_TTL_DAYS=7
APP_VERSION=1.0.0
CORS_ORIGINS=http://localhost:5173
```

- [ ] **Step 3: Write `app/core/config.py`**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://bo_app:bo_app_pw@localhost:5432/bureau_ordre"
    jwt_secret: str = "dev-only-secret-change-me"
    jwt_access_ttl_min: int = 30
    jwt_refresh_ttl_days: int = 7
    app_version: str = "1.0.0"
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
```

- [ ] **Step 4: Create the venv and install (verify it resolves)**

```bash
cd apps/server
python3.12 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
python -c "import fastapi, sqlalchemy, alembic, jwt, passlib; print('deps OK')"
```
Expected: `deps OK`

- [ ] **Step 5: Commit**

```bash
git add apps/server/pyproject.toml apps/server/.env.example apps/server/app/
git commit -m "feat(server): project setup + settings"
```

---

### Task 2: Database base + session

**Files:**
- Create: `apps/server/app/db/__init__.py` (empty)
- Create: `apps/server/app/db/base.py`
- Create: `apps/server/app/db/session.py`

- [ ] **Step 1: Write `app/db/base.py`** (naming convention so Alembic autogenerate/constraints are stable)

```python
from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

NAMING = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING)
```

- [ ] **Step 2: Write `app/db/session.py`**

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/app/db/
git commit -m "feat(server): SQLAlchemy base + session"
```

---

### Task 3: ORM models (all 6 tables)

**Files:**
- Create: `apps/server/app/models/__init__.py`, `user.py`, `mail.py`, `history.py`, `audit.py`

- [ ] **Step 1: Write `app/models/user.py`**

```python
import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AppUser(Base):
    __tablename__ = "app_user"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False, server_default=text("'clerk'"))
    preferred_locale: Mapped[str] = mapped_column(String(2), nullable=False, server_default=text("'fr'"))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("role in ('admin','clerk')", name="role_valid"),
        CheckConstraint("preferred_locale in ('fr','en')", name="locale_valid"),
    )
```

- [ ] **Step 2: Write `app/models/mail.py`**

```python
import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint, Date, DateTime, ForeignKey, Integer, String,
    UniqueConstraint, func, text, Computed,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

NO_ORDRE_EXPR = (
    "(case when register='E' then 'BOE' else 'BOS' end "
    "|| year::text || lpad(seq::text, 4, '0'))"
)


class MailCounter(Base):
    __tablename__ = "mail_counter"
    register: Mapped[str] = mapped_column(String(1), primary_key=True)
    year: Mapped[int] = mapped_column(Integer, primary_key=True)
    last_seq: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    __table_args__ = (CheckConstraint("register in ('E','S')", name="counter_register_valid"),)


class MailRecord(Base):
    __tablename__ = "mail_record"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    register: Mapped[str] = mapped_column(String(1), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    no_ordre: Mapped[str] = mapped_column(String(20), Computed(NO_ORDRE_EXPR, persisted=True))
    date_enregistrement: Mapped[date] = mapped_column(Date, nullable=False, server_default=func.current_date())
    type_document: Mapped[str] = mapped_column(String(64), nullable=False)
    reference: Mapped[str | None] = mapped_column(String(120), nullable=True)
    objet: Mapped[str | None] = mapped_column(String(400), nullable=True)
    expediteur: Mapped[str | None] = mapped_column(String(160), nullable=True)
    projet: Mapped[str | None] = mapped_column(String(160), nullable=True)
    destinataire: Mapped[str | None] = mapped_column(String(160), nullable=True)
    date_remise_destinataire: Mapped[date | None] = mapped_column(Date, nullable=True)
    dernier_statut: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_user.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    modified_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id"), nullable=True)
    modified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("register in ('E','S')", name="record_register_valid"),
        UniqueConstraint("register", "year", "seq", name="reg_year_seq"),
        UniqueConstraint("no_ordre", name="no_ordre"),
    )
```

- [ ] **Step 3: Write `app/models/history.py`**

```python
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class StatusHistory(Base):
    __tablename__ = "status_history"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    mail_record_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("mail_record.id", ondelete="RESTRICT"), nullable=False
    )
    old_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    new_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    changed_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_user.id"), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    note: Mapped[str | None] = mapped_column(String(400), nullable=True)
```

- [ ] **Step 4: Write `app/models/audit.py`** (attachment table created now as the FK target for the later attachments plan; audit_log for traceability)

```python
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, func, text
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Attachment(Base):
    __tablename__ = "attachment"
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    mail_record_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("mail_record.id", ondelete="RESTRICT"), unique=True, nullable=False
    )
    relative_path: Mapped[str] = mapped_column(String, nullable=False)
    original_filename: Mapped[str | None] = mapped_column(String, nullable=True)
    content_type: Mapped[str] = mapped_column(String, nullable=False, server_default=text("'application/pdf'"))
    byte_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_user.id"), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(40), nullable=False)
    entity: Mapped[str | None] = mapped_column(String(40), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String, nullable=True)
    detail: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ip: Mapped[str | None] = mapped_column(INET, nullable=True)
```

- [ ] **Step 5: Write `app/models/__init__.py`** (so Alembic sees all metadata)

```python
from app.models.audit import Attachment, AuditLog  # noqa: F401
from app.models.history import StatusHistory  # noqa: F401
from app.models.mail import MailCounter, MailRecord  # noqa: F401
from app.models.user import AppUser  # noqa: F401
```

- [ ] **Step 6: Commit**

```bash
git add apps/server/app/models/
git commit -m "feat(server): ORM models for all 6 tables"
```

---

### Task 4: Alembic migration (initial schema)

**Files:**
- Create: `apps/server/alembic.ini`, `apps/server/alembic/env.py`, `apps/server/alembic/script.py.mako`
- Create: `apps/server/alembic/versions/0001_initial.py`

- [ ] **Step 1: Init Alembic and wire `env.py`** — run `alembic init alembic` inside `apps/server`, then replace the generated `env.py` body to use our metadata + URL:

```python
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.db.base import Base
import app.models  # noqa: F401  (registers all tables)

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)
if config.config_file_name:
    fileConfig(config.config_file_name)
target_metadata = Base.metadata


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.", poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()
```

- [ ] **Step 2: Ensure `pgcrypto` for `gen_random_uuid()`** — at the TOP of the migration `upgrade()`, add the extension, then autogenerate the rest:

```bash
# from apps/server, with the dev DB created and reachable:
createdb bureau_ordre 2>/dev/null || true
alembic revision --autogenerate -m "initial" --rev-id 0001_initial
```
Then edit `alembic/versions/0001_initial.py` so `upgrade()` begins with:

```python
def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    # ... autogenerated create_table calls follow ...
```

- [ ] **Step 3: Apply and verify the generated column works**

```bash
alembic upgrade head
psql bureau_ordre -c "\d mail_record" | grep no_ordre
```
Expected: `no_ordre` shown as `generated always as (...) stored`.

- [ ] **Step 4: Commit**

```bash
git add apps/server/alembic.ini apps/server/alembic/
git commit -m "feat(server): initial Alembic migration (6 tables + pgcrypto)"
```

---

### Task 5: Numbering service + CONCURRENCY TEST (the crown jewel — TDD)

**Files:**
- Create: `apps/server/app/services/__init__.py` (empty), `apps/server/app/services/numbering.py`
- Create: `apps/server/tests/__init__.py` (empty), `apps/server/tests/conftest.py`, `apps/server/tests/test_numbering.py`

- [ ] **Step 1: Write `tests/conftest.py`** (a clean DB per test session against a dedicated test database)

```python
import os
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

TEST_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://bo_app:bo_app_pw@localhost:5432/bureau_ordre_test",
)


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(TEST_URL, future=True)
    # apply schema via Alembic-equivalent: import metadata and create_all + extension
    from app.db.base import Base
    import app.models  # noqa: F401
    with eng.begin() as c:
        c.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    return eng


@pytest.fixture
def Session(engine):
    return sessionmaker(bind=engine, future=True, expire_on_commit=False)


@pytest.fixture
def admin_id(engine, Session):
    from app.models.user import AppUser
    with Session() as s:
        u = AppUser(username="tester", full_name="Tester", password_hash="x", role="admin")
        s.add(u); s.commit(); s.refresh(u)
        return u.id
```

- [ ] **Step 2: Write the failing concurrency test `tests/test_numbering.py`**

```python
import concurrent.futures as cf

from sqlalchemy import select
from app.models.mail import MailRecord
from app.services.numbering import allocate_and_insert


def _saisie(Session, admin_id):
    with Session() as s:
        rec = allocate_and_insert(
            s, register="E", created_by=admin_id,
            data={"type_document": "Lettre", "objet": "test"},
        )
        s.commit()
        return rec.no_ordre


def test_parallel_saisie_no_dup_no_gap(Session, admin_id):
    N = 40
    with cf.ThreadPoolExecutor(max_workers=12) as ex:
        numbers = list(ex.map(lambda _: _saisie(Session, admin_id), range(N)))

    assert len(numbers) == N
    assert len(set(numbers)) == N, "duplicate N° d'ordre under concurrency"

    with Session() as s:
        seqs = sorted(r.seq for r in s.scalars(select(MailRecord)).all())
    assert seqs == list(range(1, N + 1)), f"gaps/dups in seq: {seqs}"
    assert numbers[0].startswith("BOE2026") if False else all(n.startswith("BOE") for n in numbers)
```

- [ ] **Step 3: Run it — verify it FAILS** (no `allocate_and_insert` yet)

Run: `cd apps/server && source .venv/bin/activate && pytest tests/test_numbering.py -v`
Expected: FAIL / ImportError `cannot import name 'allocate_and_insert'`.

- [ ] **Step 4: Implement `app/services/numbering.py`**

```python
import uuid
from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.mail import MailRecord


def allocate_and_insert(
    db: Session, *, register: str, created_by: uuid.UUID, data: dict
) -> MailRecord:
    """Mint the next N° d'ordre and insert the record in ONE transaction.

    The ON CONFLICT upsert takes a row-level write lock on the single
    (register, year) counter row, serialising concurrent allocators so the
    sequence is duplicate-free and (sharing the caller's transaction) gap-free
    on rollback. The caller commits.
    """
    if register not in ("E", "S"):
        raise ValueError("register must be 'E' or 'S'")
    year = date.today().year

    seq = db.execute(
        text(
            """
            INSERT INTO mail_counter (register, year, last_seq)
            VALUES (:r, :y, 1)
            ON CONFLICT (register, year)
            DO UPDATE SET last_seq = mail_counter.last_seq + 1
            RETURNING last_seq
            """
        ),
        {"r": register, "y": year},
    ).scalar_one()

    rec = MailRecord(register=register, year=year, seq=seq, created_by=created_by, **data)
    db.add(rec)
    db.flush()       # get generated no_ordre
    db.refresh(rec)  # load the STORED generated column
    return rec
```

- [ ] **Step 5: Run the concurrency test — verify it PASSES**

Run: `pytest tests/test_numbering.py -v`
Expected: PASS — 40 unique `BOE2026####`, seqs exactly `1..40`.

- [ ] **Step 6: Commit**

```bash
git add apps/server/app/services/numbering.py apps/server/tests/
git commit -m "feat(server): concurrency-safe per-year numbering + parallel test"
```

---

### Task 6: Security (Argon2id + JWT)

**Files:**
- Create: `apps/server/app/core/security.py`
- Create: `apps/server/tests/test_auth.py` (unit part)

- [ ] **Step 1: Write the failing hash/JWT test (`tests/test_auth.py`)**

```python
from app.core.security import hash_password, verify_password, create_access_token, decode_token


def test_password_roundtrip():
    h = hash_password("s3cret!")
    assert h != "s3cret!"
    assert verify_password("s3cret!", h)
    assert not verify_password("wrong", h)


def test_jwt_roundtrip():
    tok = create_access_token(subject="abc", role="clerk")
    claims = decode_token(tok)
    assert claims["sub"] == "abc"
    assert claims["role"] == "clerk"
```

- [ ] **Step 2: Run — verify FAIL** (module missing)

Run: `pytest tests/test_auth.py -v`
Expected: FAIL ImportError.

- [ ] **Step 3: Implement `app/core/security.py`**

```python
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.core.config import settings

_pwd = CryptContext(schemes=["argon2"], deprecated="auto")
ALGO = "HS256"


def hash_password(raw: str) -> str:
    return _pwd.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    return _pwd.verify(raw, hashed)


def _token(subject: str, role: str, ttl: timedelta, kind: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": subject, "role": role, "type": kind, "iat": now, "exp": now + ttl}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGO)


def create_access_token(subject: str, role: str) -> str:
    return _token(subject, role, timedelta(minutes=settings.jwt_access_ttl_min), "access")


def create_refresh_token(subject: str, role: str) -> str:
    return _token(subject, role, timedelta(days=settings.jwt_refresh_ttl_days), "refresh")


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[ALGO])
```

- [ ] **Step 4: Run — verify PASS**

Run: `pytest tests/test_auth.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/app/core/security.py apps/server/tests/test_auth.py
git commit -m "feat(server): argon2 hashing + JWT tokens"
```

---

### Task 7: Dependencies (DB session, current user, role guard)

**Files:**
- Create: `apps/server/app/core/deps.py`
- Create: `apps/server/app/schemas/__init__.py` (empty), `apps/server/app/schemas/auth.py`

- [ ] **Step 1: Write `app/schemas/auth.py`**

```python
import uuid
from pydantic import BaseModel


class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    full_name: str
    role: str
    preferred_locale: str

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Write `app/core/deps.py`**

```python
import uuid
from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.user import AppUser

bearer = HTTPBearer(auto_error=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> AppUser:
    try:
        claims = decode_token(creds.credentials)
        if claims.get("type") != "access":
            raise ValueError("not an access token")
        user_id = uuid.UUID(claims["sub"])
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Identifiants invalides")
    user = db.get(AppUser, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Compte inactif")
    return user


def require_role(*roles: str):
    def _guard(user: AppUser = Depends(get_current_user)) -> AppUser:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Accès refusé")
        return user
    return _guard
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/app/core/deps.py apps/server/app/schemas/auth.py
git commit -m "feat(server): request deps + auth schemas"
```

---

### Task 8: Auth router (login / me)

**Files:**
- Create: `apps/server/app/routers/__init__.py` (empty), `apps/server/app/routers/auth.py`

- [ ] **Step 1: Write `app/routers/auth.py`**

```python
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.security import create_access_token, create_refresh_token, verify_password
from app.models.user import AppUser
from app.schemas.auth import LoginIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    user = db.scalar(select(AppUser).where(AppUser.username == body.username))
    if user is None or not user.is_active or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Identifiant ou mot de passe incorrect")
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    sub, role = str(user.id), user.role
    return TokenOut(access_token=create_access_token(sub, role), refresh_token=create_refresh_token(sub, role))


@router.get("/me", response_model=UserOut)
def me(user: AppUser = Depends(get_current_user)) -> AppUser:
    return user
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/app/routers/auth.py
git commit -m "feat(server): auth router (login + me)"
```

---

### Task 9: Document schemas

**Files:**
- Create: `apps/server/app/schemas/mail.py`

- [ ] **Step 1: Write `app/schemas/mail.py`**

```python
import uuid
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class MailCreate(BaseModel):
    type_document: str = Field(min_length=1, max_length=64)
    reference: Optional[str] = Field(default=None, max_length=120)
    objet: Optional[str] = Field(default=None, max_length=400)
    expediteur: Optional[str] = Field(default=None, max_length=160)
    projet: Optional[str] = Field(default=None, max_length=160)
    destinataire: Optional[str] = Field(default=None, max_length=160)
    date_remise_destinataire: Optional[date] = None
    dernier_statut: Optional[str] = Field(default=None, max_length=64)


class StatusUpdate(BaseModel):
    new_status: str = Field(min_length=1, max_length=64)
    note: Optional[str] = Field(default=None, max_length=400)


class MailOut(BaseModel):
    id: uuid.UUID
    register: str
    no_ordre: str
    date_enregistrement: date
    type_document: str
    reference: Optional[str]
    objet: Optional[str]
    expediteur: Optional[str]
    projet: Optional[str]
    destinataire: Optional[str]
    date_remise_destinataire: Optional[date]
    dernier_statut: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


class PageOut(BaseModel):
    items: list[MailOut]
    total: int
    page: int
    page_size: int


Register = Literal["entree", "sortie"]
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/app/schemas/mail.py
git commit -m "feat(server): document schemas"
```

---

### Task 10: Documents router (Saisie / Consultation / Modification-Statut) — TDD via API

**Files:**
- Create: `apps/server/app/routers/documents.py`
- Create: `apps/server/tests/test_documents.py`

- [ ] **Step 1: Write the failing API test `tests/test_documents.py`**

```python
import pytest
from fastapi.testclient import TestClient

from app.core.deps import get_db
from app.core.security import hash_password
from app.main import app
from app.models.user import AppUser


@pytest.fixture
def client(engine, Session):
    def _override():
        with Session() as s:
            yield s
    app.dependency_overrides[get_db] = _override
    with Session() as s:
        if not s.query(AppUser).filter_by(username="amel").first():
            s.add(AppUser(username="amel", full_name="Amel", password_hash=hash_password("pw"), role="clerk"))
            s.commit()
    yield TestClient(app)
    app.dependency_overrides.clear()


def _token(client):
    r = client.post("/auth/login", json={"username": "amel", "password": "pw"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_saisie_then_consultation_and_status(client):
    h = {"Authorization": f"Bearer {_token(client)}"}

    r = client.post("/registers/entree/documents",
                    json={"type_document": "Facture", "objet": "Décompte N°1", "expediteur": "ONAS"},
                    headers=h)
    assert r.status_code == 201, r.text
    doc = r.json()
    assert doc["no_ordre"].startswith("BOE") and doc["register"] == "E"

    r = client.get("/registers/entree/documents?q=ONAS", headers=h)
    assert r.status_code == 200
    assert r.json()["total"] >= 1

    r = client.patch(f"/documents/{doc['id']}/status",
                     json={"new_status": "Clos", "note": "reçu"}, headers=h)
    assert r.status_code == 200
    assert r.json()["dernier_statut"] == "Clos"
```

- [ ] **Step 2: Run — verify FAIL** (router not mounted)

Run: `pytest tests/test_documents.py -v`
Expected: FAIL (404 / app has no such routes).

- [ ] **Step 3: Implement `app/routers/documents.py`**

```python
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.history import StatusHistory
from app.models.mail import MailRecord
from app.models.user import AppUser
from app.schemas.mail import MailCreate, MailOut, PageOut, StatusUpdate
from app.services.numbering import allocate_and_insert

router = APIRouter(tags=["documents"])
_REG = {"entree": "E", "sortie": "S"}


def _reg_code(register: str) -> str:
    if register not in _REG:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Registre inconnu")
    return _REG[register]


@router.post("/registers/{register}/documents", response_model=MailOut, status_code=201)
def saisie(register: str, body: MailCreate,
           db: Session = Depends(get_db), user: AppUser = Depends(get_current_user)) -> MailRecord:
    code = _reg_code(register)
    rec = allocate_and_insert(db, register=code, created_by=user.id, data=body.model_dump(exclude_none=True))
    db.add(StatusHistory(mail_record_id=rec.id, old_status=None,
                         new_status=rec.dernier_statut, changed_by=user.id))
    db.commit()
    db.refresh(rec)
    return rec


@router.get("/registers/{register}/documents", response_model=PageOut)
def consultation(register: str,
                 q: str | None = None,
                 type_document: str | None = None,
                 statut: str | None = None,
                 projet: str | None = None,
                 page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=200),
                 db: Session = Depends(get_db), _: AppUser = Depends(get_current_user)) -> PageOut:
    code = _reg_code(register)
    stmt = select(MailRecord).where(MailRecord.register == code)
    if type_document:
        stmt = stmt.where(MailRecord.type_document == type_document)
    if statut:
        stmt = stmt.where(MailRecord.dernier_statut == statut)
    if projet:
        stmt = stmt.where(MailRecord.projet == projet)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(
            MailRecord.no_ordre.ilike(like), MailRecord.objet.ilike(like),
            MailRecord.expediteur.ilike(like), MailRecord.reference.ilike(like),
            MailRecord.destinataire.ilike(like),
        ))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(
        stmt.order_by(MailRecord.seq.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return PageOut(items=list(rows), total=total or 0, page=page, page_size=page_size)


@router.patch("/documents/{doc_id}/status", response_model=MailOut)
def update_status(doc_id: uuid.UUID, body: StatusUpdate,
                  db: Session = Depends(get_db), user: AppUser = Depends(get_current_user)) -> MailRecord:
    rec = db.get(MailRecord, doc_id)
    if rec is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document introuvable")
    old = rec.dernier_statut
    rec.dernier_statut = body.new_status
    rec.modified_by = user.id
    rec.modified_at = datetime.now(timezone.utc)
    db.add(StatusHistory(mail_record_id=rec.id, old_status=old,
                         new_status=body.new_status, changed_by=user.id, note=body.note))
    db.commit()
    db.refresh(rec)
    return rec
```

- [ ] **Step 4: Mount routers in `app/main.py` (Task 11) then run — verify PASS**

Run (after Task 11): `pytest tests/test_documents.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/app/routers/documents.py apps/server/tests/test_documents.py
git commit -m "feat(server): documents router (saisie/consultation/status) + tests"
```

---

### Task 11: App entrypoint + health + seed admin

**Files:**
- Create: `apps/server/app/main.py`
- Create: `apps/server/app/routers/health.py`
- Create: `apps/server/scripts/seed_admin.py`

- [ ] **Step 1: Write `app/routers/health.py`**

```python
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health/version")
def version() -> dict:
    return {"app": "bureau-ordre", "version": settings.app_version, "api": "v1"}
```

- [ ] **Step 2: Write `app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, documents, health

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
```

- [ ] **Step 3: Write `scripts/seed_admin.py`**

```python
"""Create the first admin. Usage: python -m scripts.seed_admin <username> <full_name> <password>"""
import sys

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import AppUser


def main() -> None:
    if len(sys.argv) != 4:
        print("usage: python -m scripts.seed_admin <username> <full_name> <password>")
        raise SystemExit(2)
    username, full_name, password = sys.argv[1:4]
    with SessionLocal() as s:
        if s.query(AppUser).filter_by(username=username).first():
            print(f"user '{username}' already exists"); return
        s.add(AppUser(username=username, full_name=full_name,
                      password_hash=hash_password(password), role="admin"))
        s.commit()
        print(f"admin '{username}' created")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run the FULL suite + boot the server**

```bash
cd apps/server && source .venv/bin/activate
createdb bureau_ordre_test 2>/dev/null || true
pytest -v          # all tests green: numbering, auth, documents
uvicorn app.main:app --reload --port 8000 &
curl -s localhost:8000/health/version
```
Expected: all tests PASS; health returns the version JSON.

- [ ] **Step 5: Commit**

```bash
git add apps/server/app/main.py apps/server/app/routers/health.py apps/server/scripts/seed_admin.py
git commit -m "feat(server): app entrypoint, health, seed-admin"
```

---

## Self-Review

**Spec coverage** (`2026-06-24-bureau-ordre-design.md`): §4 data model → Tasks 3–4 (all 6 tables incl. `objet`, generated `no_ordre`, UNIQUE constraints). §5 auto-numbering → Task 5 + concurrency test. §6 auth/audit → Tasks 6–8 (Argon2id, JWT, `created_by`/`modified_by` stamping, append-only `status_history`). Core CRUD (Saisie/Consultation/Modif-Statut) → Task 10. Health/version → Task 11. **Deferred to follow-up plans (noted in scope):** attachments (PDF), exports (xlsx/PDF), `audit_log` writes on login/export, rate-limiting, the Electron client, packaging. `attachment`/`audit_log` tables are created now (Task 4) so later plans add no migration churn to the core.

**Placeholder scan:** none — every code step is complete and runnable.

**Type consistency:** `allocate_and_insert(db, *, register, created_by, data)` is defined in Task 5 and called identically in Task 10. `MailRecord` columns referenced in router/schemas match Task 3. `decode_token`/`create_access_token` signatures match across Tasks 6–8. Register mapping `entree→E / sortie→S` is consistent in Task 10.

**Known dev gotchas captured:** pgcrypto extension (Task 4 Step 2); a separate `bureau_ordre_test` DB for the concurrency test (Task 5 conftest); Python 3.12 venv to dodge 3.14 wheel gaps (Task 1).
