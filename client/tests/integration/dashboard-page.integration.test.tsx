import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { DashboardPage } from "@/pages/DashboardPage";

const { mockGetUtilization, mockGetCapacityForecast } = vi.hoisted(() => ({
  mockGetUtilization: vi.fn(),
  mockGetCapacityForecast: vi.fn(),
}));

vi.mock("@/services/analytics-service", () => ({
  getUtilization: (...args: unknown[]) => mockGetUtilization(...args),
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

// Mock recharts to avoid rendering issues in tests
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="capacity-chart">{children}</div>,
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
  averageUtilization: 75,
  overAllocatedCount: 3,
  underUtilizedCount: 5,
  idleCount: 2,
  totalEmployees: 20,
  dailyBreakdown: [],
};

const mockCapacity = {
  periods: [
    { period: "2026-04", totalCapacityHours: 3200, allocatedHours: 2400, availableHours: 800, requiredHeadcount: 0, availableHeadcount: 0, gap: 0 },
    { period: "2026-05", totalCapacityHours: 3200, allocatedHours: 2600, availableHours: 600, requiredHeadcount: 0, availableHeadcount: 0, gap: 0 },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
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
    mockGetCapacityForecast.mockResolvedValue(mockCapacity);
  });

  it("should render dashboard title", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-title")).toHaveTextContent("Dashboard");
    });
  });

  it("should display utilization summary metrics", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("75%")).toBeInTheDocument();
    });
    expect(screen.getByText("Avg Utilization")).toBeInTheDocument();
    expect(screen.getByText("Idle Employees")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // idle count
    expect(screen.getByText("Over-Allocated")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // over-allocated count
    expect(screen.getByText("Under Target")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument(); // under-utilized count
  });

  it("should render capacity overview chart when data is available", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Capacity Overview")).toBeInTheDocument();
    });
    expect(screen.getByTestId("capacity-chart")).toBeInTheDocument();
  });

  it("should show error message when API fails", async () => {
    mockGetUtilization.mockRejectedValue(new Error("API error"));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Failed to load dashboard data")).toBeInTheDocument();
    });
  });

  it("should display date range in subtitle", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-title")).toBeInTheDocument();
    });
    // Date range is displayed below the title
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const startStr = start.toISOString().slice(0, 10);
    expect(screen.getByText(new RegExp(startStr))).toBeInTheDocument();
  });

  it("should link metric cards to analytics page", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-metric-avg-utilization")).toBeInTheDocument();
    });
    const avgLink = screen.getByTestId("dashboard-metric-avg-utilization");
    expect(avgLink.closest("a")).toHaveAttribute("href", "/analytics");
  });
});
