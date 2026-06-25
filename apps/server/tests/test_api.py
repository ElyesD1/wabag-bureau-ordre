import pytest
from fastapi.testclient import TestClient

from app.core.deps import get_db
from app.main import app

MINIMAL_PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


def _auth(client, make_user, role="clerk", username="amel"):
    make_user(username=username, role=role)
    r = client.post("/auth/login", json={"username": username, "password": "pw"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_login_me_and_bad_password(client, make_user):
    h = _auth(client, make_user)
    me = client.get("/auth/me", headers=h).json()
    assert me["username"] == "amel" and me["role"] == "clerk"
    assert client.post("/auth/login", json={"username": "amel", "password": "nope"}).status_code == 401


def test_saisie_consultation_status_detail(client, make_user):
    h = _auth(client, make_user)
    r = client.post(
        "/registers/entree/documents",
        json={"type_document": "Facture", "objet": "Décompte N°1", "expediteur": "ONAS"},
        headers=h,
    )
    assert r.status_code == 201, r.text
    doc = r.json()
    assert doc["no_ordre"] == "BOE20260001" and doc["register"] == "E" and doc["has_pdf"] is False

    assert client.get("/registers/entree/documents?q=ONAS", headers=h).json()["total"] == 1

    r = client.patch(f"/documents/{doc['id']}/status", json={"new_status": "Clos", "note": "ok"}, headers=h)
    assert r.status_code == 200 and r.json()["dernier_statut"] == "Clos"

    r = client.patch(f"/documents/{doc['id']}", json={"objet": "nouveau", "projet": "STEP"}, headers=h)
    assert r.status_code == 200 and r.json()["objet"] == "nouveau"

    d = client.get(f"/documents/{doc['id']}", headers=h).json()
    assert d["projet"] == "STEP" and len(d["history"]) >= 1 and d["has_pdf"] is False


def test_entree_sortie_independent_numbering(client, make_user):
    h = _auth(client, make_user)
    e = client.post("/registers/entree/documents", json={"type_document": "Lettre", "objet": "e"}, headers=h).json()
    s = client.post("/registers/sortie/documents", json={"type_document": "Lettre", "objet": "s"}, headers=h).json()
    assert e["no_ordre"] == "BOE20260001"
    assert s["no_ordre"] == "BOS20260001"


def test_attachments_upload_download_reject(client, make_user):
    h = _auth(client, make_user)
    doc = client.post("/registers/entree/documents", json={"type_document": "Facture", "objet": "x"}, headers=h).json()

    r = client.post(f"/documents/{doc['id']}/pdf", files={"file": ("s.pdf", MINIMAL_PDF, "application/pdf")}, headers=h)
    assert r.status_code == 200 and len(r.json()["sha256"]) == 64

    r = client.get(f"/documents/{doc['id']}/pdf", headers=h)
    assert r.status_code == 200 and r.content.startswith(b"%PDF")

    bad = client.post(f"/documents/{doc['id']}/pdf", files={"file": ("e.pdf", b"not a pdf", "application/pdf")}, headers=h)
    assert bad.status_code == 422

    # detail now reflects the attachment
    assert client.get(f"/documents/{doc['id']}", headers=h).json()["has_pdf"] is True


def test_exports_and_report(client, make_user):
    h = _auth(client, make_user)
    for i in range(3):
        client.post("/registers/entree/documents", json={"type_document": "Lettre", "objet": f"o{i}"}, headers=h)

    r = client.get("/export/journal.xlsx?register=entree", headers=h)
    assert r.status_code == 200 and "spreadsheetml" in r.headers["content-type"]

    rep = client.get("/reports/journal-data?register=entree", headers=h).json()
    assert rep["register"] == "E" and rep["count"] == 3


def test_dashboard_stats(client, make_user):
    h = _auth(client, make_user)
    for i in range(2):
        client.post("/registers/entree/documents", json={"type_document": "Lettre", "objet": f"o{i}", "dernier_statut": "En attente"}, headers=h)
    client.post("/registers/sortie/documents", json={"type_document": "Facture", "objet": "s"}, headers=h)
    d = client.get("/stats/dashboard", headers=h).json()
    assert d["totals"] == {"entree": 2, "sortie": 1, "total": 3}
    assert d["pending"] == 2 and len(d["by_month"]) == 12 and len(d["recent"]) == 3


def test_users_admin_crud(client, make_user):
    h = _auth(client, make_user, role="admin", username="boss")
    r = client.post("/users", json={"username": "clerk1", "full_name": "Clerk", "password": "secret9", "role": "clerk"}, headers=h)
    assert r.status_code == 201
    assert client.post("/auth/login", json={"username": "clerk1", "password": "secret9"}).status_code == 200
    assert client.post("/users", json={"username": "clerk1", "full_name": "Dup", "password": "secret9"}, headers=h).status_code == 409

    fresh = client.post("/users", json={"username": "fresh", "full_name": "F", "password": "secret9"}, headers=h).json()
    assert client.delete(f"/users/{fresh['id']}", headers=h).status_code == 204

    boss = [u for u in client.get("/users", headers=h).json() if u["username"] == "boss"][0]
    assert client.delete(f"/users/{boss['id']}", headers=h).status_code == 400  # self


def test_clerk_forbidden_from_admin_areas(client, make_user):
    h = _auth(client, make_user, role="clerk")
    assert client.get("/users", headers=h).status_code == 403
    assert client.get("/registers/entree/insights", headers=h).status_code == 403
    assert client.get("/audit", headers=h).status_code == 403


def test_insights_and_audit_admin(client, make_user):
    h = _auth(client, make_user, role="admin", username="boss")
    for i in range(3):
        client.post("/registers/entree/documents", json={"type_document": "Lettre", "objet": f"o{i}", "dernier_statut": "En attente"}, headers=h)

    ins = client.get("/registers/entree/insights", headers=h).json()
    assert ins["total"] == 3 and ins["open"] == 3 and ins["pending"] == 3
    assert ins["no_pdf"] == 3 and len(ins["aging"]) == 4 and len(ins["watch"]) == 3

    audit = client.get("/audit", headers=h).json()
    assert audit["total"] >= 1 and any(i["action"] == "create_record" for i in audit["items"])
    assert "login" in client.get("/audit/actions", headers=h).json()
