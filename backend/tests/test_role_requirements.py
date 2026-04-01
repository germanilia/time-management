from httpx import AsyncClient


async def _setup_project(client: AsyncClient) -> tuple[str, str, str, str, str]:
    """Returns (token, project_id, phase_id, arch_role_id, devops_role_id)."""
    resp = await client.post(
        "/auth/login",
        json={"email": "iliag@sela.co.il", "password": "Cowabunga1!"},
    )
    token = resp.json()["data"]["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    arch_resp = await client.post(
        "/roles",
        json={"name": "Architect", "defaultHourlyRate": 250},
        headers=headers,
    )
    arch_role_id = arch_resp.json()["data"]["id"]

    devops_resp = await client.post(
        "/roles",
        json={"name": "DevOps", "defaultHourlyRate": 200},
        headers=headers,
    )
    devops_role_id = devops_resp.json()["data"]["id"]

    proj_resp = await client.post(
        "/projects",
        json={
            "name": "Req Project",
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
                }
            ],
        },
        headers=headers,
    )
    project_id = proj_resp.json()["data"]["id"]
    phase_id = proj_resp.json()["data"]["phases"][0]["id"]
    return token, project_id, phase_id, arch_role_id, devops_role_id


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestCreateRoleRequirement:
    async def test_create_phase_role_requirement(self, client: AsyncClient):
        """POST /projects/{pid}/phases/{phid}/role-requirements should create requirement."""
        token, project_id, phase_id, arch_role_id, _ = await _setup_project(client)
        response = await client.post(
            f"/projects/{project_id}/phases/{phase_id}/role-requirements",
            json={
                "roleId": arch_role_id,
                "allocationPercentage": 50,
                "count": 1,
            },
            headers=_headers(token),
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["roleId"] == arch_role_id
        assert data["roleName"] == "Architect"
        assert data["allocationPercentage"] == 50
        assert data["count"] == 1

    async def test_create_global_role_requirement(self, client: AsyncClient):
        """POST /projects/{pid}/role-requirements should create project-level requirement."""
        token, project_id, _, _, devops_role_id = await _setup_project(client)
        response = await client.post(
            f"/projects/{project_id}/role-requirements",
            json={
                "roleId": devops_role_id,
                "allocationPercentage": 100,
                "count": 2,
            },
            headers=_headers(token),
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["roleId"] == devops_role_id
        assert data["roleName"] == "DevOps"
        assert data["allocationPercentage"] == 100
        assert data["count"] == 2
        assert data["phaseId"] is None


class TestListRoleRequirements:
    async def test_list_phase_role_requirements(self, client: AsyncClient):
        """GET /projects/{pid}/phases/{phid}/role-requirements should list phase requirements."""
        token, project_id, phase_id, arch_role_id, devops_role_id = await _setup_project(
            client
        )
        await client.post(
            f"/projects/{project_id}/phases/{phase_id}/role-requirements",
            json={"roleId": arch_role_id, "allocationPercentage": 50, "count": 1},
            headers=_headers(token),
        )
        await client.post(
            f"/projects/{project_id}/phases/{phase_id}/role-requirements",
            json={"roleId": devops_role_id, "allocationPercentage": 100, "count": 1},
            headers=_headers(token),
        )
        response = await client.get(
            f"/projects/{project_id}/phases/{phase_id}/role-requirements",
            headers=_headers(token),
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data) == 2

    async def test_list_global_role_requirements(self, client: AsyncClient):
        """GET /projects/{pid}/role-requirements should list project-level requirements."""
        token, project_id, _, _, devops_role_id = await _setup_project(client)
        await client.post(
            f"/projects/{project_id}/role-requirements",
            json={"roleId": devops_role_id, "allocationPercentage": 100, "count": 2},
            headers=_headers(token),
        )
        response = await client.get(
            f"/projects/{project_id}/role-requirements",
            headers=_headers(token),
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data) == 1
        assert data[0]["phaseId"] is None


class TestDeleteRoleRequirement:
    async def test_delete_role_requirement(self, client: AsyncClient):
        """DELETE /projects/{pid}/role-requirements/{rid} should remove it."""
        token, project_id, phase_id, arch_role_id, _ = await _setup_project(client)
        create_resp = await client.post(
            f"/projects/{project_id}/phases/{phase_id}/role-requirements",
            json={"roleId": arch_role_id, "allocationPercentage": 50, "count": 1},
            headers=_headers(token),
        )
        req_id = create_resp.json()["data"]["id"]
        response = await client.delete(
            f"/projects/{project_id}/role-requirements/{req_id}",
            headers=_headers(token),
        )
        assert response.status_code == 200
        list_resp = await client.get(
            f"/projects/{project_id}/phases/{phase_id}/role-requirements",
            headers=_headers(token),
        )
        assert len(list_resp.json()["data"]) == 0
