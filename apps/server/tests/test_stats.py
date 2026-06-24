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
        s.add(AppUser(username="a", full_name="A", password_hash=hash_password("pw"), role="clerk"))
        s.commit()
    yield TestClient(app)
    app.dependency_overrides.clear()


def _h(client):
    tok = client.post("/auth/login", json={"username": "a", "password": "pw"}).json()["access_token"]
    return {"Authorization": f"Bearer {tok}"}


def test_dashboard_stats(client):
    h = _h(client)
    for i in range(3):
        client.post(
            "/registers/entree/documents",
            json={"type_document": "Lettre", "objet": f"o{i}", "dernier_statut": "En attente"},
            headers=h,
        )
    client.post("/registers/sortie/documents", json={"type_document": "Facture", "objet": "s"}, headers=h)

    d = client.get("/stats/dashboard", headers=h).json()
    assert d["totals"]["entree"] == 3
    assert d["totals"]["sortie"] == 1
    assert d["totals"]["total"] == 4
    assert d["pending"] == 3
    assert len(d["by_month"]) == 12
    assert any(b["type"] == "Lettre" for b in d["by_type"])
    assert len(d["recent"]) == 4
