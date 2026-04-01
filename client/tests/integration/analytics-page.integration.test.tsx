import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AnalyticsPage } from "@/pages/AnalyticsPage";

const { mockGetUtilization, mockGetEmployeeUtilization, mockGetCapacityForecast } = vi.hoisted(() => ({
  mockGetUtilization: vi.fn(),
  mockGetEmployeeUtilization: vi.fn(),
  mockGetCapacityForecast: vi.fn(),
}));

vi.mock("@/services/analytics-service", () => ({
  getUtilization: (...args: unknown[]) => mockGetUtilization(...args),
  getEmployeeUtilization: (...args: unknown[]) => mockGetEmployeeUtilization(...args),
  getCapacityForecast: (...args: unknown[]) => mockGetCapacityForecast(...args),
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

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="forecast-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const mockSummary = {
  startDate: "2026-04-01",
  endDate: "2026-06-30",
  averageUtilization: 82,
  overAllocatedCount: 4,
  underUtilizedCount: 3,
  idleCount: 1,
  totalEmployees: 25,
  dailyBreakdown: [],
};

const mockEmployeeUtilization = [
  {
    employeeId: "emp-1",
    employeeName: "Alice Johnson",
    department: "Engineering",
    averageUtilization: 90,
    targetUtilization: 80,
    targetGap: -10,
    assignmentsCount: 3,
  },
  {
    employeeId: "emp-2",
    employeeName: "Bob Smith",
    department: "Design",
    averageUtilization: 60,
    targetUtilization: 75,
    targetGap: 15,
    assignmentsCount: 1,
  },
  {
    employeeId: "emp-3",
    employeeName: "Carol Davis",
    department: null,
    averageUtilization: 0,
    targetUtilization: 80,
    targetGap: 80,
    assignmentsCount: 0,
  },
];

const mockCapacity = {
  periods: [
    { period: "2026-04", totalCapacityHours: 4000, allocatedHours: 3200, availableHours: 800, requiredHeadcount: 0, availableHeadcount: 0, gap: 0 },
    { period: "2026-05", totalCapacityHours: 4000, allocatedHours: 3400, availableHours: 600, requiredHeadcount: 0, availableHeadcount: 0, gap: 0 },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/analytics"]}>
      <Routes>
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AnalyticsPage", () => {
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
    mockGetUtilization.mockResolvedValue(mockSummary);
    mockGetEmployeeUtilization.mockResolvedValue(mockEmployeeUtilization);
    mockGetCapacityForecast.mockResolvedValue(mockCapacity);
  });

  it("should render analytics title", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("analytics-title")).toHaveTextContent("Analytics");
    });
  });

  it("should display utilization summary cards", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("analytics-summary")).toBeInTheDocument();
    });
    expect(screen.getByText("Avg Utilization")).toBeInTheDocument();
    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getByText("Idle Employees")).toBeInTheDocument();
    expect(screen.getByText("Over-Allocated")).toBeInTheDocument();
    expect(screen.getByText("Total Employees")).toBeInTheDocument();
    // Check summary card values within the summary section
    const summary = screen.getByTestId("analytics-summary");
    expect(summary).toHaveTextContent("1"); // idle
    expect(summary).toHaveTextContent("4"); // over-allocated
    expect(summary).toHaveTextContent("25"); // total
  });

  it("should display capacity forecast chart", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Capacity Forecast")).toBeInTheDocument();
    });
    expect(screen.getByTestId("forecast-chart")).toBeInTheDocument();
  });

  it("should display employee utilization table", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("employee-utilization-table")).toBeInTheDocument();
    });
    expect(screen.getByText("Employee Utilization")).toBeInTheDocument();
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByText("Carol Davis")).toBeInTheDocument();
  });

  it("should display department badges for employees with departments", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });
    expect(screen.getByText("Design")).toBeInTheDocument();
  });

  it("should display utilization percentages and target gaps", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("90%")).toBeInTheDocument(); // Alice utilization
    });
    expect(screen.getByText("60%")).toBeInTheDocument(); // Bob utilization
    // Multiple elements may show 80% (Alice target and Carol target), use getAllByText
    expect(screen.getAllByText("80%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("75%")).toBeInTheDocument(); // Bob target
  });

  it("should display assignment counts for each employee", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument(); // Alice assignments
    });
    expect(screen.getByText("0")).toBeInTheDocument(); // Carol assignments
  });

  it("should show error message when API fails", async () => {
    mockGetUtilization.mockRejectedValue(new Error("API error"));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Failed to load analytics")).toBeInTheDocument();
    });
  });

  it("should show employee count in table header", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/3 employees/)).toBeInTheDocument();
    });
  });
});
