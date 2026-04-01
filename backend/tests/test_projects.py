from httpx import AsyncClient


async def _get_token(client: AsyncClient) -> str:
    resp = await client.post(
        "/auth/login",
        json={"email": "iliag@sela.co.il", "password": "Cowabunga1!"},
    )
    return resp.json()["data"]["accessToken"]


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _project_payload() -> dict:
    return {
        "name": "Project Alpha",
        "description": "A test project",
        "startDate": "2026-04-01",
        "endDate": "2026-12-31",
        "phases": [
            {
                "name": "Ramp-up",
                "startDate": "2026-04-01",
                "endDate": "2026-06-30",
                "allocationType": "headcount",
                "requiredHeadcount": 3,
                "phaseOrder": 0,
            },
            {
                "name": "Maintenance",
                "startDate": "2026-07-01",
                "endDate": "2026-12-31",
                "allocationType": "hours",
                "requiredHours": 500,
                "phaseOrder": 1,
            },
        ],
    }


async def _create_role(
    client: AsyncClient, token: str, name: str = "Developer", rate: float = 150
) -> str:
    resp = await client.post(
        "/roles",
        json={"name": name, "defaultHourlyRate": rate},
        headers=_headers(token),
    )
    return resp.json()["data"]["id"]


class TestCreateProject:
    async def test_create_project_with_phases(self, client: AsyncClient):
        """POST /projects should create project with inline phases."""
        token = await _get_token(client)
        response = await client.post(
            "/projects", json=_project_payload(), headers=_headers(token)
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["name"] == "Project Alpha"
        assert len(data["phases"]) == 2
        assert data["phases"][0]["name"] == "Ramp-up"
        assert data["phases"][0]["requiredHeadcount"] == 3
        assert data["phases"][1]["allocationType"] == "hours"
        assert data["phases"][1]["requiredHours"] == 500

    async def test_create_project_without_auth_returns_401(self, client: AsyncClient):
        """POST /projects without auth should return 401."""
        response = await client.post("/projects", json=_project_payload())
        assert response.status_code == 401


class TestListProjects:
    async def test_list_projects(self, client: AsyncClient):
        """GET /projects should return all projects."""
        token = await _get_token(client)
        await client.post(
            "/projects", json=_project_payload(), headers=_headers(token)
        )
        response = await client.get("/projects", headers=_headers(token))
        assert response.status_code == 200
        assert len(response.json()["data"]) == 1


class TestGetProject:
    async def test_get_project_includes_phases(self, client: AsyncClient):
        """GET /projects/{id} should return project with phases."""
        token = await _get_token(client)
        create_resp = await client.post(
            "/projects", json=_project_payload(), headers=_headers(token)
        )
        project_id = create_resp.json()["data"]["id"]
        response = await client.get(
            f"/projects/{project_id}", headers=_headers(token)
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["name"] == "Project Alpha"
        assert len(data["phases"]) == 2

    async def test_get_nonexistent_project_returns_404(self, client: AsyncClient):
        """GET /projects/{id} for unknown id should return 404."""
        token = await _get_token(client)
        response = await client.get(
            "/projects/00000000-0000-0000-0000-000000000000",
            headers=_headers(token),
        )
        assert response.status_code == 404


class TestUpdateProject:
    async def test_update_project_name(self, client: AsyncClient):
        """PUT /projects/{id} should update fields."""
        token = await _get_token(client)
        create_resp = await client.post(
            "/projects", json=_project_payload(), headers=_headers(token)
        )
        project_id = create_resp.json()["data"]["id"]
        response = await client.put(
            f"/projects/{project_id}",
            json={"name": "Project Beta"},
            headers=_headers(token),
        )
        assert response.status_code == 200
        assert response.json()["data"]["name"] == "Project Beta"


class TestDeleteProject:
    async def test_delete_project_cascades_phases(self, client: AsyncClient):
        """DELETE /projects/{id} should delete project and its phases."""
        token = await _get_token(client)
        create_resp = await client.post(
            "/projects", json=_project_payload(), headers=_headers(token)
        )
        project_id = create_resp.json()["data"]["id"]
        response = await client.delete(
            f"/projects/{project_id}", headers=_headers(token)
        )
        assert response.status_code == 200
        get_resp = await client.get(
            f"/projects/{project_id}", headers=_headers(token)
        )
        assert get_resp.status_code == 404


class TestOptionalEndDate:
    async def test_create_project_without_end_date(self, client: AsyncClient):
        """POST /projects without endDate should create an ongoing project."""
        token = await _get_token(client)
        response = await client.post(
            "/projects",
            json={
                "name": "Ongoing Project",
                "startDate": "2026-04-01",
                "phases": [],
            },
            headers=_headers(token),
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["name"] == "Ongoing Project"
        assert data["endDate"] is None

    async def test_get_project_with_null_end_date(self, client: AsyncClient):
        """GET /projects/{id} should return null endDate for ongoing projects."""
        token = await _get_token(client)
        create_resp = await client.post(
            "/projects",
            json={
                "name": "No End",
                "startDate": "2026-04-01",
                "phases": [],
            },
            headers=_headers(token),
        )
        project_id = create_resp.json()["data"]["id"]
        response = await client.get(
            f"/projects/{project_id}", headers=_headers(token)
        )
        assert response.status_code == 200
        assert response.json()["data"]["endDate"] is None

    async def test_update_project_set_end_date(self, client: AsyncClient):
        """PUT /projects/{id} should allow setting endDate on an ongoing project."""
        token = await _get_token(client)
        create_resp = await client.post(
            "/projects",
            json={
                "name": "To Close",
                "startDate": "2026-04-01",
                "phases": [],
            },
            headers=_headers(token),
        )
        project_id = create_resp.json()["data"]["id"]
        response = await client.put(
            f"/projects/{project_id}",
            json={"endDate": "2026-12-31"},
            headers=_headers(token),
        )
        assert response.status_code == 200
        assert response.json()["data"]["endDate"] == "2026-12-31"


class TestPhaseBudget:
    async def test_create_phase_with_budget(self, client: AsyncClient):
        """POST /projects with phase budget should persist budget value."""
        token = await _get_token(client)
        response = await client.post(
            "/projects",
            json={
                "name": "Budget Project",
                "startDate": "2026-04-01",
                "endDate": "2026-12-31",
                "phases": [
                    {
                        "name": "Phase With Budget",
                        "startDate": "2026-04-01",
                        "endDate": "2026-06-30",
                        "allocationType": "hours",
                        "requiredHours": 500,
                        "phaseOrder": 0,
                        "budget": 50000.00,
                    }
                ],
            },
            headers=_headers(token),
        )
        assert response.status_code == 200
        phase = response.json()["data"]["phases"][0]
        assert float(phase["budget"]) == 50000.00

    async def test_create_phase_without_budget_defaults_to_null(
        self, client: AsyncClient
    ):
        """Phase created without budget should have null budget."""
        token = await _get_token(client)
        response = await client.post(
            "/projects",
            json=_project_payload(),
            headers=_headers(token),
        )
        assert response.status_code == 200
        phase = response.json()["data"]["phases"][0]
        assert phase["budget"] is None

    async def test_add_phase_with_budget(self, client: AsyncClient):
        """POST /projects/{id}/phases with budget should persist it."""
        token = await _get_token(client)
        create_resp = await client.post(
            "/projects", json=_project_payload(), headers=_headers(token)
        )
        project_id = create_resp.json()["data"]["id"]
        response = await client.post(
            f"/projects/{project_id}/phases",
            json={
                "name": "Budgeted Phase",
                "startDate": "2026-04-15",
                "endDate": "2026-05-15",
                "allocationType": "hours",
                "requiredHours": 200,
                "phaseOrder": 2,
                "budget": 25000.00,
            },
            headers=_headers(token),
        )
        assert response.status_code == 200
        assert float(response.json()["data"]["budget"]) == 25000.00


class TestPhaseRoleRequirements:
    async def test_create_phase_with_inline_role_requirements(
        self, client: AsyncClient
    ):
        """POST /projects with phases that include roleRequirements should persist them."""
        token = await _get_token(client)
        arch_id = await _create_role(client, token, "Architect", 250)
        dev_id = await _create_role(client, token, "Developer", 150)
        devops_id = await _create_role(client, token, "DevOps", 200)
        response = await client.post(
            "/projects",
            json={
                "name": "Roles Project",
                "startDate": "2026-04-01",
                "endDate": "2026-12-31",
                "phases": [
                    {
                        "name": "Dev Phase",
                        "startDate": "2026-04-01",
                        "endDate": "2026-06-30",
                        "allocationType": "headcount",
                        "requiredHeadcount": 5,
                        "phaseOrder": 0,
                        "roleRequirements": [
                            {"roleId": arch_id, "count": 1, "allocationPercentage": 50},
                            {"roleId": dev_id, "count": 3, "allocationPercentage": 100},
                            {"roleId": devops_id, "count": 1, "allocationPercentage": 100},
                        ],
                    }
                ],
            },
            headers=_headers(token),
        )
        assert response.status_code == 200
        phase = response.json()["data"]["phases"][0]
        assert "roleRequirements" in phase
        assert len(phase["roleRequirements"]) == 3
        role_names = {r["roleName"] for r in phase["roleRequirements"]}
        assert role_names == {"Architect", "Developer", "DevOps"}

    async def test_add_phase_with_role_requirements(self, client: AsyncClient):
        """POST /projects/{id}/phases with roleRequirements should persist them."""
        token = await _get_token(client)
        devops_id = await _create_role(client, token, "DevOps", 200)
        dev_id = await _create_role(client, token, "Developer", 150)
        create_resp = await client.post(
            "/projects", json=_project_payload(), headers=_headers(token)
        )
        project_id = create_resp.json()["data"]["id"]
        response = await client.post(
            f"/projects/{project_id}/phases",
            json={
                "name": "Staffed Phase",
                "startDate": "2026-04-15",
                "endDate": "2026-05-15",
                "allocationType": "headcount",
                "requiredHeadcount": 2,
                "phaseOrder": 2,
                "roleRequirements": [
                    {"roleId": devops_id, "count": 1, "allocationPercentage": 100},
                    {"roleId": dev_id, "count": 1, "allocationPercentage": 100},
                ],
            },
            headers=_headers(token),
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data["roleRequirements"]) == 2

    async def test_get_project_includes_phase_role_requirements(
        self, client: AsyncClient
    ):
        """GET /projects/{id} should include roleRequirements on each phase."""
        token = await _get_token(client)
        arch_id = await _create_role(client, token, "Architect", 250)
        create_resp = await client.post(
            "/projects",
            json={
                "name": "RR Project",
                "startDate": "2026-04-01",
                "endDate": "2026-12-31",
                "phases": [
                    {
                        "name": "Phase A",
                        "startDate": "2026-04-01",
                        "endDate": "2026-06-30",
                        "allocationType": "headcount",
                        "requiredHeadcount": 2,
                        "phaseOrder": 0,
                        "roleRequirements": [
                            {"roleId": arch_id, "count": 2, "allocationPercentage": 100},
                        ],
                    }
                ],
            },
            headers=_headers(token),
        )
        project_id = create_resp.json()["data"]["id"]
        response = await client.get(
            f"/projects/{project_id}", headers=_headers(token)
        )
        assert response.status_code == 200
        phase = response.json()["data"]["phases"][0]
        assert len(phase["roleRequirements"]) == 1
        assert phase["roleRequirements"][0]["roleName"] == "Architect"
        assert phase["roleRequirements"][0]["count"] == 2


class TestPhases:
    async def test_add_phase_to_project(self, client: AsyncClient):
        """POST /projects/{id}/phases should add a new phase."""
        token = await _get_token(client)
        create_resp = await client.post(
            "/projects", json=_project_payload(), headers=_headers(token)
        )
        project_id = create_resp.json()["data"]["id"]
        response = await client.post(
            f"/projects/{project_id}/phases",
            json={
                "name": "Extra Phase",
                "startDate": "2026-04-15",
                "endDate": "2026-05-15",
                "allocationType": "headcount",
                "requiredHeadcount": 1,
                "phaseOrder": 2,
            },
            headers=_headers(token),
        )
        assert response.status_code == 200
        assert response.json()["data"]["name"] == "Extra Phase"

    async def test_list_phases_for_project(self, client: AsyncClient):
        """GET /projects/{id}/phases should list all phases."""
        token = await _get_token(client)
        create_resp = await client.post(
            "/projects", json=_project_payload(), headers=_headers(token)
        )
        project_id = create_resp.json()["data"]["id"]
        response = await client.get(
            f"/projects/{project_id}/phases", headers=_headers(token)
        )
        assert response.status_code == 200
        assert len(response.json()["data"]) == 2

    async def test_delete_phase(self, client: AsyncClient):
        """DELETE /projects/{pid}/phases/{id} should remove the phase."""
        token = await _get_token(client)
        create_resp = await client.post(
            "/projects", json=_project_payload(), headers=_headers(token)
        )
        project_id = create_resp.json()["data"]["id"]
        phases = create_resp.json()["data"]["phases"]
        phase_id = phases[0]["id"]
        response = await client.delete(
            f"/projects/{project_id}/phases/{phase_id}",
            headers=_headers(token),
        )
        assert response.status_code == 200
        list_resp = await client.get(
            f"/projects/{project_id}/phases", headers=_headers(token)
        )
        assert len(list_resp.json()["data"]) == 1
