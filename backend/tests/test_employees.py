from httpx import AsyncClient


async def _get_token(client: AsyncClient) -> str:
    resp = await client.post(
        "/auth/login",
        json={"email": "iliag@sela.co.il", "password": "Cowabunga1!"},
    )
    return resp.json()["data"]["accessToken"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _create_role(
    client: AsyncClient, token: str, name: str = "Developer", rate: float = 150
) -> str:
    """Create a role and return its ID."""
    resp = await client.post(
        "/roles",
        json={"name": name, "defaultHourlyRate": rate},
        headers=_auth_headers(token),
    )
    return resp.json()["data"]["id"]


class TestCreateEmployee:
    async def test_create_employee_returns_200(self, client: AsyncClient):
        """POST /employees should create a new employee."""
        token = await _get_token(client)
        role_id = await _create_role(client, token)
        response = await client.post(
            "/employees",
            json={
                "name": "John Doe",
                "email": "john@sela.co",
                "roleId": role_id,
                "hourlyRate": 160,
                "actualAvailabilityPercentage": 80,
                "targetUtilizationPercentage": 90,
                "department": "Engineering",
            },
            headers=_auth_headers(token),
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["name"] == "John Doe"
        assert float(data["hourlyRate"]) == 160
        assert float(data["effectiveHourlyRate"]) == 160
        assert data["roleId"] == role_id
        assert data["roleName"] == "Developer"
        assert data["actualAvailabilityPercentage"] == 80
        assert data["targetUtilizationPercentage"] == 90

    async def test_create_employee_without_hourly_rate_uses_role_default(
        self, client: AsyncClient
    ):
        """POST /employees without hourlyRate should use role's default rate."""
        token = await _get_token(client)
        role_id = await _create_role(client, token, "Architect", 250)
        response = await client.post(
            "/employees",
            json={
                "name": "No Rate",
                "email": "norate@sela.co",
                "roleId": role_id,
                "actualAvailabilityPercentage": 100,
                "targetUtilizationPercentage": 90,
            },
            headers=_auth_headers(token),
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["hourlyRate"] is None
        assert float(data["effectiveHourlyRate"]) == 250

    async def test_create_employee_duplicate_email_returns_409(
        self, client: AsyncClient
    ):
        """POST /employees with duplicate email should return 409."""
        token = await _get_token(client)
        role_id = await _create_role(client, token)
        payload = {
            "name": "Dup",
            "email": "dup@sela.co",
            "roleId": role_id,
            "actualAvailabilityPercentage": 100,
            "targetUtilizationPercentage": 100,
        }
        await client.post("/employees", json=payload, headers=_auth_headers(token))
        response = await client.post(
            "/employees", json=payload, headers=_auth_headers(token)
        )
        assert response.status_code == 409

    async def test_create_employee_without_auth_returns_401(
        self, client: AsyncClient
    ):
        """POST /employees without token should return 401."""
        response = await client.post(
            "/employees",
            json={
                "name": "No Auth",
                "email": "noauth@sela.co",
                "roleId": "00000000-0000-0000-0000-000000000001",
                "actualAvailabilityPercentage": 100,
                "targetUtilizationPercentage": 100,
            },
        )
        assert response.status_code == 401


class TestListEmployees:
    async def test_list_employees_returns_all(self, client: AsyncClient):
        """GET /employees should return all employees."""
        token = await _get_token(client)
        role_id = await _create_role(client, token)
        await client.post(
            "/employees",
            json={
                "name": "Alice",
                "email": "alice@sela.co",
                "roleId": role_id,
                "hourlyRate": 120,
                "actualAvailabilityPercentage": 100,
                "targetUtilizationPercentage": 90,
            },
            headers=_auth_headers(token),
        )
        await client.post(
            "/employees",
            json={
                "name": "Bob",
                "email": "bob@sela.co",
                "roleId": role_id,
                "hourlyRate": 130,
                "actualAvailabilityPercentage": 80,
                "targetUtilizationPercentage": 85,
            },
            headers=_auth_headers(token),
        )
        response = await client.get("/employees", headers=_auth_headers(token))
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 2

    async def test_list_employees_filter_by_status(self, client: AsyncClient):
        """GET /employees?status=active should filter by status."""
        token = await _get_token(client)
        role_id = await _create_role(client, token)
        await client.post(
            "/employees",
            json={
                "name": "Active",
                "email": "active@sela.co",
                "roleId": role_id,
                "actualAvailabilityPercentage": 100,
                "targetUtilizationPercentage": 100,
            },
            headers=_auth_headers(token),
        )
        response = await client.get(
            "/employees?status=active", headers=_auth_headers(token)
        )
        assert response.status_code == 200
        data = response.json()
        assert all(e["status"] == "active" for e in data["data"])


class TestGetEmployee:
    async def test_get_employee_by_id(self, client: AsyncClient):
        """GET /employees/{id} should return the employee."""
        token = await _get_token(client)
        role_id = await _create_role(client, token)
        create_resp = await client.post(
            "/employees",
            json={
                "name": "Get Me",
                "email": "getme@sela.co",
                "roleId": role_id,
                "actualAvailabilityPercentage": 100,
                "targetUtilizationPercentage": 100,
            },
            headers=_auth_headers(token),
        )
        emp_id = create_resp.json()["data"]["id"]
        response = await client.get(
            f"/employees/{emp_id}", headers=_auth_headers(token)
        )
        assert response.status_code == 200
        assert response.json()["data"]["name"] == "Get Me"

    async def test_get_nonexistent_employee_returns_404(
        self, client: AsyncClient
    ):
        """GET /employees/{id} for unknown id should return 404."""
        token = await _get_token(client)
        response = await client.get(
            "/employees/00000000-0000-0000-0000-000000000000",
            headers=_auth_headers(token),
        )
        assert response.status_code == 404


class TestUpdateEmployee:
    async def test_update_employee_name(self, client: AsyncClient):
        """PUT /employees/{id} should update fields."""
        token = await _get_token(client)
        role_id = await _create_role(client, token)
        create_resp = await client.post(
            "/employees",
            json={
                "name": "Old Name",
                "email": "update@sela.co",
                "roleId": role_id,
                "actualAvailabilityPercentage": 100,
                "targetUtilizationPercentage": 100,
            },
            headers=_auth_headers(token),
        )
        emp_id = create_resp.json()["data"]["id"]
        response = await client.put(
            f"/employees/{emp_id}",
            json={"name": "New Name"},
            headers=_auth_headers(token),
        )
        assert response.status_code == 200
        assert response.json()["data"]["name"] == "New Name"


class TestDeleteEmployee:
    async def test_delete_employee(self, client: AsyncClient):
        """DELETE /employees/{id} should delete the employee."""
        token = await _get_token(client)
        role_id = await _create_role(client, token)
        create_resp = await client.post(
            "/employees",
            json={
                "name": "Delete Me",
                "email": "delete@sela.co",
                "roleId": role_id,
                "actualAvailabilityPercentage": 100,
                "targetUtilizationPercentage": 100,
            },
            headers=_auth_headers(token),
        )
        emp_id = create_resp.json()["data"]["id"]
        response = await client.delete(
            f"/employees/{emp_id}", headers=_auth_headers(token)
        )
        assert response.status_code == 200
        get_resp = await client.get(
            f"/employees/{emp_id}", headers=_auth_headers(token)
        )
        assert get_resp.status_code == 404


class TestEmployeeRole:
    async def test_create_employee_with_role(self, client: AsyncClient):
        """POST /employees with roleId should persist the role."""
        token = await _get_token(client)
        role_id = await _create_role(client, token, "Architect", 250)
        response = await client.post(
            "/employees",
            json={
                "name": "Arch Alice",
                "email": "arch@sela.co",
                "roleId": role_id,
                "hourlyRate": 200,
                "actualAvailabilityPercentage": 100,
                "targetUtilizationPercentage": 90,
            },
            headers=_auth_headers(token),
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["roleId"] == role_id
        assert data["roleName"] == "Architect"

    async def test_update_employee_role(self, client: AsyncClient):
        """PUT /employees/{id} should allow changing the roleId."""
        token = await _get_token(client)
        dev_role_id = await _create_role(client, token, "Developer", 150)
        devops_role_id = await _create_role(client, token, "DevOps", 200)
        create_resp = await client.post(
            "/employees",
            json={
                "name": "Role Change",
                "email": "rolechange@sela.co",
                "roleId": dev_role_id,
                "actualAvailabilityPercentage": 100,
                "targetUtilizationPercentage": 90,
            },
            headers=_auth_headers(token),
        )
        emp_id = create_resp.json()["data"]["id"]
        response = await client.put(
            f"/employees/{emp_id}",
            json={"roleId": devops_role_id},
            headers=_auth_headers(token),
        )
        assert response.status_code == 200
        assert response.json()["data"]["roleId"] == devops_role_id
        assert response.json()["data"]["roleName"] == "DevOps"

    async def test_filter_employees_by_role_id(self, client: AsyncClient):
        """GET /employees?roleId=X should filter by role."""
        token = await _get_token(client)
        arch_role_id = await _create_role(client, token, "Architect", 250)
        dev_role_id = await _create_role(client, token, "Developer", 150)
        devops_role_id = await _create_role(client, token, "DevOps", 200)
        for name, email, rid in [
            ("Arch1", "arch1@sela.co", arch_role_id),
            ("Dev1", "dev1@sela.co", dev_role_id),
            ("Devops1", "devops1@sela.co", devops_role_id),
        ]:
            await client.post(
                "/employees",
                json={
                    "name": name,
                    "email": email,
                    "roleId": rid,
                    "actualAvailabilityPercentage": 100,
                    "targetUtilizationPercentage": 90,
                },
                headers=_auth_headers(token),
            )
        response = await client.get(
            f"/employees?roleId={arch_role_id}", headers=_auth_headers(token)
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data) == 1
        assert data[0]["roleId"] == arch_role_id
