import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProjectsPage } from "@/pages/ProjectsPage";

vi.mock("@/services/project-service", () => ({
  listProjects: vi.fn().mockResolvedValue([]),
  createProject: vi.fn().mockResolvedValue({
    id: "new-project-id",
    name: "Test Project",
    description: "A test",
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

describe("Project Creation Wizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should open project form dialog when Add Project button is clicked", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    const addButton = screen.getByTestId("project-create-button");
    await user.click(addButton);

    expect(screen.getByTestId("project-form-title")).toBeInTheDocument();
    expect(screen.getByTestId("project-form-title")).toHaveTextContent("Add Project");
  });

  it("should show step 1 (Project Info) fields initially", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByTestId("project-create-button"));

    expect(screen.getByTestId("wizard-step-project-info")).toBeInTheDocument();
    expect(screen.getByTestId("project-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("project-description-input")).toBeInTheDocument();
    expect(screen.getByTestId("project-start-date-input")).toBeInTheDocument();
    expect(screen.getByTestId("project-end-date-input")).toBeInTheDocument();
    expect(screen.getByTestId("wizard-next-button")).toBeInTheDocument();
    expect(screen.getByTestId("project-form-cancel-button")).toBeInTheDocument();
  });

  it("should show step indicator with 3 steps", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByTestId("project-create-button"));

    expect(screen.getByTestId("wizard-step-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("wizard-step-0-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("wizard-step-1-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("wizard-step-2-indicator")).toBeInTheDocument();
  });

  it("should disable Next when name and start date are empty", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByTestId("project-create-button"));

    expect(screen.getByTestId("wizard-next-button")).toBeDisabled();
  });

  it("should enable Next when name and start date are filled", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByTestId("project-create-button"));

    await user.type(screen.getByTestId("project-name-input"), "Test Project");
    await user.type(screen.getByTestId("project-start-date-input"), "2026-04-01");

    expect(screen.getByTestId("wizard-next-button")).toBeEnabled();
  });

  it("should navigate to Phases step when Next is clicked", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByTestId("project-create-button"));
    await user.type(screen.getByTestId("project-name-input"), "Test Project");
    await user.type(screen.getByTestId("project-start-date-input"), "2026-04-01");
    await user.click(screen.getByTestId("wizard-next-button"));

    expect(screen.getByTestId("wizard-step-phases")).toBeInTheDocument();
    expect(screen.getByTestId("project-add-phase-button")).toBeInTheDocument();
  });

  it("should navigate back from Phases to Project Info", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByTestId("project-create-button"));
    await user.type(screen.getByTestId("project-name-input"), "Test Project");
    await user.type(screen.getByTestId("project-start-date-input"), "2026-04-01");
    await user.click(screen.getByTestId("wizard-next-button"));
    await user.click(screen.getByTestId("wizard-back-button"));

    expect(screen.getByTestId("wizard-step-project-info")).toBeInTheDocument();
  });

  it("should navigate to Review step and show Create Project button", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByTestId("project-create-button"));
    await user.type(screen.getByTestId("project-name-input"), "Test Project");
    await user.type(screen.getByTestId("project-start-date-input"), "2026-04-01");
    await user.click(screen.getByTestId("wizard-next-button"));
    await user.click(screen.getByTestId("wizard-next-button"));

    expect(screen.getByTestId("wizard-step-review")).toBeInTheDocument();
    expect(screen.getByTestId("review-project-name")).toHaveTextContent("Test Project");
    expect(screen.getByTestId("project-form-save-button")).toBeInTheDocument();
  });

  it("should create project when form is submitted from Review step", async () => {
    const { createProject } = await import("@/services/project-service");
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByTestId("project-create-button"));

    await user.type(screen.getByTestId("project-name-input"), "Test Project");
    await user.type(screen.getByTestId("project-description-input"), "A test");
    await user.clear(screen.getByTestId("project-start-date-input"));
    await user.type(screen.getByTestId("project-start-date-input"), "2026-04-01");
    await user.clear(screen.getByTestId("project-end-date-input"));
    await user.type(screen.getByTestId("project-end-date-input"), "2026-12-31");

    // Navigate: Next -> Next -> Create
    await user.click(screen.getByTestId("wizard-next-button"));
    await user.click(screen.getByTestId("wizard-next-button"));
    await user.click(screen.getByTestId("project-form-save-button"));

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Project",
          description: "A test",
          startDate: "2026-04-01",
          endDate: "2026-12-31",
        }),
      );
    });
  });

  it("should close dialog when cancel is clicked", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByTestId("project-create-button"));
    expect(screen.getByTestId("project-form-title")).toBeInTheDocument();

    await user.click(screen.getByTestId("project-form-cancel-button"));

    await waitFor(() => {
      expect(screen.queryByTestId("project-form-title")).not.toBeInTheDocument();
    });
  });

  it("should allow adding a phase in step 2", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByTestId("project-create-button"));
    await user.type(screen.getByTestId("project-name-input"), "Test");
    await user.type(screen.getByTestId("project-start-date-input"), "2026-04-01");
    await user.click(screen.getByTestId("wizard-next-button"));
    await user.click(screen.getByTestId("project-add-phase-button"));

    expect(screen.getByTestId("phase-0-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("phase-0-start-date-input")).toBeInTheDocument();
    expect(screen.getByTestId("phase-0-end-date-input")).toBeInTheDocument();
    expect(screen.getByTestId("phase-0-allocation-type-select")).toBeInTheDocument();
  });

  it("should submit project with phases through the wizard", async () => {
    const { createProject } = await import("@/services/project-service");
    const user = userEvent.setup();
    renderWithRouter();

    // Step 1: Project Info
    await user.click(screen.getByTestId("project-create-button"));
    await user.type(screen.getByTestId("project-name-input"), "Project With Phase");
    await user.clear(screen.getByTestId("project-start-date-input"));
    await user.type(screen.getByTestId("project-start-date-input"), "2026-04-01");
    await user.clear(screen.getByTestId("project-end-date-input"));
    await user.type(screen.getByTestId("project-end-date-input"), "2026-12-31");
    await user.click(screen.getByTestId("wizard-next-button"));

    // Step 2: Add phase
    await user.click(screen.getByTestId("project-add-phase-button"));
    await user.type(screen.getByTestId("phase-0-name-input"), "Ramp-up");
    // Start date should be pre-filled with project start date
    await user.clear(screen.getByTestId("phase-0-start-date-input"));
    await user.type(screen.getByTestId("phase-0-start-date-input"), "2026-04-01");
    await user.clear(screen.getByTestId("phase-0-end-date-input"));
    await user.type(screen.getByTestId("phase-0-end-date-input"), "2026-06-30");

    // Step 3: Review -> Create
    await user.click(screen.getByTestId("wizard-next-button"));
    await user.click(screen.getByTestId("project-form-save-button"));

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Project With Phase",
          phases: expect.arrayContaining([
            expect.objectContaining({
              name: "Ramp-up",
              startDate: "2026-04-01",
              endDate: "2026-06-30",
            }),
          ]),
        }),
      );
    });
  });
});
