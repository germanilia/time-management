from httpx import AsyncClient


async def _setup(client: AsyncClient) -> tuple[str, str, str, str]:
    """Returns (token, employee_id, project_id, phase_id)."""
    resp = await client.post(
        "/auth/login",
        json={"email": "iliag@sela.co.il", "password": "Cowabunga1!"},
    )
    token = resp.json()["data"]["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    role_resp = await client.post(
        "/roles",
        json={"name": "Developer", "defaultHourlyRate": 150},
        headers=headers,
    )
    role_id = role_resp.json()["data"]["id"]

    emp_resp = await client.post(
        "/employees",
        json={
            "name": "Alice",
            "email": "alice@sela.co",
            "roleId": role_id,
            "hourlyRate": 100,
            "actualAvailabilityPercentage": 100,
            "targetUtilizationPercentage": 90,
        },
        headers=headers,
    )
    employee_id = emp_resp.json()["data"]["id"]

    proj_resp = await client.post(
        "/projects",
        json={
            "name": "Project A",
            "startDate": "2026-04-01",
            "endDate": "2026-12-31",
            "phases": [
                {
                    "name": "Phase 1",
                    "startDate": "2026-04-01",
                    "endDate": "2026-06-30",
                    "allocationType": "headcount",
                    "requiredHeadcount": 2,
                    "phaseOrder": 0,
                }
            ],
        },
        headers=headers,
    )
    project_id = proj_resp.json()["data"]["id"]
    phase_id = proj_resp.json()["data"]["phases"][0]["id"]
    return token, employee_id, project_id, phase_id


async def _setup_with_statuses(
    client: AsyncClient,
) -> tuple[str, str, str, str, str, str]:
    """Returns (token, employee_id, project_a_id, phase_a_id, project_b_id, phase_b_id).

    Project A has default status ("planning"), Project B is updated to "active".
    """
    token, employee_id, project_a_id, phase_a_id = await _setup(client)
    headers = _headers(token)

    proj_b_resp = await client.post(
        "/projects",
        json={
            "name": "Project B",
            "startDate": "2026-04-01",
            "endDate": "2026-12-31",
            "phases": [
                {
                    "name": "Phase B1",
                    "startDate": "2026-04-01",
                    "endDate": "2026-06-30",
                    "allocationType": "headcount",
                    "requiredHeadcount": 2,
                    "phaseOrder": 0,
                }
            ],
        },
        headers=headers,
    )
    project_b_id = proj_b_resp.json()["data"]["id"]
    phase_b_id = proj_b_resp.json()["data"]["phases"][0]["id"]

    await client.put(
        f"/projects/{project_b_id}",
        json={"status": "active"},
        headers=headers,
    )
    return token, employee_id, project_a_id, phase_a_id, project_b_id, phase_b_id


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestCreateAssignment:
    async def test_create_percentage_assignment(self, client: AsyncClient):
        """POST /assignments should create a percentage-based assignment."""
        token, employee_id, project_id, phase_id = await _setup(client)
        response = await client.post(
            "/assignments",
            json={
                "projectId": project_id,
                "phaseId": phase_id,
                "employeeId": employee_id,
                "allocationType": "percentage",
                "allocationPercentage": 50,
                "startDate": "2026-04-01",
                "endDate": "2026-06-30",
            },
            headers=_headers(token),
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["allocationPercentage"] == 50
        assert data["allocationType"] == "percentage"

    async def test_create_hours_assignment(self, client: AsyncClient):
        """POST /assignments should create an hours-based assignment."""
        token, employee_id, project_id, phase_id = await _setup(client)
        response = await client.post(
            "/assignments",
            json={
                "projectId": project_id,
                "phaseId": phase_id,
                "employeeId": employee_id,
                "allocationType": "hours",
                "allocatedHours": 200,
                "startDate": "2026-04-01",
                "endDate": "2026-06-30",
            },
            headers=_headers(token),
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["allocatedHours"] == 200

    async def test_over_allocation_returns_409(self, client: AsyncClient):
        """Two 60% assignments on same dates should return 409."""
        token, employee_id, project_id, phase_id = await _setup(client)
        base = {
            "projectId": project_id,
            "phaseId": phase_id,
            "employeeId": employee_id,
            "allocationType": "percentage",
            "startDate": "2026-04-01",
            "endDate": "2026-06-30",
        }
        await client.post(
            "/assignments",
            json={**base, "allocationPercentage": 60},
            headers=_headers(token),
        )
        response = await client.post(
            "/assignments",
            json={**base, "allocationPercentage": 60},
            headers=_headers(token),
        )
        assert response.status_code == 409

    async def test_non_overlapping_assignments_ok(self, client: AsyncClient):
        """Two 100% assignments on different dates should succeed."""
        token, employee_id, project_id, phase_id = await _setup(client)
        base = {
            "projectId": project_id,
            "phaseId": phase_id,
            "employeeId": employee_id,
            "allocationType": "percentage",
            "allocationPercentage": 100,
        }
        await client.post(
            "/assignments",
            json={**base, "startDate": "2026-04-01", "endDate": "2026-04-30"},
            headers=_headers(token),
        )
        response = await client.post(
            "/assignments",
            json={**base, "startDate": "2026-05-01", "endDate": "2026-05-31"},
            headers=_headers(token),
        )
        assert response.status_code == 200

    async def test_create_assignment_with_hourly_rate_override(
        self, client: AsyncClient
    ):
        """POST /assignments with hourlyRateOverride should persist it."""
        token, employee_id, project_id, phase_id = await _setup(client)
        response = await client.post(
            "/assignments",
            json={
                "projectId": project_id,
                "phaseId": phase_id,
                "employeeId": employee_id,
                "allocationType": "hours",
                "allocatedHours": 100,
                "startDate": "2026-04-01",
                "endDate": "2026-06-30",
                "hourlyRateOverride": 200,
            },
            headers=_headers(token),
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert float(data["hourlyRateOverride"]) == 200


class TestListAssignments:
    async def test_list_assignments_filter_by_employee(
        self, client: AsyncClient
    ):
        """GET /assignments?employeeId=X should filter."""
        token, employee_id, project_id, phase_id = await _setup(client)
        await client.post(
            "/assignments",
            json={
                "projectId": project_id,
                "phaseId": phase_id,
                "employeeId": employee_id,
                "allocationType": "percentage",
                "allocationPercentage": 50,
                "startDate": "2026-04-01",
                "endDate": "2026-06-30",
            },
            headers=_headers(token),
        )
        response = await client.get(
            f"/assignments?employeeId={employee_id}",
            headers=_headers(token),
        )
        assert response.status_code == 200
        assert len(response.json()["data"]) == 1


class TestDeleteAssignment:
    async def test_delete_assignment(self, client: AsyncClient):
        """DELETE /assignments/{id} should remove it."""
        token, employee_id, project_id, phase_id = await _setup(client)
        create_resp = await client.post(
            "/assignments",
            json={
                "projectId": project_id,
                "phaseId": phase_id,
                "employeeId": employee_id,
                "allocationType": "percentage",
                "allocationPercentage": 50,
                "startDate": "2026-04-01",
                "endDate": "2026-06-30",
            },
            headers=_headers(token),
        )
        assignment_id = create_resp.json()["data"]["id"]
        response = await client.delete(
            f"/assignments/{assignment_id}", headers=_headers(token)
        )
        assert response.status_code == 200


class TestListAssignmentFilters:
    async def test_filter_by_project_status(self, client: AsyncClient):
        """GET /assignments?projectStatus=active should return only active-project assignments."""
        token, emp_id, proj_a, ph_a, proj_b, ph_b = await _setup_with_statuses(client)
        headers = _headers(token)
        base = {
            "employeeId": emp_id,
            "allocationType": "percentage",
            "allocationPercentage": 30,
            "startDate": "2026-04-01",
            "endDate": "2026-06-30",
        }
        await client.post(
            "/assignments",
            json={**base, "projectId": proj_a, "phaseId": ph_a},
            headers=headers,
        )
        await client.post(
            "/assignments",
            json={**base, "projectId": proj_b, "phaseId": ph_b},
            headers=headers,
        )

        resp = await client.get(
            "/assignments?projectStatus=active", headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 1
        assert data[0]["projectId"] == proj_b

    async def test_filter_by_project_status_no_match(self, client: AsyncClient):
        """Filtering by a status with no assignments returns empty list."""
        token, emp_id, proj_a, ph_a, proj_b, ph_b = await _setup_with_statuses(client)
        headers = _headers(token)
        await client.post(
            "/assignments",
            json={
                "projectId": proj_a,
                "phaseId": ph_a,
                "employeeId": emp_id,
                "allocationType": "percentage",
                "allocationPercentage": 50,
                "startDate": "2026-04-01",
                "endDate": "2026-06-30",
            },
            headers=headers,
        )

        resp = await client.get(
            "/assignments?projectStatus=completed", headers=headers
        )
        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 0

    async def test_filter_by_project_id(self, client: AsyncClient):
        """GET /assignments?projectId=X should return only that project's assignments."""
        token, emp_id, proj_a, ph_a, proj_b, ph_b = await _setup_with_statuses(client)
        headers = _headers(token)
        base = {
            "employeeId": emp_id,
            "allocationType": "percentage",
            "allocationPercentage": 30,
            "startDate": "2026-04-01",
            "endDate": "2026-06-30",
        }
        await client.post(
            "/assignments",
            json={**base, "projectId": proj_a, "phaseId": ph_a},
            headers=headers,
        )
        await client.post(
            "/assignments",
            json={**base, "projectId": proj_b, "phaseId": ph_b},
            headers=headers,
        )

        resp = await client.get(
            f"/assignments?projectId={proj_a}", headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 1
        assert data[0]["projectId"] == proj_a

    async def test_filter_by_phase_id(self, client: AsyncClient):
        """GET /assignments?phaseId=X should return only that phase's assignments."""
        token, emp_id, proj_a, ph_a, proj_b, ph_b = await _setup_with_statuses(client)
        headers = _headers(token)
        base = {
            "employeeId": emp_id,
            "allocationType": "percentage",
            "allocationPercentage": 30,
            "startDate": "2026-04-01",
            "endDate": "2026-06-30",
        }
        await client.post(
            "/assignments",
            json={**base, "projectId": proj_a, "phaseId": ph_a},
            headers=headers,
        )
        await client.post(
            "/assignments",
            json={**base, "projectId": proj_b, "phaseId": ph_b},
            headers=headers,
        )

        resp = await client.get(
            f"/assignments?phaseId={ph_b}", headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 1
        assert data[0]["phaseId"] == ph_b

    async def test_filter_by_allocation_type(self, client: AsyncClient):
        """GET /assignments?allocationType=percentage returns only percentage assignments."""
        token, emp_id, project_id, phase_id = await _setup(client)
        headers = _headers(token)
        await client.post(
            "/assignments",
            json={
                "projectId": project_id,
                "phaseId": phase_id,
                "employeeId": emp_id,
                "allocationType": "percentage",
                "allocationPercentage": 40,
                "startDate": "2026-04-01",
                "endDate": "2026-04-30",
            },
            headers=headers,
        )
        await client.post(
            "/assignments",
            json={
                "projectId": project_id,
                "phaseId": phase_id,
                "employeeId": emp_id,
                "allocationType": "hours",
                "allocatedHours": 100,
                "startDate": "2026-05-01",
                "endDate": "2026-05-31",
            },
            headers=headers,
        )

        resp = await client.get(
            "/assignments?allocationType=percentage", headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 1
        assert data[0]["allocationType"] == "percentage"

    async def test_filter_by_date_range(self, client: AsyncClient):
        """GET /assignments?startDate=X&endDate=Y returns overlapping assignments only."""
        token, emp_id, project_id, phase_id = await _setup(client)
        headers = _headers(token)
        await client.post(
            "/assignments",
            json={
                "projectId": project_id,
                "phaseId": phase_id,
                "employeeId": emp_id,
                "allocationType": "percentage",
                "allocationPercentage": 50,
                "startDate": "2026-04-01",
                "endDate": "2026-04-30",
            },
            headers=headers,
        )
        await client.post(
            "/assignments",
            json={
                "projectId": project_id,
                "phaseId": phase_id,
                "employeeId": emp_id,
                "allocationType": "percentage",
                "allocationPercentage": 50,
                "startDate": "2026-06-01",
                "endDate": "2026-06-30",
            },
            headers=headers,
        )

        resp = await client.get(
            "/assignments?startDate=2026-06-01&endDate=2026-06-30",
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 1
        assert data[0]["startDate"] == "2026-06-01"

    async def test_combined_filters(self, client: AsyncClient):
        """Combining projectStatus + allocationType returns their intersection."""
        token, emp_id, proj_a, ph_a, proj_b, ph_b = await _setup_with_statuses(client)
        headers = _headers(token)
        # Percentage on planning project
        await client.post(
            "/assignments",
            json={
                "projectId": proj_a,
                "phaseId": ph_a,
                "employeeId": emp_id,
                "allocationType": "percentage",
                "allocationPercentage": 30,
                "startDate": "2026-04-01",
                "endDate": "2026-04-30",
            },
            headers=headers,
        )
        # Hours on active project
        await client.post(
            "/assignments",
            json={
                "projectId": proj_b,
                "phaseId": ph_b,
                "employeeId": emp_id,
                "allocationType": "hours",
                "allocatedHours": 100,
                "startDate": "2026-05-01",
                "endDate": "2026-05-31",
            },
            headers=headers,
        )
        # Percentage on active project
        await client.post(
            "/assignments",
            json={
                "projectId": proj_b,
                "phaseId": ph_b,
                "employeeId": emp_id,
                "allocationType": "percentage",
                "allocationPercentage": 20,
                "startDate": "2026-06-01",
                "endDate": "2026-06-30",
            },
            headers=headers,
        )

        resp = await client.get(
            "/assignments?projectStatus=active&allocationType=percentage",
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) == 1
        assert data[0]["allocationType"] == "percentage"
        assert data[0]["projectId"] == proj_b


class TestGetAssignment:
    async def test_get_assignment_by_id(self, client: AsyncClient):
        """GET /assignments/{id} should return the assignment."""
        token, emp_id, project_id, phase_id = await _setup(client)
        headers = _headers(token)
        create_resp = await client.post(
            "/assignments",
            json={
                "projectId": project_id,
                "phaseId": phase_id,
                "employeeId": emp_id,
                "allocationType": "percentage",
                "allocationPercentage": 75,
                "startDate": "2026-04-01",
                "endDate": "2026-06-30",
            },
            headers=headers,
        )
        assignment_id = create_resp.json()["data"]["id"]

        resp = await client.get(
            f"/assignments/{assignment_id}", headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["id"] == assignment_id
        assert data["allocationPercentage"] == 75

    async def test_get_assignment_not_found(self, client: AsyncClient):
        """GET /assignments/{unknown-id} should return 404."""
        token, *_ = await _setup(client)
        resp = await client.get(
            "/assignments/00000000-0000-0000-0000-000000000000",
            headers=_headers(token),
        )
        assert resp.status_code == 404


class TestUpdateAssignment:
    async def test_update_assignment_dates(self, client: AsyncClient):
        """PUT /assignments/{id} should update dates."""
        token, emp_id, project_id, phase_id = await _setup(client)
        headers = _headers(token)
        create_resp = await client.post(
            "/assignments",
            json={
                "projectId": project_id,
                "phaseId": phase_id,
                "employeeId": emp_id,
                "allocationType": "percentage",
                "allocationPercentage": 50,
                "startDate": "2026-04-01",
                "endDate": "2026-06-30",
            },
            headers=headers,
        )
        assignment_id = create_resp.json()["data"]["id"]

        resp = await client.put(
            f"/assignments/{assignment_id}",
            json={"startDate": "2026-05-01", "endDate": "2026-05-31"},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["startDate"] == "2026-05-01"
        assert data["endDate"] == "2026-05-31"

    async def test_update_assignment_allocation(self, client: AsyncClient):
        """PUT /assignments/{id} should update allocation type."""
        token, emp_id, project_id, phase_id = await _setup(client)
        headers = _headers(token)
        create_resp = await client.post(
            "/assignments",
            json={
                "projectId": project_id,
                "phaseId": phase_id,
                "employeeId": emp_id,
                "allocationType": "percentage",
                "allocationPercentage": 50,
                "startDate": "2026-04-01",
                "endDate": "2026-06-30",
            },
            headers=headers,
        )
        assignment_id = create_resp.json()["data"]["id"]

        resp = await client.put(
            f"/assignments/{assignment_id}",
            json={"allocationType": "hours", "allocatedHours": 100},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["allocationType"] == "hours"
        assert data["allocatedHours"] == 100

    async def test_update_assignment_not_found(self, client: AsyncClient):
        """PUT /assignments/{unknown-id} should return 404."""
        token, *_ = await _setup(client)
        resp = await client.put(
            "/assignments/00000000-0000-0000-0000-000000000000",
            json={"allocationPercentage": 80},
            headers=_headers(token),
        )
        assert resp.status_code == 404
