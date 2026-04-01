import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CapacityPage } from "@/pages/CapacityPage";

const { mockGetWeeklyAllocations, mockGetUtilizationProjection, mockListEmployees } = vi.hoisted(() => ({
  mockGetWeeklyAllocations: vi.fn(),
  mockGetUtilizationProjection: vi.fn(),
  mockListEmployees: vi.fn(),
}));

vi.mock("@/services/analytics-service", () => ({
  getWeeklyAllocations: (...args: unknown[]) => mockGetWeeklyAllocations(...args),
  getUtilizationProjection: (...args: unknown[]) => mockGetUtilizationProjection(...args),
}));

vi.mock("@/services/employee-service", () => ({
  listEmployees: (...args: unknown[]) => mockListEmployees(...args),
}));

import { useAuth } from "@/hooks/useAuth";

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

const mockAllocData = {
  employees: [
    {
      employeeId: "emp-1",
      employeeName: "Alice Johnson",
      maxDaysPerWeek: 5,
      weeks: {
        "2026-03-29": {
          allocations: [{ projectId: "proj-1", projectName: "Project Alpha", allocatedDays: 3 }],
          totalDays: 3,
          maxDays: 5,
        },
      },
    },
  ],
  projects: [{ projectId: "proj-1", projectName: "Project Alpha" }],
  weekStarts: ["2026-03-29"],
};

const mockProjData = {
  points: [
    { weekStart: "2026-03-29", capacityHours: 200, allocatedHours: 150, availableHours: 50, utilizationPercentage: 75 },
    { weekStart: "2026-04-05", capacityHours: 200, allocatedHours: 160, availableHours: 40, utilizationPercentage: 80 },
  ],
  currentWeekIndex: 0,
};

const mockEmployeesList = [
  { id: "emp-1", name: "Alice Johnson", email: "alice@example.com", roleId: "r1", roleName: "Dev", hourlyRate: null, effectiveHourlyRate: 150, jobPercentage: 100, targetUtilizationPercentage: 80, status: "active", department: "Eng", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "emp-2", name: "Bob Smith", email: "bob@example.com", roleId: "r2", roleName: "Design", hourlyRate: null, effectiveHourlyRate: 120, jobPercentage: 100, targetUtilizationPercentage: 75, status: "active", department: "Design", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/capacity"]}>
      <Routes>
        <Route path="/capacity" element={<CapacityPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CapacityPage", () => {
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
    mockGetWeeklyAllocations.mockResolvedValue(mockAllocData);
    mockGetUtilizationProjection.mockResolvedValue(mockProjData);
    mockListEmployees.mockResolvedValue(mockEmployeesList);
  });

  it("should render capacity planning title", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("capacity-title")).toHaveTextContent("Capacity Planning");
    });
  });

  it("should display weekly allocation overview subtitle", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Weekly allocation overview")).toBeInTheDocument();
    });
  });

  it("should load weekly allocations on mount (calendar view)", async () => {
    renderPage();

    await waitFor(() => {
      expect(mockGetWeeklyAllocations).toHaveBeenCalled();
    });
  });

  it("should show error message when API fails", async () => {
    mockGetWeeklyAllocations.mockRejectedValue(new Error("API error"));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Failed to load allocation data")).toBeInTheDocument();
    });
  });

  it("should show footer note for calendar/spreadsheet views", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Each cell shows weekly allocation/)).toBeInTheDocument();
    });
  });

  it("should show projection controls when switching to projection view", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("capacity-title")).toBeInTheDocument();
    });

    // Click projection view toggle
    const projectionButton = screen.getByRole("button", { name: /projection/i });
    await user.click(projectionButton);

    await waitFor(() => {
      expect(screen.getByTestId("projection-range-select")).toBeInTheDocument();
    });
    expect(screen.getByTestId("projection-employee-filter-button")).toBeInTheDocument();
  });

  it("should load projection data when switching to projection view", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("capacity-title")).toBeInTheDocument();
    });

    const projectionButton = screen.getByRole("button", { name: /projection/i });
    await user.click(projectionButton);

    await waitFor(() => {
      expect(mockGetUtilizationProjection).toHaveBeenCalled();
    });
  });

  it("should show employee filter dropdown when button is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("capacity-title")).toBeInTheDocument();
    });

    const projectionButton = screen.getByRole("button", { name: /projection/i });
    await user.click(projectionButton);

    await waitFor(() => {
      expect(screen.getByTestId("projection-employee-filter-button")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("projection-employee-filter-button"));

    await waitFor(() => {
      expect(screen.getByTestId("projection-employee-select-all")).toBeInTheDocument();
    });
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
  });

  it("should default to 'All Employees' in projection filter", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("capacity-title")).toBeInTheDocument();
    });

    const projectionButton = screen.getByRole("button", { name: /projection/i });
    await user.click(projectionButton);

    await waitFor(() => {
      expect(screen.getByTestId("projection-employee-filter-button")).toHaveTextContent("All Employees");
    });
  });
});
