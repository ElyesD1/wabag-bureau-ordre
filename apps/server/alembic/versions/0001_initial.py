"""initial schema — 6 tables + pgcrypto

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-24
"""
from alembic import op

from app.db.base import Base
import app.models  # noqa: F401  (registers every table on Base.metadata)

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # gen_random_uuid() lives in pgcrypto; must exist before tables that default to it.
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    Base.metadata.create_all(op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(op.get_bind())
