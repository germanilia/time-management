import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { selectSearchableOption } from "../utils/searchable-select";

vi.mock("@/services/project-service", () => ({
  listProjects: vi.fn().mockResolvedValue([]),
  createProject: vi.fn().mockResolvedValue({
    id: "new-project-id",
    name: "Test Project",
    description: null,
    startDate: "2026-04-01",
    endDate: "2026-12-31",
    status: "planning",
    phases: [],
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  }),
  deleteProject: vi.fn(),
}));

vi.mock("@/services/role-service", () => ({
  listRoles: vi.fn().mockResolvedValue([
    { id: "role-1", name: "Developer", defaultHourlyRate: 150, createdAt: "2026-03-30T00:00:00Z", updatedAt: "2026-03-30T00:00:00Z" },
    { id: "role-2", name: "Architect", defaultHourlyRate: 250, createdAt: "2026-03-30T00:00:00Z", updatedAt: "2026-03-30T00:00:00Z" },
    { id: "role-3", name: "DevOps", defaultHourlyRate: 200, createdAt: "2026-03-30T00:00:00Z", updatedAt: "2026-03-30T00:00:00Z" },
  ]),
}));

vi.mock("@/services/employee-service", () => ({
  listEmployees: vi.fn().mockResolvedValue([
    {
      id: "emp-1",
      name: "Alice Smith",
      email: "alice@test.com",
      roleId: "role-2",
      roleName: "Architect",
      hourlyRate: null,
      effectiveHourlyRate: 250,
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
  createAssignment: vi.fn().mockResolvedValue({}),
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
    <MemoryRouter initialEntries={["/projects"]}>
      <Routes>
        <Route path="/projects" element={<ProjectsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Navigate from project list to the Phases step (step 2) of the wizard. */
async function navigateToPhasesStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId("project-create-button"));
  await user.type(screen.getByTestId("project-name-input"), "Test");
  await user.type(screen.getByTestId("project-start-date-input"), "2026-04-01");
  await user.click(screen.getByTestId("wizard-next-button"));
}

describe("Phase Role Requirements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show Add Role button when a phase is added", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await navigateToPhasesStep(user);
    await user.click(screen.getByTestId("project-add-phase-button"));

    expect(screen.getByTestId("phase-0-add-role-req-button")).toBeInTheDocument();
  });

  it("should add a role requirement row with role select, count, and allocation inputs", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await navigateToPhasesStep(user);
    await user.click(screen.getByTestId("project-add-phase-button"));
    await user.click(screen.getByTestId("phase-0-add-role-req-button"));

    expect(screen.getByTestId("phase-0-rr-0-role-select")).toBeInTheDocument();
    expect(screen.getByTestId("phase-0-rr-0-count-input")).toBeInTheDocument();
    expect(screen.getByTestId("phase-0-rr-0-alloc-input")).toBeInTheDocument();
    expect(screen.getByTestId("phase-0-rr-0-remove-button")).toBeInTheDocument();
  });

  it("should allow adding multiple role requirements to a phase", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await navigateToPhasesStep(user);
    await user.click(screen.getByTestId("project-add-phase-button"));
    await user.click(screen.getByTestId("phase-0-add-role-req-button"));
    await user.click(screen.getByTestId("phase-0-add-role-req-button"));

    expect(screen.getByTestId("phase-0-rr-0-role-select")).toBeInTheDocument();
    expect(screen.getByTestId("phase-0-rr-1-role-select")).toBeInTheDocument();
  });

  it("should remove a role requirement when Remove button is clicked", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await navigateToPhasesStep(user);
    await user.click(screen.getByTestId("project-add-phase-button"));
    await user.click(screen.getByTestId("phase-0-add-role-req-button"));

    expect(screen.getByTestId("phase-0-rr-0-role-select")).toBeInTheDocument();

    await user.click(screen.getByTestId("phase-0-rr-0-remove-button"));

    expect(screen.queryByTestId("phase-0-rr-0-role-select")).not.toBeInTheDocument();
  });

  it("should include role requirements in the submitted project data", async () => {
    const { createProject } = await import("@/services/project-service");
    const user = userEvent.setup();
    renderWithRouter();

    // Step 1: Project Info
    await user.click(screen.getByTestId("project-create-button"));
    await user.type(screen.getByTestId("project-name-input"), "Project With Roles");
    await user.clear(screen.getByTestId("project-start-date-input"));
    await user.type(screen.getByTestId("project-start-date-input"), "2026-04-01");
    await user.click(screen.getByTestId("wizard-next-button"));

    // Step 2: Phases with role requirements
    await user.click(screen.getByTestId("project-add-phase-button"));
    await user.type(screen.getByTestId("phase-0-name-input"), "Dev Phase");
    await user.clear(screen.getByTestId("phase-0-start-date-input"));
    await user.type(screen.getByTestId("phase-0-start-date-input"), "2026-04-01");
    await user.clear(screen.getByTestId("phase-0-end-date-input"));
    await user.type(screen.getByTestId("phase-0-end-date-input"), "2026-06-30");

    await user.click(screen.getByTestId("phase-0-add-role-req-button"));
    await selectSearchableOption(user, "phase-0-rr-0-role-select", "role-2");
    await user.clear(screen.getByTestId("phase-0-rr-0-count-input"));
    await user.type(screen.getByTestId("phase-0-rr-0-count-input"), "2");
    await user.clear(screen.getByTestId("phase-0-rr-0-alloc-input"));
    await user.type(screen.getByTestId("phase-0-rr-0-alloc-input"), "50");

    // Step 3: Review -> Create
    await user.click(screen.getByTestId("wizard-next-button"));
    await user.click(screen.getByTestId("project-form-save-button"));

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Project With Roles",
          phases: expect.arrayContaining([
            expect.objectContaining({
              name: "Dev Phase",
              roleRequirements: [
                {
                  roleId: "role-2",
                  allocationPercentage: 50,
                  count: 2,
                },
              ],
            }),
          ]),
        }),
      );
    });
  });

  it("should default role requirement count to 1 and allocation to 100%", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await navigateToPhasesStep(user);
    await user.click(screen.getByTestId("project-add-phase-button"));
    await user.click(screen.getByTestId("phase-0-add-role-req-button"));

    const countInput = screen.getByTestId("phase-0-rr-0-count-input");
    const allocInput = screen.getByTestId("phase-0-rr-0-alloc-input");

    expect(countInput).toHaveValue(1);
    expect(allocInput).toHaveValue(100);
  });

  it("should show role requirements in the Review step", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    // Step 1
    await user.click(screen.getByTestId("project-create-button"));
    await user.type(screen.getByTestId("project-name-input"), "Review Test");
    await user.type(screen.getByTestId("project-start-date-input"), "2026-04-01");
    await user.click(screen.getByTestId("wizard-next-button"));

    // Step 2: Add phase with role requirement
    await user.click(screen.getByTestId("project-add-phase-button"));
    await user.type(screen.getByTestId("phase-0-name-input"), "Dev Phase");
    await user.clear(screen.getByTestId("phase-0-start-date-input"));
    await user.type(screen.getByTestId("phase-0-start-date-input"), "2026-04-01");
    await user.clear(screen.getByTestId("phase-0-end-date-input"));
    await user.type(screen.getByTestId("phase-0-end-date-input"), "2026-06-30");
    await user.click(screen.getByTestId("phase-0-add-role-req-button"));

    // Step 3: Review
    await user.click(screen.getByTestId("wizard-next-button"));

    expect(screen.getByTestId("wizard-step-review")).toBeInTheDocument();
    expect(screen.getByTestId("review-phase-0")).toBeInTheDocument();
    expect(screen.getByTestId("review-phase-0-rr-0")).toBeInTheDocument();
  });
});

describe("Phase Date Defaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should default first phase start date to project start date", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByTestId("project-create-button"));
    await user.type(screen.getByTestId("project-name-input"), "Date Test");
    await user.clear(screen.getByTestId("project-start-date-input"));
    await user.type(screen.getByTestId("project-start-date-input"), "2026-05-15");
    await user.click(screen.getByTestId("wizard-next-button"));
    await user.click(screen.getByTestId("project-add-phase-button"));

    expect(screen.getByTestId("phase-0-start-date-input")).toHaveValue("2026-05-15");
  });

  it("should default phase end date to project end date when set", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByTestId("project-create-button"));
    await user.type(screen.getByTestId("project-name-input"), "Date Test");
    await user.clear(screen.getByTestId("project-start-date-input"));
    await user.type(screen.getByTestId("project-start-date-input"), "2026-05-15");
    await user.clear(screen.getByTestId("project-end-date-input"));
    await user.type(screen.getByTestId("project-end-date-input"), "2026-12-31");
    await user.click(screen.getByTestId("wizard-next-button"));
    await user.click(screen.getByTestId("project-add-phase-button"));

    expect(screen.getByTestId("phase-0-end-date-input")).toHaveValue("2026-12-31");
  });

  it("should not default start date for subsequent phases", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByTestId("project-create-button"));
    await user.type(screen.getByTestId("project-name-input"), "Date Test");
    await user.clear(screen.getByTestId("project-start-date-input"));
    await user.type(screen.getByTestId("project-start-date-input"), "2026-05-15");
    await user.click(screen.getByTestId("wizard-next-button"));
    await user.click(screen.getByTestId("project-add-phase-button"));
    await user.click(screen.getByTestId("project-add-phase-button"));

    // First phase gets project start date
    expect(screen.getByTestId("phase-0-start-date-input")).toHaveValue("2026-05-15");
    // Second phase start date is empty
    expect(screen.getByTestId("phase-1-start-date-input")).toHaveValue("");
  });
});
