import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";

const mockLogin = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  it("should render login form with email and password fields", () => {
    renderPage();

    expect(screen.getByTestId("login-form")).toBeInTheDocument();
    expect(screen.getByTestId("login-email-input")).toBeInTheDocument();
    expect(screen.getByTestId("login-password-input")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit-button")).toBeInTheDocument();
  });

  it("should render sign in text", () => {
    renderPage();

    expect(screen.getByText("Sign in to your account")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit-button")).toHaveTextContent("Sign in");
  });

  it("should call login with email and password on form submission", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(undefined);
    renderPage();

    await user.type(screen.getByTestId("login-email-input"), "user@example.com");
    await user.type(screen.getByTestId("login-password-input"), "password123");
    await user.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("user@example.com", "password123");
    });
  });

  it("should display error message on login failure", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error("Invalid credentials"));
    renderPage();

    await user.type(screen.getByTestId("login-email-input"), "bad@example.com");
    await user.type(screen.getByTestId("login-password-input"), "wrong");
    await user.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("login-error")).toBeInTheDocument();
      expect(screen.getByTestId("login-error")).toHaveTextContent("Invalid email or password");
    });
  });

  it("should show 'Signing in...' while submitting", async () => {
    const user = userEvent.setup();
    let resolveLogin: () => void;
    mockLogin.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLogin = resolve;
      }),
    );
    renderPage();

    await user.type(screen.getByTestId("login-email-input"), "user@example.com");
    await user.type(screen.getByTestId("login-password-input"), "pass");
    await user.click(screen.getByTestId("login-submit-button"));

    expect(screen.getByTestId("login-submit-button")).toHaveTextContent("Signing in...");
    expect(screen.getByTestId("login-submit-button")).toBeDisabled();

    resolveLogin!();
    await waitFor(() => {
      expect(screen.getByTestId("login-submit-button")).toHaveTextContent("Sign in");
    });
  });

  it("should redirect to dashboard if user is already logged in", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "test@test.com", name: "Test", role: "admin", isActive: true },
      isLoading: false,
      error: null,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
    });
    renderPage();

    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
  });

  it("should show loading state while auth is loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      error: null,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
    });
    renderPage();

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
