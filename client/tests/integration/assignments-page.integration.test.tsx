import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AssignmentsPage } from "@/pages/AssignmentsPage";
import { selectSearchableOption } from "../utils/searchable-select";

const mockAssignments = [
  {
    id: "assign-1",
    projectId: "proj-1",
    phaseId: "phase-1",
    employeeId: "emp-1",
    allocationType: "percentage",
    allocatedHours: null,
    allocationPercentage: 50,
    hourlyRateOverride: null,
    startDate: "2026-04-01",
    endDate: "2026-06-30",
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },
  {
    id: "assign-2",
    projectId: "proj-2",
    phaseId: "phase-2",
    employeeId: "emp-1",
    allocationType: "hours",
    allocatedHours: 200,
    allocationPercentage: null,
    hourlyRateOverride: null,
    startDate: "2026-04-01",
    endDate: "2026-06-30",
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },
  {
    id: "assign-3",
    projectId: "proj-1",
    phaseId: "phase-1",
    employeeId: "emp-2",
    allocationType: "percentage",
    allocatedHours: null,
    allocationPercentage: 30,
    hourlyRateOverride: null,
    startDate: "2026-04-01",
    endDate: "2026-06-30",
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },
];

const { mockListAssignments, mockDeleteAssignment } = vi.hoisted(() => ({
  mockListAssignments: vi.fn(),
  mockDeleteAssignment: vi.fn(),
}));

vi.mock("@/services/assignment-service", () => ({
  listAssignments: (...args: unknown[]) => mockListAssignments(...args),
  deleteAssignment: (...args: unknown[]) => mockDeleteAssignment(...args),
}));

vi.mock("@/services/project-service", () => ({
  listProjects: vi.fn().mockResolvedValue([
    {
      id: "proj-1",
      name: "Project Alpha",
      description: "",
      startDate: "2026-04-01",
      endDate: "2026-12-31",
      status: "active",
      billingType: "time_and_materials",
      fixedPriceAmount: null,
      fundingSourceId: null,
      phases: [
        {
          id: "phase-1",
          projectId: "proj-1",
          name: "Phase 1",
          startDate: "2026-04-01",
          endDate: "2026-06-30",
          allocationType: "headcount",
          requiredHours: null,
          requiredHeadcount: 2,
          budget: null,
          phaseOrder: 0,
          roleRequirements: [],
          createdAt: "2026-03-30T00:00:00Z",
          updatedAt: "2026-03-30T00:00:00Z",
        },
      ],
      createdAt: "2026-03-30T00:00:00Z",
      updatedAt: "2026-03-30T00:00:00Z",
    },
    {
      id: "proj-2",
      name: "Project Beta",
      description: "",
      startDate: "2026-04-01",
      endDate: "2026-12-31",
      status: "planning",
      billingType: "time_and_materials",
      fixedPriceAmount: null,
      fundingSourceId: null,
      phases: [
        {
          id: "phase-2",
          projectId: "proj-2",
          name: "Phase B1",
          startDate: "2026-04-01",
          endDate: "2026-06-30",
          allocationType: "headcount",
          requiredHours: null,
          requiredHeadcount: 1,
          budget: null,
          phaseOrder: 0,
          roleRequirements: [],
          createdAt: "2026-03-30T00:00:00Z",
          updatedAt: "2026-03-30T00:00:00Z",
        },
      ],
      createdAt: "2026-03-30T00:00:00Z",
      updatedAt: "2026-03-30T00:00:00Z",
    },
  ]),
}));

vi.mock("@/services/employee-service", () => ({
  listEmployees: vi.fn().mockResolvedValue([
    {
      id: "emp-1",
      name: "Alice Smith",
      email: "alice@test.com",
      roleId: "role-1",
      roleName: "Developer",
      hourlyRate: 100,
      effectiveHourlyRate: 100,
      actualAvailabilityPercentage: 100,
      targetUtilizationPercentage: 90,
      status: "active",
      department: "Engineering",
      createdAt: "2026-03-30T00:00:00Z",
      updatedAt: "2026-03-30T00:00:00Z",
    },
    {
      id: "emp-2",
      name: "Bob Jones",
      email: "bob@test.com",
      roleId: "role-1",
      roleName: "Developer",
      hourlyRate: 120,
      effectiveHourlyRate: 120,
      actualAvailabilityPercentage: 100,
      targetUtilizationPercentage: 80,
      status: "active",
      department: "Engineering",
      createdAt: "2026-03-30T00:00:00Z",
      updatedAt: "2026-03-30T00:00:00Z",
    },
  ]),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: "u1", email: "test@test.com", name: "Test", role: "admin", isActive: true },
    isLoading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/assignments"]}>
      <Routes>
        <Route path="/assignments" element={<AssignmentsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Assignments Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListAssignments.mockResolvedValue(mockAssignments);
    mockDeleteAssignment.mockResolvedValue(undefined);
  });

  it("should render page title and assignments table", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("assignments-title")).toHaveTextContent("Assignments");
    });
    expect(screen.getByTestId("assignments-table")).toBeInTheDocument();
  });

  it("should display employee groups", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("employee-group-emp-1")).toBeInTheDocument();
    });
    expect(screen.getByTestId("employee-group-emp-2")).toBeInTheDocument();
  });

  it("should expand employee group to show individual assignments", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("employee-group-emp-1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("employee-group-emp-1"));

    expect(screen.getByTestId("assignment-row-assign-1")).toBeInTheDocument();
    expect(screen.getByTestId("assignment-row-assign-2")).toBeInTheDocument();
  });

  it("should collapse employee group on second click", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("employee-group-emp-1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("employee-group-emp-1"));
    expect(screen.getByTestId("assignment-row-assign-1")).toBeInTheDocument();

    await user.click(screen.getByTestId("employee-group-emp-1"));
    expect(screen.queryByTestId("assignment-row-assign-1")).not.toBeInTheDocument();
  });

  it("should display empty state when no assignments", async () => {
    mockListAssignments.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No assignments found")).toBeInTheDocument();
    });
  });

  it("should display error message when API fails", async () => {
    mockListAssignments.mockRejectedValue(new Error("Server error"));
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("assignments-error")).toHaveTextContent(
        "Failed to load assignments",
      );
    });
  });

  it("should call listAssignments with projectStatus filter", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("assignments-table")).toBeInTheDocument();
    });

    await selectSearchableOption(user, "assignments-filter-project-status", "active");

    await waitFor(() => {
      expect(mockListAssignments).toHaveBeenCalledWith(
        expect.objectContaining({ projectStatus: "active" }),
      );
    });
  });

  it("should call listAssignments with employee filter", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("assignments-table")).toBeInTheDocument();
    });

    await selectSearchableOption(user, "assignments-filter-employee", "emp-1");

    await waitFor(() => {
      expect(mockListAssignments).toHaveBeenCalledWith(
        expect.objectContaining({ employeeId: "emp-1" }),
      );
    });
  });

  it("should call listAssignments with project filter", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("assignments-table")).toBeInTheDocument();
    });

    await selectSearchableOption(user, "assignments-filter-project", "proj-1");

    await waitFor(() => {
      expect(mockListAssignments).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: "proj-1" }),
      );
    });
  });

  it("should call listAssignments with allocation type filter", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("assignments-table")).toBeInTheDocument();
    });

    await selectSearchableOption(
      user,
      "assignments-filter-allocation-type",
      "percentage",
    );

    await waitFor(() => {
      expect(mockListAssignments).toHaveBeenCalledWith(
        expect.objectContaining({ allocationType: "percentage" }),
      );
    });
  });

  it("should delete assignment and reload", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("employee-group-emp-1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("employee-group-emp-1"));
    expect(screen.getByTestId("assignment-delete-assign-1")).toBeInTheDocument();

    const callCountBefore = mockListAssignments.mock.calls.length;
    await user.click(screen.getByTestId("assignment-delete-assign-1"));

    await waitFor(() => {
      expect(mockDeleteAssignment).toHaveBeenCalledWith("assign-1");
    });
    await waitFor(() => {
      expect(mockListAssignments.mock.calls.length).toBeGreaterThan(callCountBefore);
    });
  });
});

describe("Assignments Page (non-admin)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListAssignments.mockResolvedValue(mockAssignments);
  });

  it("should hide delete buttons for non-admin users", async () => {
    const { useAuth } = await import("@/hooks/useAuth");
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u2", email: "viewer@test.com", name: "Viewer", role: "viewer", isActive: true },
      isLoading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("employee-group-emp-1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("employee-group-emp-1"));
    expect(screen.getByTestId("assignment-row-assign-1")).toBeInTheDocument();
    expect(screen.queryByTestId("assignment-delete-assign-1")).not.toBeInTheDocument();
  });
});
