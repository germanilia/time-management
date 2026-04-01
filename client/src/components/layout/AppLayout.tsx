import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ClipboardList,
  BarChart3,
  GanttChart,
  Settings,
  LogOut,
  LayoutGrid,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelaLogo } from "@/components/layout/SelaLogo";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/employees", label: "Employees", icon: Users },
  { path: "/projects", label: "Projects", icon: FolderKanban },
  { path: "/assignments", label: "Assignments", icon: ClipboardList },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/capacity", label: "Capacity", icon: LayoutGrid },
  { path: "/timeline", label: "Timeline", icon: GanttChart },
  { path: "/configuration", label: "Configuration", icon: Settings },
];

/**
 * Main application layout with branded navigation header and content outlet.
 */
export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-background shadow-sm">
        <div className="flex h-14 items-center px-6">
          <Link to="/" className="mr-8" data-testid="app-logo">
            <SelaLogo className="h-6" />
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase()}-link`}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground" data-testid="user-name">
              {user?.name}
            </span>
            <Badge variant="outline" data-testid="user-role-badge">
              {user?.role}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              data-testid="logout-button"
              aria-label="Log out"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
