from datetime import datetime, timezone

import pytest
from pymongo import MongoClient

from app.core.config import settings
from app.core.security import hash_password

TEST_DB = "bureau_ordre_test"


@pytest.fixture(scope="session")
def mongo():
    client = MongoClient(settings.mongodb_uri, tz_aware=True)
    database = client[TEST_DB]
    yield database
    client.drop_database(TEST_DB)
    client.close()


@pytest.fixture(autouse=True)
def _clean(mongo):
    for name in mongo.list_collection_names():
        mongo[name].delete_many({})
    yield


@pytest.fixture
def db(mongo):
    return mongo


@pytest.fixture
def make_user(db):
    def _make(username="amel", role="clerk", password="pw", full_name="Amel"):
        doc = {
            "username": username.lower(),
            "full_name": full_name,
            "password_hash": hash_password(password),
            "role": role,
            "preferred_locale": "fr",
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "last_login_at": None,
        }
        doc["_id"] = db.users.insert_one(doc).inserted_id
        return doc

    return _make
