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
    db.flush()  # emit the INSERT
    db.refresh(rec)  # load the STORED generated no_ordre
    return rec
