"""Create the first admin.

Usage: python -m scripts.seed_admin <username> <full_name> <password>
"""
import sys

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import AppUser


def main() -> None:
    if len(sys.argv) != 4:
        print("usage: python -m scripts.seed_admin <username> <full_name> <password>")
        raise SystemExit(2)
    username, full_name, password = sys.argv[1:4]
    with SessionLocal() as s:
        if s.query(AppUser).filter_by(username=username).first():
            print(f"user '{username}' already exists")
            return
        s.add(
            AppUser(
                username=username,
                full_name=full_name,
                password_hash=hash_password(password),
                role="admin",
            )
        )
        s.commit()
        print(f"admin '{username}' created")


if __name__ == "__main__":
    main()
