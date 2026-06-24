import pytest
from fastapi.testclient import TestClient

from app.core.deps import get_db
from app.core.security import hash_password
from app.main import app
from app.models.user import AppUser


@pytest.fixture
def client(Session):
    def _override():
        with Session() as s:
            yield s

    app.dependency_overrides[get_db] = _override
    with Session() as s:
        if not s.query(AppUser).filter_by(username="amel").first():
            s.add(
                AppUser(
                    username="amel",
                    full_name="Amel",
                    password_hash=hash_password("pw"),
                    role="clerk",
                )
            )
            s.commit()
    yield TestClient(app)
    app.dependency_overrides.clear()


def _token(client):
    r = client.post("/auth/login", json={"username": "amel", "password": "pw"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_saisie_then_consultation_and_status(client):
    h = {"Authorization": f"Bearer {_token(client)}"}

    r = client.post(
        "/registers/entree/documents",
        json={"type_document": "Facture", "objet": "Décompte N°1", "expediteur": "ONAS"},
        headers=h,
    )
    assert r.status_code == 201, r.text
    doc = r.json()
    assert doc["no_ordre"].startswith("BOE") and doc["register"] == "E"

    r = client.get("/registers/entree/documents?q=ONAS", headers=h)
    assert r.status_code == 200
    assert r.json()["total"] >= 1

    r = client.patch(
        f"/documents/{doc['id']}/status",
        json={"new_status": "Clos", "note": "reçu"},
        headers=h,
    )
    assert r.status_code == 200
    assert r.json()["dernier_statut"] == "Clos"


def test_edit_document_and_detail(client):
    h = {"Authorization": f"Bearer {_token(client)}"}
    doc = client.post(
        "/registers/entree/documents",
        json={"type_document": "Facture", "objet": "old"},
        headers=h,
    ).json()

    r = client.patch(f"/documents/{doc['id']}", json={"objet": "nouveau", "projet": "STEP"}, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["objet"] == "nouveau"

    client.patch(f"/documents/{doc['id']}/status", json={"new_status": "Clos"}, headers=h)

    d = client.get(f"/documents/{doc['id']}", headers=h).json()
    assert d["objet"] == "nouveau" and d["projet"] == "STEP"
    assert d["has_pdf"] is False
    assert len(d["history"]) >= 1
