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


def _tok(client, u):
    return client.post("/auth/login", json={"username": u, "password": "pw"}).json()["access_token"]


def test_admin_creates_user_and_it_can_login(client):
    h = {"Authorization": f"Bearer {_tok(client, 'boss')}"}
    r = client.post(
        "/users",
        json={"username": "amel2", "full_name": "Amel", "password": "secret9", "role": "clerk"},
        headers=h,
    )
    assert r.status_code == 201, r.text
    assert r.json()["username"] == "amel2"
    assert client.post("/auth/login", json={"username": "amel2", "password": "secret9"}).status_code == 200


def test_clerk_forbidden_from_user_admin(client):
    h = {"Authorization": f"Bearer {_tok(client, 'clerk1')}"}
    assert client.get("/users", headers=h).status_code == 403
    assert client.post(
        "/users", json={"username": "x", "full_name": "X", "password": "secret9"}, headers=h
    ).status_code == 403


def test_duplicate_username_409(client):
    h = {"Authorization": f"Bearer {_tok(client, 'boss')}"}
    assert client.post(
        "/users", json={"username": "clerk1", "full_name": "Dup", "password": "secret9"}, headers=h
    ).status_code == 409


def test_update_deactivate_and_password_reset(client):
    h = {"Authorization": f"Bearer {_tok(client, 'boss')}"}
    clerk = [u for u in client.get("/users", headers=h).json() if u["username"] == "clerk1"][0]
    r = client.patch(f"/users/{clerk['id']}", json={"is_active": False}, headers=h)
    assert r.status_code == 200 and r.json()["is_active"] is False
    assert client.post(f"/users/{clerk['id']}/password", json={"password": "newpass1"}, headers=h).status_code == 204
    # deactivated user cannot log in even with the new password
    assert client.post("/auth/login", json={"username": "clerk1", "password": "newpass1"}).status_code == 401


def test_admin_cannot_self_deactivate(client):
    h = {"Authorization": f"Bearer {_tok(client, 'boss')}"}
    boss = [u for u in client.get("/users", headers=h).json() if u["username"] == "boss"][0]
    assert client.patch(f"/users/{boss['id']}", json={"is_active": False}, headers=h).status_code == 400
