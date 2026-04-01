import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

interface RolePermissions {
  isAdmin: boolean;
  isManager: boolean;
  isViewer: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageEmployees: boolean;
}

/**
 * Returns role-based permission flags derived from the current user's role.
 * Use to conditionally show/hide UI elements based on authorization.
 */
export function useRole(): RolePermissions {
  const { user } = useAuth();

  return useMemo(() => {
    const role = user?.role ?? "viewer";
    const isAdmin = role === "admin";
    const isManager = role === "manager";
    const isViewer = role === "viewer";

    return {
      isAdmin,
      isManager,
      isViewer,
      canEdit: isAdmin || isManager,
      canDelete: isAdmin,
      canManageEmployees: isAdmin,
    };
  }, [user?.role]);
}
