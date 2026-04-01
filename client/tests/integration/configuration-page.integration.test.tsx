import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ConfigurationPage } from "@/pages/ConfigurationPage";
import { useAuth } from "@/hooks/useAuth";

const {
  mockListRoles,
  mockCreateRole,
  mockUpdateRole,
  mockDeleteRole,
} = vi.hoisted(() => ({
  mockListRoles: vi.fn(),
  mockCreateRole: vi.fn(),
  mockUpdateRole: vi.fn(),
  mockDeleteRole: vi.fn(),
}));

const {
  mockListFundingSources,
  mockCreateFundingSource,
  mockUpdateFundingSource,
  mockDeleteFundingSource,
} = vi.hoisted(() => ({
  mockListFundingSources: vi.fn(),
  mockCreateFundingSource: vi.fn(),
  mockUpdateFundingSource: vi.fn(),
  mockDeleteFundingSource: vi.fn(),
}));

const {
  mockListProjectStatuses,
  mockCreateProjectStatus,
  mockUpdateProjectStatus,
  mockDeleteProjectStatus,
} = vi.hoisted(() => ({
  mockListProjectStatuses: vi.fn(),
  mockCreateProjectStatus: vi.fn(),
  mockUpdateProjectStatus: vi.fn(),
  mockDeleteProjectStatus: vi.fn(),
}));

vi.mock("@/services/role-service", () => ({
  listRoles: (...args: unknown[]) => mockListRoles(...args),
  createRole: (...args: unknown[]) => mockCreateRole(...args),
  updateRole: (...args: unknown[]) => mockUpdateRole(...args),
  deleteRole: (...args: unknown[]) => mockDeleteRole(...args),
}));

vi.mock("@/services/funding-source-service", () => ({
  listFundingSources: (...args: unknown[]) => mockListFundingSources(...args),
  createFundingSource: (...args: unknown[]) => mockCreateFundingSource(...args),
  updateFundingSource: (...args: unknown[]) => mockUpdateFundingSource(...args),
  deleteFundingSource: (...args: unknown[]) => mockDeleteFundingSource(...args),
}));

vi.mock("@/services/project-status-service", () => ({
  listProjectStatuses: (...args: unknown[]) => mockListProjectStatuses(...args),
  createProjectStatus: (...args: unknown[]) => mockCreateProjectStatus(...args),
  updateProjectStatus: (...args: unknown[]) => mockUpdateProjectStatus(...args),
  deleteProjectStatus: (...args: unknown[]) => mockDeleteProjectStatus(...args),
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

const mockRoles = [
  { id: "role-1", name: "Developer", defaultHourlyRate: 150, createdAt: "2026-01-15T00:00:00Z", updatedAt: "2026-01-15T00:00:00Z" },
  { id: "role-2", name: "Designer", defaultHourlyRate: 120, createdAt: "2026-02-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
];

const mockFundingSources = [
  { id: "fs-1", name: "AWS Budget", description: "Cloud infrastructure budget", createdAt: "2026-01-10T00:00:00Z", updatedAt: "2026-01-10T00:00:00Z" },
  { id: "fs-2", name: "Client Payment", description: null, createdAt: "2026-02-05T00:00:00Z", updatedAt: "2026-02-05T00:00:00Z" },
];

const mockProjectStatuses = [
  { id: "ps-1", name: "active", displayOrder: 1, color: "green", isDefault: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "ps-2", name: "on_hold", displayOrder: 2, color: "yellow", isDefault: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { id: "ps-3", name: "completed", displayOrder: 3, color: null, isDefault: false, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/configuration"]}>
      <Routes>
        <Route path="/configuration" element={<ConfigurationPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ConfigurationPage", () => {
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
    mockListRoles.mockResolvedValue(mockRoles);
    mockListFundingSources.mockResolvedValue(mockFundingSources);
    mockListProjectStatuses.mockResolvedValue(mockProjectStatuses);
    mockCreateRole.mockResolvedValue(undefined);
    mockUpdateRole.mockResolvedValue(undefined);
    mockDeleteRole.mockResolvedValue(undefined);
    mockCreateFundingSource.mockResolvedValue(undefined);
    mockUpdateFundingSource.mockResolvedValue(undefined);
    mockDeleteFundingSource.mockResolvedValue(undefined);
    mockCreateProjectStatus.mockResolvedValue(undefined);
    mockUpdateProjectStatus.mockResolvedValue(undefined);
    mockDeleteProjectStatus.mockResolvedValue(undefined);
    // Mock window.confirm for delete operations
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("should render configuration title", async () => {
    renderPage();

    expect(screen.getByTestId("configuration-title")).toHaveTextContent("Configuration");
  });

  it("should display three tabs", () => {
    renderPage();

    expect(screen.getByTestId("configuration-tabs")).toBeInTheDocument();
    expect(screen.getByTestId("configuration-tab-roles")).toBeInTheDocument();
    expect(screen.getByTestId("configuration-tab-funding-sources")).toBeInTheDocument();
    expect(screen.getByTestId("configuration-tab-project-statuses")).toBeInTheDocument();
  });

  // ── Roles Tab ──

  it("should show roles tab by default with roles table", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("roles-table")).toBeInTheDocument();
    });
    expect(screen.getByText("Developer")).toBeInTheDocument();
    expect(screen.getByText("Designer")).toBeInTheDocument();
    expect(screen.getByText("$150/hr")).toBeInTheDocument();
    expect(screen.getByText("$120/hr")).toBeInTheDocument();
  });

  it("should show roles count", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("2 roles configured")).toBeInTheDocument();
    });
  });

  it("should show Add Role button for admin", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("role-create-button")).toBeInTheDocument();
    });
  });

  it("should hide Add Role button for viewer", async () => {
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
      expect(screen.getByText("Developer")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("role-create-button")).not.toBeInTheDocument();
  });

  it("should open role creation form when Add Role is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("role-create-button")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("role-create-button"));

    expect(screen.getByTestId("role-form-title")).toHaveTextContent("Add Role");
    expect(screen.getByTestId("role-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("role-rate-input")).toBeInTheDocument();
  });

  it("should create a role when form is submitted", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("role-create-button")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("role-create-button"));
    await user.type(screen.getByTestId("role-name-input"), "QA Engineer");
    await user.type(screen.getByTestId("role-rate-input"), "100");
    await user.click(screen.getByTestId("role-form-save-button"));

    await waitFor(() => {
      expect(mockCreateRole).toHaveBeenCalledWith({
        name: "QA Engineer",
        defaultHourlyRate: 100,
      });
    });
  });

  it("should show edit and delete buttons for roles", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("role-edit-role-1")).toBeInTheDocument();
    });
    expect(screen.getByTestId("role-delete-role-1")).toBeInTheDocument();
    expect(screen.getByTestId("role-edit-role-2")).toBeInTheDocument();
    expect(screen.getByTestId("role-delete-role-2")).toBeInTheDocument();
  });

  it("should open edit form when Edit role is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("role-edit-role-1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("role-edit-role-1"));

    expect(screen.getByTestId("role-form-title")).toHaveTextContent("Edit Role");
  });

  it("should delete a role when Delete is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("role-delete-role-1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("role-delete-role-1"));

    await waitFor(() => {
      expect(mockDeleteRole).toHaveBeenCalledWith("role-1");
    });
  });

  // ── Funding Sources Tab ──

  it("should switch to funding sources tab and display sources", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId("configuration-tab-funding-sources"));

    await waitFor(() => {
      expect(screen.getByTestId("funding-sources-table")).toBeInTheDocument();
    });
    expect(screen.getByText("AWS Budget")).toBeInTheDocument();
    expect(screen.getByText("Client Payment")).toBeInTheDocument();
    expect(screen.getByText("Cloud infrastructure budget")).toBeInTheDocument();
  });

  it("should show funding sources count", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId("configuration-tab-funding-sources"));

    await waitFor(() => {
      expect(screen.getByText("2 sources configured")).toBeInTheDocument();
    });
  });

  it("should show Add Funding Source button for admin", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId("configuration-tab-funding-sources"));

    await waitFor(() => {
      expect(screen.getByTestId("funding-source-create-button")).toBeInTheDocument();
    });
  });

  it("should open funding source creation form", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId("configuration-tab-funding-sources"));
    await waitFor(() => {
      expect(screen.getByTestId("funding-source-create-button")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("funding-source-create-button"));

    expect(screen.getByTestId("funding-source-form-title")).toHaveTextContent("Add Funding Source");
    expect(screen.getByTestId("funding-source-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("funding-source-description-input")).toBeInTheDocument();
  });

  it("should create a funding source when form is submitted", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId("configuration-tab-funding-sources"));
    await waitFor(() => {
      expect(screen.getByTestId("funding-source-create-button")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("funding-source-create-button"));
    await user.type(screen.getByTestId("funding-source-name-input"), "Internal R&D");
    await user.type(screen.getByTestId("funding-source-description-input"), "Research budget");
    await user.click(screen.getByTestId("funding-source-form-save-button"));

    await waitFor(() => {
      expect(mockCreateFundingSource).toHaveBeenCalledWith({
        name: "Internal R&D",
        description: "Research budget",
      });
    });
  });

  it("should delete a funding source when Delete is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId("configuration-tab-funding-sources"));
    await waitFor(() => {
      expect(screen.getByTestId("funding-source-delete-fs-1")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("funding-source-delete-fs-1"));

    await waitFor(() => {
      expect(mockDeleteFundingSource).toHaveBeenCalledWith("fs-1");
    });
  });

  // ── Project Statuses Tab ──

  it("should switch to project statuses tab and display statuses", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId("configuration-tab-project-statuses"));

    await waitFor(() => {
      expect(screen.getByTestId("project-statuses-table")).toBeInTheDocument();
    });
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("on_hold")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  it("should show project statuses count", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId("configuration-tab-project-statuses"));

    await waitFor(() => {
      expect(screen.getByText("3 statuses configured")).toBeInTheDocument();
    });
  });

  it("should display default badge for default status", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId("configuration-tab-project-statuses"));

    await waitFor(() => {
      // "Default" appears both as table header and as badge - check for multiple
      expect(screen.getAllByText("Default").length).toBeGreaterThanOrEqual(2);
    });
  });

  it("should show Add Status button for admin", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId("configuration-tab-project-statuses"));

    await waitFor(() => {
      expect(screen.getByTestId("project-status-create-button")).toBeInTheDocument();
    });
  });

  it("should open project status creation form", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId("configuration-tab-project-statuses"));
    await waitFor(() => {
      expect(screen.getByTestId("project-status-create-button")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("project-status-create-button"));

    expect(screen.getByTestId("project-status-form-title")).toHaveTextContent("Add Project Status");
    expect(screen.getByTestId("project-status-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("project-status-order-input")).toBeInTheDocument();
    expect(screen.getByTestId("project-status-color-input")).toBeInTheDocument();
    expect(screen.getByTestId("project-status-default-checkbox")).toBeInTheDocument();
  });

  it("should create a project status when form is submitted", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId("configuration-tab-project-statuses"));
    await waitFor(() => {
      expect(screen.getByTestId("project-status-create-button")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("project-status-create-button"));
    await user.type(screen.getByTestId("project-status-name-input"), "archived");
    await user.clear(screen.getByTestId("project-status-order-input"));
    await user.type(screen.getByTestId("project-status-order-input"), "4");
    await user.type(screen.getByTestId("project-status-color-input"), "gray");
    await user.click(screen.getByTestId("project-status-form-save-button"));

    await waitFor(() => {
      expect(mockCreateProjectStatus).toHaveBeenCalledWith({
        name: "archived",
        displayOrder: 4,
        color: "gray",
        isDefault: false,
      });
    });
  });

  it("should delete a project status when Delete is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId("configuration-tab-project-statuses"));
    await waitFor(() => {
      expect(screen.getByTestId("project-status-delete-ps-2")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("project-status-delete-ps-2"));

    await waitFor(() => {
      expect(mockDeleteProjectStatus).toHaveBeenCalledWith("ps-2");
    });
  });

  it("should display display order and color for statuses", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId("configuration-tab-project-statuses"));

    await waitFor(() => {
      expect(screen.getByText("green")).toBeInTheDocument();
    });
    expect(screen.getByText("yellow")).toBeInTheDocument();
  });
});
