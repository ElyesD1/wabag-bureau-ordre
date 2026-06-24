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
