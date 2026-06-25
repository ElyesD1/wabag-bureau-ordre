import concurrent.futures as cf

from bson import ObjectId

from app.services.numbering import allocate_and_insert


def test_parallel_saisie_no_dup_no_gap(db):
    admin = ObjectId()
    n = 30

    def saisie(_):
        return allocate_and_insert(
            db, register="E", created_by=admin, data={"type_document": "Lettre", "objet": "x"}
        )["no_ordre"]

    with cf.ThreadPoolExecutor(max_workers=12) as ex:
        numbers = list(ex.map(saisie, range(n)))

    assert len(numbers) == n
    assert len(set(numbers)) == n, "duplicate N° d'ordre under concurrency"
    assert all(x.startswith("BOE") for x in numbers)

    seqs = sorted(d["seq"] for d in db.mail.find())
    assert seqs == list(range(1, n + 1)), f"gaps/dups in seq: {seqs}"
