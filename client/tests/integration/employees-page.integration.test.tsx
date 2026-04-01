import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { EmployeesPage } from "@/pages/EmployeesPage";
import { useAuth } from "@/hooks/useAuth";

const {
  mockListEmployees,
  mockCreateEmployee,
  mockUpdateEmployee,
  mockDeleteEmployee,
} = vi.hoisted(() => ({
  mockListEmployees: vi.fn(),
  mockCreateEmployee: vi.fn(),
  mockUpdateEmployee: vi.fn(),
  mockDeleteEmployee: vi.fn(),
}));

vi.mock("@/services/employee-service", () => ({
  listEmployees: (...args: unknown[]) => mockListEmployees(...args),
  createEmployee: (...args: unknown[]) => mockCreateEmployee(...args),
  updateEmployee: (...args: unknown[]) => mockUpdateEmployee(...args),
  deleteEmployee: (...args: unknown[]) => mockDeleteEmployee(...args),
}));

vi.mock("@/services/role-service", () => ({
  listRoles: vi.fn().mockResolvedValue([
    { id: "role-1", name: "Developer", defaultHourlyRate: 150, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
    { id: "role-2", name: "Designer", defaultHourlyRate: 120, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
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

const mockEmployees = [
  {
    id: "emp-1",
    name: "Alice Johnson",
    email: "alice@example.com",
    roleId: "role-1",
    roleName: "Developer",
    hourlyRate: null,
    effectiveHourlyRate: 150,
    jobPercentage: 100,
    targetUtilizationPercentage: 80,
    status: "active",
    department: "Engineering",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "emp-2",
    name: "Bob Smith",
    email: "bob@example.com",
    roleId: "role-2",
    roleName: "Designer",
    hourlyRate: 130,
    effectiveHourlyRate: 130,
    jobPercentage: 80,
    targetUtilizationPercentage: 75,
    status: "active",
    department: "Design",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/employees"]}>
      <Routes>
        <Route path="/employees" element={<EmployeesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("EmployeesPage", () => {
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
    mockListEmployees.mockResolvedValue(mockEmployees);
    mockCreateEmployee.mockResolvedValue(undefined);
    mockUpdateEmployee.mockResolvedValue(undefined);
    mockDeleteEmployee.mockResolvedValue(undefined);
  });

  it("should render page title and employee list", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("employees-title")).toHaveTextContent("Employees");
    });
    expect(screen.getByTestId("employee-list-table")).toBeInTheDocument();
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
  });

  it("should display employee details in table", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    });
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Developer")).toBeInTheDocument();
    expect(screen.getByText("$150.00/hr")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.getByText("Designer")).toBeInTheDocument();
  });

  it("should show Add Employee button for admin users", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("employee-create-button")).toBeInTheDocument();
    });
  });

  it("should hide Add Employee button for viewer users", async () => {
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
      expect(screen.getByTestId("employees-title")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("employee-create-button")).not.toBeInTheDocument();
  });

  it("should hide edit and delete buttons for viewer users", async () => {
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
      expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("employee-edit-button-emp-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("employee-delete-button-emp-1")).not.toBeInTheDocument();
  });

  it("should show edit and delete buttons for admin users", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("employee-edit-button-emp-1")).toBeInTheDocument();
    });
    expect(screen.getByTestId("employee-delete-button-emp-1")).toBeInTheDocument();
    expect(screen.getByTestId("employee-edit-button-emp-2")).toBeInTheDocument();
    expect(screen.getByTestId("employee-delete-button-emp-2")).toBeInTheDocument();
  });

  it("should display search input", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("employee-search-input")).toBeInTheDocument();
    });
  });

  it("should call listEmployees with search term when searching", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("employee-search-input")).toBeInTheDocument();
    });

    await user.type(screen.getByTestId("employee-search-input"), "Alice");

    await waitFor(() => {
      expect(mockListEmployees).toHaveBeenCalledWith(undefined, "Alice");
    });
  });

  it("should display empty state when no employees are found", async () => {
    mockListEmployees.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("employee-list-empty")).toBeInTheDocument();
    });
    expect(screen.getByText("No employees found")).toBeInTheDocument();
  });

  it("should display error message when API fails", async () => {
    mockListEmployees.mockRejectedValue(new Error("API error"));
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("employees-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("employees-error")).toHaveTextContent("Failed to load employees");
  });

  it("should open create form when Add Employee is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("employee-create-button")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("employee-create-button"));

    expect(screen.getByTestId("employee-form-title")).toHaveTextContent("Add Employee");
    expect(screen.getByTestId("employee-form")).toBeInTheDocument();
  });

  it("should open edit form when Edit button is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("employee-edit-button-emp-1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("employee-edit-button-emp-1"));

    expect(screen.getByTestId("employee-form-title")).toHaveTextContent("Edit Employee");
  });

  it("should delete employee when Delete button is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("employee-delete-button-emp-1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("employee-delete-button-emp-1"));

    await waitFor(() => {
      expect(mockDeleteEmployee).toHaveBeenCalledWith("emp-1");
    });
    // Should reload employees after delete
    expect(mockListEmployees).toHaveBeenCalledTimes(2);
  });
});
