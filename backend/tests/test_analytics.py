from httpx import AsyncClient


async def _setup_with_assignments(client: AsyncClient) -> tuple[str, str, str]:
    """Create user, 2 employees, project with phase, and assignments.
    Returns (token, emp1_id, emp2_id).
    """
    resp = await client.post(
        "/auth/login",
        json={"email": "iliag@sela.co.il", "password": "Cowabunga1!"},
    )
    token = resp.json()["data"]["accessToken"]
    h = {"Authorization": f"Bearer {token}"}

    role_resp = await client.post(
        "/roles",
        json={"name": "Developer", "defaultHourlyRate": 150},
        headers=h,
    )
    role_id = role_resp.json()["data"]["id"]

    emp1 = await client.post(
        "/employees",
        json={
            "name": "Alice",
            "email": "alice@sela.co",
            "roleId": role_id,
            "hourlyRate": 100,
            "actualAvailabilityPercentage": 100,
            "targetUtilizationPercentage": 90,
        },
        headers=h,
    )
    emp1_id = emp1.json()["data"]["id"]

    emp2 = await client.post(
        "/employees",
        json={
            "name": "Bob",
            "email": "bob@sela.co",
            "roleId": role_id,
            "hourlyRate": 120,
            "actualAvailabilityPercentage": 80,
            "targetUtilizationPercentage": 85,
        },
        headers=h,
    )
    emp2_id = emp2.json()["data"]["id"]

    proj = await client.post(
        "/projects",
        json={
            "name": "Proj",
            "startDate": "2026-04-01",
            "endDate": "2026-06-30",
            "phases": [
                {
                    "name": "P1",
                    "startDate": "2026-04-01",
                    "endDate": "2026-06-30",
                    "allocationType": "headcount",
                    "requiredHeadcount": 2,
                    "phaseOrder": 0,
                }
            ],
        },
        headers=h,
    )
    project_id = proj.json()["data"]["id"]
    phase_id = proj.json()["data"]["phases"][0]["id"]

    # Alice 80% for Apr-Jun
    await client.post(
        "/assignments",
        json={
            "projectId": project_id,
            "phaseId": phase_id,
            "employeeId": emp1_id,
            "allocationType": "percentage",
            "allocationPercentage": 80,
            "startDate": "2026-04-01",
            "endDate": "2026-06-30",
        },
        headers=h,
    )
    # Bob is idle (no assignment)

    return token, emp1_id, emp2_id


class TestUtilization:
    async def test_overall_utilization(self, client: AsyncClient):
        """GET /analytics/utilization should return utilization summary."""
        token, _, _ = await _setup_with_assignments(client)
        response = await client.get(
            "/analytics/utilization?startDate=2026-04-01&endDate=2026-06-30",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert "averageUtilization" in data
        assert "totalEmployees" in data
        assert data["totalEmployees"] == 2
        assert data["idleCount"] >= 1  # Bob is idle

    async def test_per_employee_utilization(self, client: AsyncClient):
        """GET /analytics/utilization/employees should return per-employee data."""
        token, _, _ = await _setup_with_assignments(client)
        response = await client.get(
            "/analytics/utilization/employees"
            "?startDate=2026-04-01&endDate=2026-06-30",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data) == 2
        alice = next(e for e in data if e["employeeName"] == "Alice")
        assert alice["averageUtilization"] == 80.0
        bob = next(e for e in data if e["employeeName"] == "Bob")
        assert bob["averageUtilization"] == 0.0


async def _setup_budget_scenario(client: AsyncClient) -> tuple[str, str]:
    """Create project with budgeted phases, employees with rates, and assignments.
    Returns (token, project_id).
    """
    resp = await client.post(
        "/auth/login",
        json={"email": "iliag@sela.co.il", "password": "Cowabunga1!"},
    )
    token = resp.json()["data"]["accessToken"]
    h = {"Authorization": f"Bearer {token}"}

    dev_role = await client.post(
        "/roles",
        json={"name": "Developer", "defaultHourlyRate": 150},
        headers=h,
    )
    dev_role_id = dev_role.json()["data"]["id"]

    arch_role = await client.post(
        "/roles",
        json={"name": "Architect", "defaultHourlyRate": 250},
        headers=h,
    )
    arch_role_id = arch_role.json()["data"]["id"]

    # Create employees with known hourly rates
    emp1 = await client.post(
        "/employees",
        json={
            "name": "Alice",
            "email": "alice-b@sela.co",
            "roleId": dev_role_id,
            "hourlyRate": 100,
            "actualAvailabilityPercentage": 100,
            "targetUtilizationPercentage": 90,
        },
        headers=h,
    )
    emp1_id = emp1.json()["data"]["id"]

    emp2 = await client.post(
        "/employees",
        json={
            "name": "Bob",
            "email": "bob-b@sela.co",
            "roleId": arch_role_id,
            "hourlyRate": 150,
            "actualAvailabilityPercentage": 100,
            "targetUtilizationPercentage": 90,
        },
        headers=h,
    )
    emp2_id = emp2.json()["data"]["id"]

    # Create project with 2 phases, each with budget
    proj = await client.post(
        "/projects",
        json={
            "name": "Budget Proj",
            "startDate": "2026-04-01",
            "endDate": "2026-09-30",
            "phases": [
                {
                    "name": "Phase 1",
                    "startDate": "2026-04-01",
                    "endDate": "2026-06-30",
                    "allocationType": "hours",
                    "requiredHours": 500,
                    "phaseOrder": 0,
                    "budget": 60000.00,
                },
                {
                    "name": "Phase 2",
                    "startDate": "2026-07-01",
                    "endDate": "2026-09-30",
                    "allocationType": "hours",
                    "requiredHours": 300,
                    "phaseOrder": 1,
                    "budget": 30000.00,
                },
            ],
        },
        headers=h,
    )
    project_id = proj.json()["data"]["id"]
    phase1_id = proj.json()["data"]["phases"][0]["id"]
    phase2_id = proj.json()["data"]["phases"][1]["id"]

    # Alice on Phase 1: 200 hours at $100/hr = $20,000 cost
    await client.post(
        "/assignments",
        json={
            "projectId": project_id,
            "phaseId": phase1_id,
            "employeeId": emp1_id,
            "allocationType": "hours",
            "allocatedHours": 200,
            "startDate": "2026-04-01",
            "endDate": "2026-06-30",
        },
        headers=h,
    )

    # Bob on Phase 1: 100 hours at $150/hr = $15,000 cost
    await client.post(
        "/assignments",
        json={
            "projectId": project_id,
            "phaseId": phase1_id,
            "employeeId": emp2_id,
            "allocationType": "hours",
            "allocatedHours": 100,
            "startDate": "2026-04-01",
            "endDate": "2026-06-30",
        },
        headers=h,
    )

    # Alice on Phase 2: 150 hours at $100/hr = $15,000 cost
    await client.post(
        "/assignments",
        json={
            "projectId": project_id,
            "phaseId": phase2_id,
            "employeeId": emp1_id,
            "allocationType": "hours",
            "allocatedHours": 150,
            "startDate": "2026-07-01",
            "endDate": "2026-09-30",
        },
        headers=h,
    )

    return token, project_id


class TestBudgetInsights:
    async def test_project_budget_overview(self, client: AsyncClient):
        """GET /analytics/budget/{project_id} should return per-phase and total budget insights."""
        token, project_id = await _setup_budget_scenario(client)
        response = await client.get(
            f"/analytics/budget/{project_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()["data"]

        assert float(data["totalBudget"]) == 90000.00
        assert float(data["totalCost"]) == 50000.00
        assert float(data["totalProfit"]) == 40000.00

        assert len(data["phases"]) == 2
        phase1 = data["phases"][0]
        assert float(phase1["budget"]) == 60000.00
        assert float(phase1["cost"]) == 35000.00
        assert float(phase1["profit"]) == 25000.00

        phase2 = data["phases"][1]
        assert float(phase2["budget"]) == 30000.00
        assert float(phase2["cost"]) == 15000.00
        assert float(phase2["profit"]) == 15000.00

    async def test_budget_shows_loss_when_over_budget(self, client: AsyncClient):
        """Budget insights should show negative profit when cost exceeds budget."""
        resp = await client.post(
            "/auth/login",
            json={"email": "iliag@sela.co.il", "password": "Cowabunga1!"},
        )
        token = resp.json()["data"]["accessToken"]
        h = {"Authorization": f"Bearer {token}"}

        role_resp = await client.post(
            "/roles",
            json={"name": "Expensive Role", "defaultHourlyRate": 500},
            headers=h,
        )
        role_id = role_resp.json()["data"]["id"]

        emp = await client.post(
            "/employees",
            json={
                "name": "Expensive Ed",
                "email": "ed@sela.co",
                "roleId": role_id,
                "hourlyRate": 500,
                "actualAvailabilityPercentage": 100,
                "targetUtilizationPercentage": 90,
            },
            headers=h,
        )
        emp_id = emp.json()["data"]["id"]

        proj = await client.post(
            "/projects",
            json={
                "name": "Loss Proj",
                "startDate": "2026-04-01",
                "endDate": "2026-06-30",
                "phases": [
                    {
                        "name": "Expensive Phase",
                        "startDate": "2026-04-01",
                        "endDate": "2026-06-30",
                        "allocationType": "hours",
                        "requiredHours": 200,
                        "phaseOrder": 0,
                        "budget": 10000.00,
                    }
                ],
            },
            headers=h,
        )
        project_id = proj.json()["data"]["id"]
        phase_id = proj.json()["data"]["phases"][0]["id"]

        await client.post(
            "/assignments",
            json={
                "projectId": project_id,
                "phaseId": phase_id,
                "employeeId": emp_id,
                "allocationType": "hours",
                "allocatedHours": 200,
                "startDate": "2026-04-01",
                "endDate": "2026-06-30",
            },
            headers=h,
        )

        response = await client.get(
            f"/analytics/budget/{project_id}", headers=h
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert float(data["totalProfit"]) == -90000.00
        assert float(data["marginPercentage"]) < 0

    async def test_budget_for_nonexistent_project_returns_404(
        self, client: AsyncClient
    ):
        """GET /analytics/budget/{id} for unknown project should return 404."""
        resp = await client.post(
            "/auth/login",
            json={"email": "iliag@sela.co.il", "password": "Cowabunga1!"},
        )
        token = resp.json()["data"]["accessToken"]
        response = await client.get(
            "/analytics/budget/00000000-0000-0000-0000-000000000000",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 404


class TestCapacity:
    async def test_capacity_forecast(self, client: AsyncClient):
        """GET /analytics/capacity should return period-based forecast."""
        token, _, _ = await _setup_with_assignments(client)
        response = await client.get(
            "/analytics/capacity"
            "?startDate=2026-04-01&endDate=2026-06-30&granularity=monthly",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert "periods" in data
        assert len(data["periods"]) >= 1
