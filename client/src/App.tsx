import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { EmployeesPage } from "@/pages/EmployeesPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { AssignmentsPage } from "@/pages/AssignmentsPage";
import { TimelinePage } from "@/pages/TimelinePage";
import { ConfigurationPage } from "@/pages/ConfigurationPage";
import { CapacityPage } from "@/pages/CapacityPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/capacity" element={<CapacityPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/configuration" element={<ConfigurationPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
