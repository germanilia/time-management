from httpx import AsyncClient


async def _get_token(client: AsyncClient) -> str:
    resp = await client.post(
        "/auth/login",
        json={"email": "iliag@sela.co.il", "password": "Cowabunga1!"},
    )
    return resp.json()["data"]["accessToken"]


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestGetSettings:
    async def test_get_settings_returns_defaults(self, client: AsyncClient):
        """GET /settings should return default global settings."""
        token = await _get_token(client)
        response = await client.get("/settings", headers=_headers(token))
        assert response.status_code == 200
        data = response.json()["data"]
        assert "hoursPerFullTime" in data
        assert data["hoursPerFullTime"] == 176  # default monthly hours

    async def test_get_settings_without_auth_returns_401(
        self, client: AsyncClient
    ):
        """GET /settings without auth should return 401."""
        response = await client.get("/settings")
        assert response.status_code == 401


class TestUpdateSettings:
    async def test_update_hours_per_full_time(self, client: AsyncClient):
        """PUT /settings should update hoursPerFullTime."""
        token = await _get_token(client)
        response = await client.put(
            "/settings",
            json={"hoursPerFullTime": 160},
            headers=_headers(token),
        )
        assert response.status_code == 200
        assert response.json()["data"]["hoursPerFullTime"] == 160

    async def test_updated_settings_persist(self, client: AsyncClient):
        """Settings update should persist across GET requests."""
        token = await _get_token(client)
        await client.put(
            "/settings",
            json={"hoursPerFullTime": 160},
            headers=_headers(token),
        )
        response = await client.get("/settings", headers=_headers(token))
        assert response.status_code == 200
        assert response.json()["data"]["hoursPerFullTime"] == 160

    async def test_update_settings_rejects_invalid_hours(
        self, client: AsyncClient
    ):
        """PUT /settings with invalid hoursPerFullTime should return 422."""
        token = await _get_token(client)
        response = await client.put(
            "/settings",
            json={"hoursPerFullTime": -10},
            headers=_headers(token),
        )
        assert response.status_code == 422
