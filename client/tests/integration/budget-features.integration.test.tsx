import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { ProjectsPage } from "@/pages/ProjectsPage";

vi.mock("@/services/project-service", () => ({
  getProject: vi.fn().mockResolvedValue({
    id: "proj-1",
    name: "Budget Project",
    description: "Test budget",
    startDate: "2026-04-01",
    endDate: "2026-12-31",
    status: "active",
    phases: [
      {
        id: "phase-1",
        projectId: "proj-1",
        name: "Phase 1",
        startDate: "2026-04-01",
        endDate: "2026-06-30",
        allocationType: "hours",
        requiredHours: 500,
        requiredHeadcount: null,
        budget: 60000,
        phaseOrder: 0,
        roleRequirements: [],
        createdAt: "2026-03-30T00:00:00Z",
        updatedAt: "2026-03-30T00:00:00Z",
      },
      {
        id: "phase-2",
        projectId: "proj-1",
        name: "Phase 2",
        startDate: "2026-07-01",
        endDate: "2026-09-30",
        allocationType: "hours",
        requiredHours: 300,
        requiredHeadcount: null,
        budget: 30000,
        phaseOrder: 1,
        roleRequirements: [],
        createdAt: "2026-03-30T00:00:00Z",
        updatedAt: "2026-03-30T00:00:00Z",
      },
    ],
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  }),
  listProjects: vi.fn().mockResolvedValue([]),
  createProject: vi.fn().mockResolvedValue({
    id: "new-proj",
    name: "New",
    startDate: "2026-04-01",
    endDate: null,
    status: "planning",
    phases: [],
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  }),
  deleteProject: vi.fn(),
}));

vi.mock("@/services/employee-service", () => ({
  listEmployees: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/services/assignment-service", () => ({
  listAssignments: vi.fn().mockResolvedValue([]),
  createAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
}));

vi.mock("@/services/analytics-service", () => ({
  getBudgetInsights: vi.fn().mockResolvedValue({
    projectId: "proj-1",
    projectName: "Budget Project",
    totalBudget: 90000,
    totalCost: 50000,
    totalProfit: 40000,
    marginPercentage: 44.4,
    phases: [
      {
        phaseId: "phase-1",
        phaseName: "Phase 1",
        budget: 60000,
        cost: 35000,
        profit: 25000,
        marginPercentage: 41.7,
      },
      {
        phaseId: "phase-2",
        phaseName: "Phase 2",
        budget: 30000,
        cost: 15000,
        profit: 15000,
        marginPercentage: 50.0,
      },
    ],
  }),
  getUtilization: vi.fn(),
  getEmployeeUtilization: vi.fn(),
  getCapacityForecast: vi.fn(),
}));

vi.mock("@/services/role-service", () => ({
  listRoles: vi.fn().mockResolvedValue([
    { id: "role-1", name: "Developer", defaultHourlyRate: 150, createdAt: "2026-03-30T00:00:00Z", updatedAt: "2026-03-30T00:00:00Z" },
    { id: "role-2", name: "Architect", defaultHourlyRate: 250, createdAt: "2026-03-30T00:00:00Z", updatedAt: "2026-03-30T00:00:00Z" },
    { id: "role-3", name: "DevOps", defaultHourlyRate: 200, createdAt: "2026-03-30T00:00:00Z", updatedAt: "2026-03-30T00:00:00Z" },
  ]),
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

function renderDetailPage() {
  return render(
    <MemoryRouter initialEntries={["/projects/proj-1"]}>
      <Routes>
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderProjectsPage() {
  return render(
    <MemoryRouter initialEntries={["/projects"]}>
      <Routes>
        <Route path="/projects" element={<ProjectsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Budget Features - Project Detail Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display budget column in phases table", async () => {
    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByTestId("project-phases-section")).toBeInTheDocument();
    });

    expect(screen.getByTestId("phase-budget-phase-1")).toHaveTextContent("60,000");
    expect(screen.getByTestId("phase-budget-phase-2")).toHaveTextContent("30,000");
  });

  it("should display budget insights section", async () => {
    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByTestId("budget-insights-section")).toBeInTheDocument();
    });

    expect(screen.getByTestId("budget-total-budget")).toHaveTextContent("90,000");
    expect(screen.getByTestId("budget-total-cost")).toHaveTextContent("50,000");
    expect(screen.getByTestId("budget-total-profit")).toHaveTextContent("40,000");
    expect(screen.getByTestId("budget-margin-percentage")).toBeInTheDocument();
  });

  it("should display per-phase budget breakdown", async () => {
    renderDetailPage();

    await waitFor(() => {
      expect(screen.getByTestId("budget-insights-section")).toBeInTheDocument();
    });

    expect(screen.getByTestId("budget-phase-phase-1-cost")).toHaveTextContent("35,000");
    expect(screen.getByTestId("budget-phase-phase-1-profit")).toHaveTextContent("25,000");
    expect(screen.getByTestId("budget-phase-phase-2-cost")).toHaveTextContent("15,000");
    expect(screen.getByTestId("budget-phase-phase-2-profit")).toHaveTextContent("15,000");
  });
});

describe("Budget Features - Project Form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show budget input for each phase in the form", async () => {
    const user = userEvent.setup();
    renderProjectsPage();

    await user.click(screen.getByTestId("project-create-button"));
    await user.type(screen.getByTestId("project-name-input"), "Test");
    await user.type(screen.getByTestId("project-start-date-input"), "2026-04-01");
    await user.click(screen.getByTestId("wizard-next-button"));
    await user.click(screen.getByTestId("project-add-phase-button"));

    expect(screen.getByTestId("phase-0-budget-input")).toBeInTheDocument();
  });

  it("should submit project with phase budget", async () => {
    const { createProject } = await import("@/services/project-service");
    const user = userEvent.setup();
    renderProjectsPage();

    // Step 1: Project Info
    await user.click(screen.getByTestId("project-create-button"));
    await user.type(screen.getByTestId("project-name-input"), "Budget Test");
    await user.clear(screen.getByTestId("project-start-date-input"));
    await user.type(screen.getByTestId("project-start-date-input"), "2026-04-01");
    await user.clear(screen.getByTestId("project-end-date-input"));
    await user.type(screen.getByTestId("project-end-date-input"), "2026-12-31");
    await user.click(screen.getByTestId("wizard-next-button"));

    // Step 2: Phases
    await user.click(screen.getByTestId("project-add-phase-button"));
    await user.type(screen.getByTestId("phase-0-name-input"), "Budgeted Phase");
    await user.clear(screen.getByTestId("phase-0-start-date-input"));
    await user.type(screen.getByTestId("phase-0-start-date-input"), "2026-04-01");
    await user.clear(screen.getByTestId("phase-0-end-date-input"));
    await user.type(screen.getByTestId("phase-0-end-date-input"), "2026-06-30");
    await user.type(screen.getByTestId("phase-0-budget-input"), "50000");

    // Step 3: Review -> Create
    await user.click(screen.getByTestId("wizard-next-button"));
    await user.click(screen.getByTestId("project-form-save-button"));

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          phases: expect.arrayContaining([
            expect.objectContaining({
              name: "Budgeted Phase",
              budget: 50000,
            }),
          ]),
        }),
      );
    });
  });

  it("should allow creating project without end date", async () => {
    const { createProject } = await import("@/services/project-service");
    const user = userEvent.setup();
    renderProjectsPage();

    // Step 1: Project Info (no end date)
    await user.click(screen.getByTestId("project-create-button"));
    await user.type(screen.getByTestId("project-name-input"), "Ongoing Project");
    await user.clear(screen.getByTestId("project-start-date-input"));
    await user.type(screen.getByTestId("project-start-date-input"), "2026-04-01");
    // Leave end date empty

    // Navigate: Next -> Next -> Create
    await user.click(screen.getByTestId("wizard-next-button"));
    await user.click(screen.getByTestId("wizard-next-button"));
    await user.click(screen.getByTestId("project-form-save-button"));

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Ongoing Project",
          startDate: "2026-04-01",
        }),
      );
      const callArgs = (createProject as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.endDate).toBeUndefined();
    });
  });
});
