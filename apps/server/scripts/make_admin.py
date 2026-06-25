"""Create (or reset) an admin / clerk account directly in MongoDB.

Useful when the seed admin password is lost, or to add another administrator
without an existing login. It reuses the app's own password hashing and the
exact users-collection schema, so the account is byte-for-byte identical to
one created through the API.

Run from apps/server (so .env + the `app` package resolve):

    PYTHONPATH=. .venv/bin/python scripts/make_admin.py \
        --username admin2 --password 'Admin#2026' --fullname "Administrateur BO"

It targets whatever cluster/database MONGODB_URI / MONGODB_DB point at in .env
(the same Atlas database the live Render server uses).
"""

import argparse
from datetime import datetime, timezone

from app.core.security import hash_password
from app.db.mongo import db


def main() -> None:
    p = argparse.ArgumentParser(description="Create or reset a Bureau d'Ordre user.")
    p.add_argument("--username", required=True)
    p.add_argument("--password", required=True)
    p.add_argument("--fullname", default="Administrateur")
    p.add_argument("--role", default="admin", choices=["admin", "clerk"])
    args = p.parse_args()

    username = args.username.lower()
    existing = db.users.find_one({"username": username})
    if existing:
        db.users.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "password_hash": hash_password(args.password),
                "full_name": args.fullname,
                "role": args.role,
                "is_active": True,
            }},
        )
        print(f"✓ reset existing user '{username}' (role={args.role}, active, new password)")
    else:
        db.users.insert_one({
            "username": username,
            "full_name": args.fullname,
            "password_hash": hash_password(args.password),
            "role": args.role,
            "preferred_locale": "fr",
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "last_login_at": None,
        })
        print(f"✓ created new user '{username}' (role={args.role})")

    everyone = [(u["username"], u.get("role")) for u in db.users.find({}, {"username": 1, "role": 1})]
    print(f"users in DB now ({len(everyone)}): {everyone}")


if __name__ == "__main__":
    main()
