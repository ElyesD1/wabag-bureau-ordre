from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_roundtrip():
    h = hash_password("s3cret!")
    assert h != "s3cret!"
    assert verify_password("s3cret!", h)
    assert not verify_password("wrong", h)


def test_jwt_roundtrip():
    tok = create_access_token(subject="abc", role="clerk")
    claims = decode_token(tok)
    assert claims["sub"] == "abc"
    assert claims["role"] == "clerk"
    assert claims["type"] == "access"
