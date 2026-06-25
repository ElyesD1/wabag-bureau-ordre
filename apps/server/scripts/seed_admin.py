"""Create the first admin in MongoDB.

Usage: python -m scripts.seed_admin <username> <full_name> <password>
"""
import sys
from datetime import datetime, timezone

from app.core.security import hash_password
from app.db.mongo import db, ensure_indexes


def main() -> None:
    if len(sys.argv) != 4:
        print("usage: python -m scripts.seed_admin <username> <full_name> <password>")
        raise SystemExit(2)
    username, full_name, password = sys.argv[1:4]
    username = username.lower()
    ensure_indexes()
    if db.users.find_one({"username": username}):
        print(f"user '{username}' already exists")
        return
    db.users.insert_one({
        "username": username,
        "full_name": full_name,
        "password_hash": hash_password(password),
        "role": "admin",
        "preferred_locale": "fr",
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "last_login_at": None,
    })
    print(f"admin '{username}' created")


if __name__ == "__main__":
    main()
