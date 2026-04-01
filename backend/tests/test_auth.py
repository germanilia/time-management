from httpx import AsyncClient


class TestLogin:
    async def test_login_returns_token(self, client: AsyncClient):
        """POST /auth/login should return a JWT access token."""
        response = await client.post(
            "/auth/login",
            json={"email": "iliag@sela.co.il", "password": "Cowabunga1!"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "accessToken" in data["data"]
        assert data["data"]["tokenType"] == "bearer"

    async def test_login_wrong_password_returns_401(self, client: AsyncClient):
        """POST /auth/login with wrong password should return 401."""
        response = await client.post(
            "/auth/login",
            json={"email": "iliag@sela.co.il", "password": "WrongPass!"},
        )
        assert response.status_code == 401

    async def test_login_nonexistent_user_returns_401(self, client: AsyncClient):
        """POST /auth/login with non-existent email should return 401."""
        response = await client.post(
            "/auth/login",
            json={"email": "noone@sela.co", "password": "Pass123!"},
        )
        assert response.status_code == 401


class TestMe:
    async def test_me_returns_current_user(self, client: AsyncClient):
        """GET /auth/me with valid token should return user info."""
        login_resp = await client.post(
            "/auth/login",
            json={"email": "iliag@sela.co.il", "password": "Cowabunga1!"},
        )
        token = login_resp.json()["data"]["accessToken"]

        response = await client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["data"]["email"] == "iliag@sela.co.il"

    async def test_me_without_token_returns_401(self, client: AsyncClient):
        """GET /auth/me without token should return 401."""
        response = await client.get("/auth/me")
        assert response.status_code == 401

    async def test_me_with_invalid_token_returns_401(self, client: AsyncClient):
        """GET /auth/me with invalid token should return 401."""
        response = await client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalidtoken123"},
        )
        assert response.status_code == 401

    async def test_register_endpoint_does_not_exist(self, client: AsyncClient):
        """POST /auth/register should return 405 (no registration allowed)."""
        response = await client.post(
            "/auth/register",
            json={"email": "new@sela.co", "password": "Pass123!", "name": "New User"},
        )
        assert response.status_code == 405
