import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as roleService from "@/services/role-service";
import type { Role, RoleCreate } from "@/types/employee";
import { useRole } from "@/hooks/useRole";

interface RoleFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RoleCreate) => Promise<void>;
  role?: Role | null;
}

function RoleFormDialog({ open, onClose, onSubmit, role }: RoleFormDialogProps) {
  const [name, setName] = useState(role?.name ?? "");
  const [defaultHourlyRate, setDefaultHourlyRate] = useState(
    role?.defaultHourlyRate?.toString() ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(role?.name ?? "");
    setDefaultHourlyRate(role?.defaultHourlyRate?.toString() ?? "");
    setError(null);
  }, [role]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        defaultHourlyRate: parseFloat(defaultHourlyRate),
      });
      onClose();
    } catch {
      setError("Failed to save role");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="role-form-title">
            {role ? "Edit Role" : "Add Role"}
          </DialogTitle>
          <DialogDescription>
            {role ? "Update role details below." : "Define a new role with its default hourly rate."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4" data-testid="role-form">
          {error && (
            <p className="text-sm text-destructive" data-testid="role-form-error">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="role-name">Name</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. j.devops, s.devops"
              data-testid="role-name-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-rate">Default Hourly Rate</Label>
            <Input
              id="role-rate"
              type="number"
              step="0.01"
              min="0.01"
              value={defaultHourlyRate}
              onChange={(e) => setDefaultHourlyRate(e.target.value)}
              required
              placeholder="e.g. 150.00"
              data-testid="role-rate-input"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="role-form-cancel-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              data-testid="role-form-save-button"
            >
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Page for managing employee roles (j.devops, s.devops, etc).
 * Admins can create, edit, and delete roles. Other users see read-only list.
 */
export function RolesPage() {
  const { isAdmin } = useRole();
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const loadRoles = useCallback(async () => {
    try {
      const data = await roleService.listRoles();
      setRoles(data);
      setError(null);
    } catch {
      setError("Failed to load roles");
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleCreate = async (data: RoleCreate) => {
    await roleService.createRole(data);
    await loadRoles();
  };

  const handleUpdate = async (data: RoleCreate) => {
    if (!editingRole) return;
    await roleService.updateRole(editingRole.id, data);
    await loadRoles();
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this role?")) return;
    try {
      await roleService.deleteRole(id);
      await loadRoles();
    } catch {
      setError("Failed to delete role. It may be assigned to employees.");
    }
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingRole(null);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
            <Shield className="size-5 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold" data-testid="roles-title">
            Roles
          </h1>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setFormOpen(true)}
            data-testid="role-create-button"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add Role
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" data-testid="roles-error">
          {error}
        </p>
      )}

      {roles.length === 0 ? (
        <div className="animate-fade-in flex flex-col items-center gap-3 rounded-xl border bg-card py-16 text-muted-foreground shadow-sm">
          <Shield className="size-12 opacity-30" aria-hidden="true" />
          <p className="text-lg font-medium">No roles defined</p>
          <p className="text-sm">Create one to get started.</p>
        </div>
      ) : (
        <div className="animate-slide-up rounded-xl border bg-card shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold">Role Definitions</h2>
            <p className="text-sm text-muted-foreground">
              {roles.length} role{roles.length !== 1 ? "s" : ""} configured
            </p>
          </div>
          <Table data-testid="roles-table">
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Default Hourly Rate</TableHead>
                <TableHead className="font-semibold">Created</TableHead>
                {isAdmin && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id} data-testid={`role-row-${role.id}`} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-medium">
                    <Badge variant="secondary">{role.name}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">${role.defaultHourlyRate}/hr</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {new Date(role.createdAt).toLocaleDateString()}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(role)}
                          data-testid={`role-edit-${role.id}`}
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(role.id)}
                          data-testid={`role-delete-${role.id}`}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <RoleFormDialog
        key={editingRole?.id ?? "new"}
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={editingRole ? handleUpdate : handleCreate}
        role={editingRole}
      />
    </div>
  );
}
