import pytest
from httpx import AsyncClient

from app.core.security import (
    create_action_token,
    hash_password,
    verify_password,
)


def test_password_hashing():
    pw = "SuperSecret123!"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    payload = {
        "email": "alice@example.com",
        "password": "Password123!",
        "public_name": "Alice in Wonderland",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["access_token"]
    assert data["token_type"] == "bearer"
    assert data["is_email_validated"] is False
    assert data["user"]["email"] == "alice@example.com"
    assert data["user"]["public_name"] == "Alice in Wonderland"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {
        "email": "duplicate@example.com",
        "password": "Password123!",
        "public_name": "Dup User",
    }
    res1 = await client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = await client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    register_payload = {
        "email": "bob@example.com",
        "password": "BobPassword456!",
        "public_name": "Bob Marley",
    }
    await client.post("/api/v1/auth/register", json=register_payload)

    login_payload = {
        "email": "bob@example.com",
        "password": "BobPassword456!",
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["access_token"]
    assert data["user"]["email"] == "bob@example.com"


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    register_payload = {
        "email": "charlie@example.com",
        "password": "Password123!",
        "public_name": "Charlie",
    }
    await client.post("/api/v1/auth/register", json=register_payload)

    login_payload = {
        "email": "charlie@example.com",
        "password": "WrongPassword!",
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_verify_email(client: AsyncClient):
    register_payload = {
        "email": "dave@example.com",
        "password": "Password123!",
        "public_name": "Dave",
    }
    await client.post("/api/v1/auth/register", json=register_payload)

    token = create_action_token("dave@example.com", action="verify_email")
    response = await client.post("/api/v1/auth/verify-email", json={"token": token})
    assert response.status_code == 200
    assert response.json()["message"] == "Email verified successfully"

    # Verify user state on login now shows is_email_validated=True
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "dave@example.com", "password": "Password123!"},
    )
    assert login_res.json()["is_email_validated"] is True


@pytest.mark.asyncio
async def test_forgot_and_reset_password(client: AsyncClient):
    register_payload = {
        "email": "eve@example.com",
        "password": "OldPassword123!",
        "public_name": "Eve",
    }
    await client.post("/api/v1/auth/register", json=register_payload)

    # Forgot password endpoint
    forgot_res = await client.post(
        "/api/v1/auth/forgot-password", json={"email": "eve@example.com"}
    )
    assert forgot_res.status_code == 200

    # Reset password with valid token
    reset_token = create_action_token("eve@example.com", action="reset_password")
    reset_res = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "new_password": "BrandNewPassword123!"},
    )
    assert reset_res.status_code == 200

    # Login with new password
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "eve@example.com", "password": "BrandNewPassword123!"},
    )
    assert login_res.status_code == 200


@pytest.mark.asyncio
async def test_google_oauth_flow(client: AsyncClient):
    # Register/Login via Google mock token
    mock_id_token = "mock:google_sub_999:frank@gmail.com:Frank Sinatra"
    response = await client.post(
        "/api/v1/auth/oauth/google", json={"id_token": mock_id_token}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["access_token"]
    assert data["is_email_validated"] is True
    assert data["user"]["email"] == "frank@gmail.com"
    assert data["user"]["google_id"] == "google_sub_999"

    # Subsequent login with same Google ID
    login_response = await client.post(
        "/api/v1/auth/oauth/google", json={"id_token": mock_id_token}
    )
    assert login_response.status_code == 200
    assert login_response.json()["user"]["id"] == data["user"]["id"]


@pytest.mark.asyncio
async def test_link_google_account(client: AsyncClient):
    # 1. Register with email/password
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "grace@example.com",
            "password": "Password123!",
            "public_name": "Grace Hopper",
        },
    )
    access_token = reg.json()["access_token"]

    # 2. Link Google account using the bearer token
    link_token = "mock:google_sub_grace:grace@gmail.com:Grace"
    link_res = await client.post(
        "/api/v1/auth/oauth/link/google",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"id_token": link_token},
    )
    assert link_res.status_code == 200
    assert link_res.json()["google_id"] == "google_sub_grace"

    # 3. Check /users/me
    me_res = await client.get(
        "/api/v1/users/me", headers={"Authorization": f"Bearer {access_token}"}
    )
    assert me_res.status_code == 200
    assert me_res.json()["google_id"] == "google_sub_grace"

