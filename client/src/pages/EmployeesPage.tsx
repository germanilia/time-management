import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { EmployeeList } from "@/components/employees/EmployeeList";
import * as employeeService from "@/services/employee-service";
import * as roleService from "@/services/role-service";
import { useRole } from "@/hooks/useRole";
import type { Employee, EmployeeCreate, Role } from "@/types/employee";

export function EmployeesPage() {
  const { canManageEmployees } = useRole();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    try {
      const data = await employeeService.listEmployees(
        undefined,
        search || undefined,
      );
      setEmployees(data);
    } catch {
      setError("Failed to load employees");
    }
  }, [search]);

  const loadRoles = useCallback(async () => {
    try {
      const data = await roleService.listRoles();
      setRoles(data);
    } catch {
      // Roles may fail — form will have empty dropdown
    }
  }, []);

  useEffect(() => {
    loadEmployees();
    loadRoles();
  }, [loadEmployees, loadRoles]);

  const handleCreate = async (data: EmployeeCreate) => {
    await employeeService.createEmployee(data);
    await loadEmployees();
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormOpen(true);
  };

  const handleUpdate = async (data: EmployeeCreate) => {
    if (!editingEmployee) return;
    await employeeService.updateEmployee(editingEmployee.id, data);
    await loadEmployees();
  };

  const handleDelete = async (id: string) => {
    await employeeService.deleteEmployee(id);
    await loadEmployees();
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingEmployee(null);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
            <Users className="size-5 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold" data-testid="employees-title">
            Employees
          </h1>
        </div>
        {canManageEmployees && (
          <Button
            onClick={() => setFormOpen(true)}
            data-testid="employee-create-button"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add Employee
          </Button>
        )}
      </div>

      <div className="max-w-sm">
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <InputGroupText>
              <Search className="size-4" aria-hidden="true" />
            </InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="employee-search-input"
          />
        </InputGroup>
      </div>

      {error && (
        <p className="text-sm text-destructive" data-testid="employees-error">
          {error}
        </p>
      )}

      <EmployeeList
        employees={employees}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <EmployeeForm
        key={editingEmployee?.id ?? "new"}
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={editingEmployee ? handleUpdate : handleCreate}
        employee={editingEmployee}
        roles={roles}
      />
    </div>
  );
}
