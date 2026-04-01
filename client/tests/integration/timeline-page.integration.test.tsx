import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TimelinePage } from "@/pages/TimelinePage";
import { useAuth } from "@/hooks/useAuth";

const { mockListProjects, mockUpdateProject } = vi.hoisted(() => ({
  mockListProjects: vi.fn(),
  mockUpdateProject: vi.fn(),
}));

const { mockGetFinancialSummary } = vi.hoisted(() => ({
  mockGetFinancialSummary: vi.fn(),
}));

vi.mock("@/services/project-service", () => ({
  listProjects: (...args: unknown[]) => mockListProjects(...args),
  updateProject: (...args: unknown[]) => mockUpdateProject(...args),
}));

vi.mock("@/services/analytics-service", () => ({
  getFinancialSummary: (...args: unknown[]) => mockGetFinancialSummary(...args),
}));

vi.mock("@/services/assignment-service", () => ({
  listAssignments: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/services/employee-service", () => ({
  listEmployees: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/services/role-service", () => ({
  listRoles: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/services/funding-source-service", () => ({
  listFundingSources: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/services/project-status-service", () => ({
  listProjectStatuses: vi.fn().mockResolvedValue([]),
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

const mockProjects = [
  {
    id: "proj-1",
    name: "Project Alpha",
    description: "Alpha desc",
    startDate: "2026-01-01",
    endDate: "2026-06-30",
    status: "active",
    billingType: "time_and_materials",
    fixedPriceAmount: null,
    fundingSourceId: null,
    phases: [
      {
        id: "phase-1",
        projectId: "proj-1",
        name: "Phase 1",
        startDate: "2026-01-01",
        endDate: "2026-03-31",
        budget: 50000,
        roleRequirements: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "phase-2",
        projectId: "proj-1",
        name: "Phase 2",
        startDate: "2026-04-01",
        endDate: "2026-06-30",
        budget: 40000,
        roleRequirements: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "proj-2",
    name: "Project Beta",
    description: "Beta desc",
    startDate: "2026-03-01",
    endDate: "2026-12-31",
    status: "active",
    billingType: "fixed_price",
    fixedPriceAmount: 100000,
    fundingSourceId: null,
    phases: [
      {
        id: "phase-3",
        projectId: "proj-2",
        name: "Implementation",
        startDate: "2026-03-01",
        endDate: "2026-12-31",
        budget: 100000,
        roleRequirements: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

const mockFinancialSummary = {
  totalIncome: 200000,
  totalCost: 150000,
  totalProfit: 50000,
  averageMargin: 25,
  projectCount: 2,
  projects: [
    {
      projectId: "proj-1",
      projectName: "Project Alpha",
      billingType: "time_and_materials",
      fundingSourceName: null,
      income: 90000,
      totalCost: 70000,
      profit: 20000,
      marginPercentage: 22,
      remaining: null,
      totalHours: 1000,
      totalBudget: 90000,
      phases: [],
    },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/timeline"]}>
      <Routes>
        <Route path="/timeline" element={<TimelinePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TimelinePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1", email: "test@test.com", name: "Test", role: "admin", isActive: true },
      isLoading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    mockListProjects.mockResolvedValue(mockProjects);
    mockGetFinancialSummary.mockResolvedValue(mockFinancialSummary);
    mockUpdateProject.mockResolvedValue(undefined);
  });

  it("should render timeline title", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("timeline-title")).toHaveTextContent("Timeline");
    });
  });

  it("should display project count", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("2 projects")).toBeInTheDocument();
    });
  });

  it("should display project timeline rows", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("timeline-project-proj-1")).toBeInTheDocument();
    });
    expect(screen.getByTestId("timeline-project-proj-2")).toBeInTheDocument();
  });

  it("should display project names in timeline rows", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("Project Alpha").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Project Beta").length).toBeGreaterThan(0);
  });

  it("should display phase bars within project rows", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("timeline-phase-phase-1")).toBeInTheDocument();
    });
    expect(screen.getByTestId("timeline-phase-phase-2")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-phase-phase-3")).toBeInTheDocument();
  });

  it("should display Edit button for admin users", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("timeline-project-edit-proj-1")).toBeInTheDocument();
    });
    expect(screen.getByTestId("timeline-project-edit-proj-2")).toBeInTheDocument();
  });

  it("should hide Edit button for viewer users", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1", email: "test@test.com", name: "Test", role: "viewer", isActive: true },
      isLoading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("timeline-project-proj-1")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("timeline-project-edit-proj-1")).not.toBeInTheDocument();
  });

  it("should display empty state when no projects exist", async () => {
    mockListProjects.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No projects to display.")).toBeInTheDocument();
    });
  });

  it("should show error message when API fails", async () => {
    mockListProjects.mockRejectedValue(new Error("API error"));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Failed to load timeline data")).toBeInTheDocument();
    });
  });

  it("should open phase detail panel when a phase is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("timeline-phase-phase-1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("timeline-phase-phase-1"));

    // The panel opens as a dialog with phase details
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("should display project dates in timeline rows", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("timeline-project-proj-1")).toBeInTheDocument();
    });
    // Check for dates within the timeline rows
    const projRow = screen.getByTestId("timeline-project-proj-1");
    expect(projRow).toHaveTextContent("2026-01-01");
    expect(projRow).toHaveTextContent("2026-06-30");
  });
});
