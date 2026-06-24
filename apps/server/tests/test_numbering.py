import concurrent.futures as cf

from sqlalchemy import select

from app.models.mail import MailRecord
from app.services.numbering import allocate_and_insert


def _saisie(Session, admin_id):
    with Session() as s:
        rec = allocate_and_insert(
            s,
            register="E",
            created_by=admin_id,
            data={"type_document": "Lettre", "objet": "test"},
        )
        s.commit()
        return rec.no_ordre


def test_parallel_saisie_no_dup_no_gap(Session, admin_id):
    n = 40
    with cf.ThreadPoolExecutor(max_workers=12) as ex:
        numbers = list(ex.map(lambda _: _saisie(Session, admin_id), range(n)))

    assert len(numbers) == n
    assert len(set(numbers)) == n, "duplicate N° d'ordre under concurrency"
    assert all(x.startswith("BOE") for x in numbers)

    with Session() as s:
        seqs = sorted(r.seq for r in s.scalars(select(MailRecord)).all())
    assert seqs == list(range(1, n + 1)), f"gaps/dups in seq: {seqs}"
