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


def test_admin_lists_audit_with_actor(client):
    h = _h(client, "boss")  # login itself writes an audit row
    body = client.get("/audit", headers=h).json()
    assert body["total"] >= 1
    assert any(i["action"] == "login" for i in body["items"])
    assert any(i["actor_username"] == "boss" for i in body["items"])


def test_clerk_forbidden(client):
    h = _h(client, "clerk1")
    assert client.get("/audit", headers=h).status_code == 403
    assert client.get("/audit/actions", headers=h).status_code == 403


def test_audit_filter_by_action(client):
    h = _h(client, "boss")
    client.post("/registers/entree/documents", json={"type_document": "Lettre", "objet": "x"}, headers=h)
    r = client.get("/audit?action=login", headers=h).json()
    assert r["total"] >= 1
    assert all(i["action"] == "login" for i in r["items"])


def test_audit_actions_distinct(client):
    h = _h(client, "boss")
    client.post("/registers/entree/documents", json={"type_document": "Lettre", "objet": "x"}, headers=h)
    actions = client.get("/audit/actions", headers=h).json()
    assert "login" in actions and "create_record" in actions
