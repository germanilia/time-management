from httpx import AsyncClient


async def _get_token(client: AsyncClient) -> str:
    resp = await client.post(
        "/auth/login",
        json={"email": "iliag@sela.co.il", "password": "Cowabunga1!"},
    )
    return resp.json()["data"]["accessToken"]


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestCreateRole:
    async def test_create_role(self, client: AsyncClient):
        """POST /roles should create a new role."""
        token = await _get_token(client)
        response = await client.post(
            "/roles",
            json={"name": "Developer", "defaultHourlyRate": 150},
            headers=_headers(token),
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["name"] == "Developer"
        assert float(data["defaultHourlyRate"]) == 150

    async def test_create_duplicate_role_returns_409(self, client: AsyncClient):
        """POST /roles with duplicate name should return 409."""
        token = await _get_token(client)
        payload = {"name": "Architect", "defaultHourlyRate": 250}
        await client.post("/roles", json=payload, headers=_headers(token))
        response = await client.post("/roles", json=payload, headers=_headers(token))
        assert response.status_code == 409

    async def test_create_role_without_auth_returns_401(self, client: AsyncClient):
        """POST /roles without token should return 401."""
        response = await client.post(
            "/roles",
            json={"name": "Test", "defaultHourlyRate": 100},
        )
        assert response.status_code == 401


class TestListRoles:
    async def test_list_roles(self, client: AsyncClient):
        """GET /roles should return all roles."""
        token = await _get_token(client)
        await client.post(
            "/roles",
            json={"name": "Developer", "defaultHourlyRate": 150},
            headers=_headers(token),
        )
        await client.post(
            "/roles",
            json={"name": "Architect", "defaultHourlyRate": 250},
            headers=_headers(token),
        )
        response = await client.get("/roles", headers=_headers(token))
        assert response.status_code == 200
        assert len(response.json()["data"]) == 2


class TestGetRole:
    async def test_get_role_by_id(self, client: AsyncClient):
        """GET /roles/{id} should return the role."""
        token = await _get_token(client)
        create_resp = await client.post(
            "/roles",
            json={"name": "DevOps", "defaultHourlyRate": 200},
            headers=_headers(token),
        )
        role_id = create_resp.json()["data"]["id"]
        response = await client.get(f"/roles/{role_id}", headers=_headers(token))
        assert response.status_code == 200
        assert response.json()["data"]["name"] == "DevOps"

    async def test_get_nonexistent_role_returns_404(self, client: AsyncClient):
        """GET /roles/{id} for unknown id should return 404."""
        token = await _get_token(client)
        response = await client.get(
            "/roles/00000000-0000-0000-0000-000000000000",
            headers=_headers(token),
        )
        assert response.status_code == 404


class TestUpdateRole:
    async def test_update_role_name(self, client: AsyncClient):
        """PUT /roles/{id} should update fields."""
        token = await _get_token(client)
        create_resp = await client.post(
            "/roles",
            json={"name": "Old Name", "defaultHourlyRate": 100},
            headers=_headers(token),
        )
        role_id = create_resp.json()["data"]["id"]
        response = await client.put(
            f"/roles/{role_id}",
            json={"name": "New Name"},
            headers=_headers(token),
        )
        assert response.status_code == 200
        assert response.json()["data"]["name"] == "New Name"


class TestDeleteRole:
    async def test_delete_role(self, client: AsyncClient):
        """DELETE /roles/{id} should delete the role."""
        token = await _get_token(client)
        create_resp = await client.post(
            "/roles",
            json={"name": "To Delete", "defaultHourlyRate": 100},
            headers=_headers(token),
        )
        role_id = create_resp.json()["data"]["id"]
        response = await client.delete(f"/roles/{role_id}", headers=_headers(token))
        assert response.status_code == 200
        get_resp = await client.get(f"/roles/{role_id}", headers=_headers(token))
        assert get_resp.status_code == 404

    async def test_delete_role_with_employees_returns_409(self, client: AsyncClient):
        """DELETE /roles/{id} should return 409 when employees use the role."""
        token = await _get_token(client)
        role_resp = await client.post(
            "/roles",
            json={"name": "In Use", "defaultHourlyRate": 100},
            headers=_headers(token),
        )
        role_id = role_resp.json()["data"]["id"]
        await client.post(
            "/employees",
            json={
                "name": "John",
                "email": "john@sela.co",
                "roleId": role_id,
                "actualAvailabilityPercentage": 100,
                "targetUtilizationPercentage": 90,
            },
            headers=_headers(token),
        )
        response = await client.delete(f"/roles/{role_id}", headers=_headers(token))
        assert response.status_code == 409
