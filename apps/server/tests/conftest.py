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
    from app.db.base import Base
    import app.models  # noqa: F401  (registers all tables)

    eng = create_engine(TEST_URL, future=True)
    with eng.begin() as c:
        c.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    return eng


@pytest.fixture(autouse=True)
def _clean(engine):
    """Start every test from an empty schema (the engine fixture is session-scoped)."""
    with engine.begin() as c:
        c.execute(
            text(
                "TRUNCATE app_user, mail_counter, mail_record, status_history, "
                "attachment, audit_log RESTART IDENTITY CASCADE"
            )
        )
    yield


@pytest.fixture
def Session(engine):
    return sessionmaker(bind=engine, future=True, expire_on_commit=False)


@pytest.fixture
def admin_id(Session):
    from app.models.user import AppUser

    with Session() as s:
        u = AppUser(username="tester", full_name="Tester", password_hash="x", role="admin")
        s.add(u)
        s.commit()
        s.refresh(u)
        return u.id
