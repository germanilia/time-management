import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { selectSearchableOption } from "../utils/searchable-select";

vi.mock("@/services/project-service", () => ({
  getProject: vi.fn().mockResolvedValue({
    id: "proj-1",
    name: "Project Alpha",
    description: "Test project",
    startDate: "2026-04-01",
    endDate: "2026-12-31",
    status: "active",
    phases: [
      {
        id: "phase-1",
        projectId: "proj-1",
        name: "Ramp-up",
        startDate: "2026-04-01",
        endDate: "2026-06-30",
        allocationType: "headcount",
        requiredHours: null,
        requiredHeadcount: 3,
        budget: null,
        phaseOrder: 0,
        roleRequirements: [],
        createdAt: "2026-03-30T00:00:00Z",
        updatedAt: "2026-03-30T00:00:00Z",
      },
    ],
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  }),
  listProjects: vi.fn().mockResolvedValue([]),
  deleteProject: vi.fn(),
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
  ]),
}));

vi.mock("@/services/assignment-service", () => ({
  listAssignments: vi.fn().mockResolvedValue([
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
  ]),
  createAssignment: vi.fn().mockResolvedValue({
    id: "new-assign",
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
  }),
  deleteAssignment: vi.fn(),
}));

vi.mock("@/services/analytics-service", () => ({
  getBudgetInsights: vi.fn().mockRejectedValue(new Error("not available")),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "test@test.com", name: "Test", role: "admin", isActive: true },
    isLoading: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={["/projects/proj-1"]}>
      <Routes>
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Project Detail Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display project name and details", async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByTestId("project-detail-title")).toHaveTextContent("Project Alpha");
    });
    expect(screen.getByTestId("project-detail-status")).toBeInTheDocument();
    expect(screen.getByTestId("project-detail-dates")).toBeInTheDocument();
  });

  it("should display phases as cards with details", async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByTestId("project-phases-section")).toBeInTheDocument();
    });
    expect(screen.getByTestId("phase-section-phase-1")).toBeInTheDocument();
    expect(screen.getByText("Ramp-up")).toBeInTheDocument();
  });

  it("should display assignments under their phase", async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByTestId("phase-assignments-table-phase-1")).toBeInTheDocument();
    });
    expect(screen.getByTestId("assignment-row-assign-1")).toBeInTheDocument();
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("should show Add Assignment button on each phase for admin", async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByTestId("phase-add-assignment-phase-1")).toBeInTheDocument();
    });
  });

  it("should open assignment form when phase Add Assignment button is clicked", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByTestId("phase-add-assignment-phase-1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("phase-add-assignment-phase-1"));

    expect(screen.getByTestId("assignment-form-title")).toBeInTheDocument();
    expect(screen.getByTestId("assignment-employee-select")).toBeInTheDocument();
    expect(screen.getByTestId("assignment-phase-select")).toBeInTheDocument();
    expect(screen.getByTestId("assignment-allocation-type-select")).toBeInTheDocument();
    expect(screen.getByTestId("assignment-rate-override-input")).toBeInTheDocument();
  });

  it("should pre-select phase and auto-fill dates when opening from a phase", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByTestId("phase-add-assignment-phase-1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("phase-add-assignment-phase-1"));

    const phaseSelect = screen.getByTestId("assignment-phase-select");
    expect(phaseSelect).toHaveTextContent("Ramp-up");

    const startInput = screen.getByTestId("assignment-start-date-input") as HTMLInputElement;
    const endInput = screen.getByTestId("assignment-end-date-input") as HTMLInputElement;
    expect(startInput.value).toBe("2026-04-01");
    expect(endInput.value).toBe("2026-06-30");
  });

  it("should create assignment with rate override when form is submitted", async () => {
    const { createAssignment } = await import("@/services/assignment-service");
    const user = userEvent.setup();
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByTestId("phase-add-assignment-phase-1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("phase-add-assignment-phase-1"));

    await selectSearchableOption(user, "assignment-employee-select", "emp-1");

    await user.clear(screen.getByTestId("assignment-percentage-input"));
    await user.type(screen.getByTestId("assignment-percentage-input"), "50");

    await user.clear(screen.getByTestId("assignment-rate-override-input"));
    await user.type(screen.getByTestId("assignment-rate-override-input"), "120");

    await user.click(screen.getByTestId("assignment-form-save-button"));

    await waitFor(() => {
      expect(createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "proj-1",
          phaseId: "phase-1",
          employeeId: "emp-1",
          allocationType: "percentage",
          allocationPercentage: 50,
          hourlyRateOverride: 120,
        }),
      );
    });
  });
});
