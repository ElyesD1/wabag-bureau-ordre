import pytest
from fastapi.testclient import TestClient

from app.core.deps import get_db
from app.core.security import hash_password
from app.main import app
from app.models.user import AppUser

MINIMAL_PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


@pytest.fixture
def client(Session, tmp_path, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "pdf_dir", str(tmp_path))

    def _override():
        with Session() as s:
            yield s

    app.dependency_overrides[get_db] = _override
    with Session() as s:
        s.add(AppUser(username="amel", full_name="Amel",
                      password_hash=hash_password("pw"), role="clerk"))
        s.commit()
    yield TestClient(app)
    app.dependency_overrides.clear()


def _auth(client):
    tok = client.post("/auth/login", json={"username": "amel", "password": "pw"}).json()["access_token"]
    return {"Authorization": f"Bearer {tok}"}


def _make_doc(client, h):
    r = client.post("/registers/entree/documents",
                    json={"type_document": "Facture", "objet": "x"}, headers=h)
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_upload_then_download_pdf(client):
    h = _auth(client)
    doc_id = _make_doc(client, h)

    r = client.post(f"/documents/{doc_id}/pdf",
                    files={"file": ("scan.pdf", MINIMAL_PDF, "application/pdf")}, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is True and len(r.json()["sha256"]) == 64

    r = client.get(f"/documents/{doc_id}/pdf", headers=h)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content.startswith(b"%PDF")


def test_reject_non_pdf(client):
    h = _auth(client)
    doc_id = _make_doc(client, h)
    r = client.post(f"/documents/{doc_id}/pdf",
                    files={"file": ("evil.pdf", b"not a pdf at all", "application/pdf")}, headers=h)
    assert r.status_code == 422


def test_download_missing_pdf_404(client):
    h = _auth(client)
    doc_id = _make_doc(client, h)
    r = client.get(f"/documents/{doc_id}/pdf", headers=h)
    assert r.status_code == 404
