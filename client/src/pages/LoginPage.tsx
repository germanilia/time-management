import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelaLogo } from "@/components/layout/SelaLogo";

/**
 * Login page with Sela branding.
 * Renders a centered card with gradient background.
 */
export function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch {
      setError("Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-background to-muted">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <SelaLogo className="mx-auto h-10" />
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          data-testid="login-form"
        >
          {error && (
            <div
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              data-testid="login-error"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              data-testid="login-email-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              data-testid="login-password-input"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={submitting}
            data-testid="login-submit-button"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
