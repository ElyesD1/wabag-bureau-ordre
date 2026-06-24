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
        s.add(AppUser(username="boss", full_name="Boss", password_hash=hash_password("pw"), role="admin"))
        s.add(AppUser(username="clerk1", full_name="Clerk", password_hash=hash_password("pw"), role="clerk"))
        s.commit()
    yield TestClient(app)
    app.dependency_overrides.clear()


def _h(client, u):
    tok = client.post("/auth/login", json={"username": u, "password": "pw"}).json()["access_token"]
    return {"Authorization": f"Bearer {tok}"}


def test_insights_admin(client):
    h = _h(client, "boss")
    for i in range(3):
        client.post(
            "/registers/entree/documents",
            json={"type_document": "Lettre", "objet": f"o{i}", "dernier_statut": "En attente"},
            headers=h,
        )
    client.post(
        "/registers/entree/documents",
        json={"type_document": "Facture", "objet": "closed", "dernier_statut": "Clos"},
        headers=h,
    )

    d = client.get("/registers/entree/insights", headers=h).json()
    assert d["total"] == 4
    assert d["pending"] == 3
    assert d["closed"] == 1
    assert d["open"] == 3  # 3 "En attente" are open; "Clos" is not
    assert d["no_pdf"] == 4
    assert d["overdue"] == 0  # all created today, threshold 7
    assert len(d["aging"]) == 4
    assert len(d["watch"]) == 3


def test_insights_clerk_forbidden(client):
    h = _h(client, "clerk1")
    assert client.get("/registers/entree/insights", headers=h).status_code == 403


def test_list_has_pdf_and_bucket(client):
    h = _h(client, "boss")
    client.post(
        "/registers/entree/documents",
        json={"type_document": "Lettre", "objet": "x", "dernier_statut": "En attente"},
        headers=h,
    )
    items = client.get("/registers/entree/documents", headers=h).json()["items"]
    assert items[0]["has_pdf"] is False
    assert client.get("/registers/entree/documents?bucket=no_pdf", headers=h).json()["total"] >= 1
    assert client.get("/registers/entree/documents?bucket=open", headers=h).json()["total"] >= 1
