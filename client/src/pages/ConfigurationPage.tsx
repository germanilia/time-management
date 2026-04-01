import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Plus, Pencil, Trash2, Settings, DollarSign, ListChecks } from "lucide-react";
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
import { cn } from "@/lib/utils";
import * as roleService from "@/services/role-service";
import * as fundingSourceService from "@/services/funding-source-service";
import * as projectStatusService from "@/services/project-status-service";
import type { Role, RoleCreate } from "@/types/employee";
import type { FundingSource, FundingSourceCreate } from "@/types/funding-source";
import type { ProjectStatusConfig, ProjectStatusConfigCreate } from "@/types/project-status";
import { useRole } from "@/hooks/useRole";

type ConfigTab = "roles" | "funding-sources" | "project-statuses";

const TABS: { key: ConfigTab; label: string }[] = [
  { key: "roles", label: "Roles" },
  { key: "funding-sources", label: "Funding Sources" },
  { key: "project-statuses", label: "Project Statuses" },
];

// ── Role Form Dialog ──

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
            <p className="text-sm text-destructive" data-testid="role-form-error">{error}</p>
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
            <Button type="button" variant="outline" onClick={onClose} data-testid="role-form-cancel-button">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} data-testid="role-form-save-button">
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Funding Source Form Dialog ──

interface FundingSourceFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FundingSourceCreate) => Promise<void>;
  source?: FundingSource | null;
}

function FundingSourceFormDialog({ open, onClose, onSubmit, source }: FundingSourceFormDialogProps) {
  const [name, setName] = useState(source?.name ?? "");
  const [description, setDescription] = useState(source?.description ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(source?.name ?? "");
    setDescription(source?.description ?? "");
    setError(null);
  }, [source]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onClose();
    } catch {
      setError("Failed to save funding source");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="funding-source-form-title">
            {source ? "Edit Funding Source" : "Add Funding Source"}
          </DialogTitle>
          <DialogDescription>
            {source ? "Update funding source details." : "Define a new funding source."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4" data-testid="funding-source-form">
          {error && (
            <p className="text-sm text-destructive" data-testid="funding-source-form-error">{error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="fs-name">Name</Label>
            <Input
              id="fs-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. AWS, Client, Internal"
              data-testid="funding-source-name-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fs-desc">Description (optional)</Label>
            <Input
              id="fs-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              data-testid="funding-source-description-input"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} data-testid="funding-source-form-cancel-button">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} data-testid="funding-source-form-save-button">
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Roles Tab ──

function RolesTab() {
  const { isAdmin } = useRole();
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const loadRoles = useCallback(async () => {
    try {
      setRoles(await roleService.listRoles());
      setError(null);
    } catch {
      setError("Failed to load roles");
    }
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const handleCreate = async (data: RoleCreate) => {
    await roleService.createRole(data);
    await loadRoles();
  };

  const handleUpdate = async (data: RoleCreate) => {
    if (!editingRole) return;
    await roleService.updateRole(editingRole.id, data);
    await loadRoles();
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

  const handleCloseForm = () => { setFormOpen(false); setEditingRole(null); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Roles</h2>
          <p className="text-sm text-muted-foreground">
            {roles.length} role{roles.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setFormOpen(true)} data-testid="role-create-button">
            <Plus className="size-4" aria-hidden="true" />
            Add Role
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {roles.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No roles defined.</p>
      ) : (
        <Table data-testid="roles-table">
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Default Hourly Rate</TableHead>
              <TableHead className="font-semibold">Created</TableHead>
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id} data-testid={`role-row-${role.id}`} className="hover:bg-muted/40">
                <TableCell><Badge variant="secondary">{role.name}</Badge></TableCell>
                <TableCell className="tabular-nums font-medium">${role.defaultHourlyRate}/hr</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {new Date(role.createdAt).toLocaleDateString()}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditingRole(role); setFormOpen(true); }} data-testid={`role-edit-${role.id}`}>
                        <Pencil className="size-3.5" aria-hidden="true" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(role.id)} data-testid={`role-delete-${role.id}`}>
                        <Trash2 className="size-3.5" aria-hidden="true" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
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

// ── Funding Sources Tab ──

function FundingSourcesTab() {
  const { isAdmin } = useRole();
  const [sources, setSources] = useState<FundingSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<FundingSource | null>(null);

  const loadSources = useCallback(async () => {
    try {
      setSources(await fundingSourceService.listFundingSources());
      setError(null);
    } catch {
      setError("Failed to load funding sources");
    }
  }, []);

  useEffect(() => { loadSources(); }, [loadSources]);

  const handleCreate = async (data: FundingSourceCreate) => {
    await fundingSourceService.createFundingSource(data);
    await loadSources();
  };

  const handleUpdate = async (data: FundingSourceCreate) => {
    if (!editingSource) return;
    await fundingSourceService.updateFundingSource(editingSource.id, data);
    await loadSources();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this funding source?")) return;
    try {
      await fundingSourceService.deleteFundingSource(id);
      await loadSources();
    } catch {
      setError("Failed to delete funding source. It may be referenced by projects.");
    }
  };

  const handleCloseForm = () => { setFormOpen(false); setEditingSource(null); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Funding Sources</h2>
          <p className="text-sm text-muted-foreground">
            {sources.length} source{sources.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setFormOpen(true)} data-testid="funding-source-create-button">
            <Plus className="size-4" aria-hidden="true" />
            Add Funding Source
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {sources.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
          <DollarSign className="size-10 opacity-30" aria-hidden="true" />
          <p>No funding sources defined.</p>
        </div>
      ) : (
        <Table data-testid="funding-sources-table">
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="font-semibold">Created</TableHead>
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((source) => (
              <TableRow key={source.id} data-testid={`funding-source-row-${source.id}`} className="hover:bg-muted/40">
                <TableCell><Badge variant="secondary">{source.name}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{source.description ?? "-"}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {new Date(source.createdAt).toLocaleDateString()}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditingSource(source); setFormOpen(true); }} data-testid={`funding-source-edit-${source.id}`}>
                        <Pencil className="size-3.5" aria-hidden="true" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(source.id)} data-testid={`funding-source-delete-${source.id}`}>
                        <Trash2 className="size-3.5" aria-hidden="true" /> Delete
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <FundingSourceFormDialog
        key={editingSource?.id ?? "new"}
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={editingSource ? handleUpdate : handleCreate}
        source={editingSource}
      />
    </div>
  );
}

// ── Project Status Form Dialog ──

interface ProjectStatusFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectStatusConfigCreate) => Promise<void>;
  status?: ProjectStatusConfig | null;
}

function ProjectStatusFormDialog({
  open,
  onClose,
  onSubmit,
  status,
}: ProjectStatusFormDialogProps) {
  const [name, setName] = useState(status?.name ?? "");
  const [displayOrder, setDisplayOrder] = useState(
    status?.displayOrder?.toString() ?? "0",
  );
  const [color, setColor] = useState(status?.color ?? "");
  const [isDefault, setIsDefault] = useState(status?.isDefault ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(status?.name ?? "");
    setDisplayOrder(status?.displayOrder?.toString() ?? "0");
    setColor(status?.color ?? "");
    setIsDefault(status?.isDefault ?? false);
    setError(null);
  }, [status]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        displayOrder: parseInt(displayOrder, 10) || 0,
        color: color.trim() || undefined,
        isDefault,
      });
      onClose();
    } catch {
      setError("Failed to save project status");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="project-status-form-title">
            {status ? "Edit Project Status" : "Add Project Status"}
          </DialogTitle>
          <DialogDescription>
            {status
              ? "Update status details."
              : "Define a new project lifecycle status."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 px-6 py-4"
          data-testid="project-status-form"
        >
          {error && (
            <p
              className="text-sm text-destructive"
              data-testid="project-status-form-error"
            >
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="ps-name">Name</Label>
            <Input
              id="ps-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. in_progress, on_hold"
              data-testid="project-status-name-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ps-order">Display Order</Label>
              <Input
                id="ps-order"
                type="number"
                min="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                data-testid="project-status-order-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ps-color">Color (optional)</Label>
              <Input
                id="ps-color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. blue, green"
                data-testid="project-status-color-input"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="ps-default"
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="size-4 rounded border-input"
              data-testid="project-status-default-checkbox"
            />
            <Label htmlFor="ps-default">Default status for new projects</Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="project-status-form-cancel-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              data-testid="project-status-form-save-button"
            >
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Project Statuses Tab ──

function ProjectStatusesTab() {
  const { isAdmin } = useRole();
  const [statuses, setStatuses] = useState<ProjectStatusConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingStatus, setEditingStatus] =
    useState<ProjectStatusConfig | null>(null);

  const loadStatuses = useCallback(async () => {
    try {
      setStatuses(await projectStatusService.listProjectStatuses());
      setError(null);
    } catch {
      setError("Failed to load project statuses");
    }
  }, []);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  const handleCreate = async (data: ProjectStatusConfigCreate) => {
    await projectStatusService.createProjectStatus(data);
    await loadStatuses();
  };

  const handleUpdate = async (data: ProjectStatusConfigCreate) => {
    if (!editingStatus) return;
    await projectStatusService.updateProjectStatus(editingStatus.id, data);
    await loadStatuses();
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm("Are you sure you want to delete this project status?")
    )
      return;
    try {
      await projectStatusService.deleteProjectStatus(id);
      await loadStatuses();
    } catch {
      setError(
        "Failed to delete project status. It may be used by projects.",
      );
    }
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingStatus(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Project Statuses</h2>
          <p className="text-sm text-muted-foreground">
            {statuses.length} status{statuses.length !== 1 ? "es" : ""}{" "}
            configured
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setFormOpen(true)}
            data-testid="project-status-create-button"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add Status
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {statuses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
          <ListChecks className="size-10 opacity-30" aria-hidden="true" />
          <p>No project statuses defined.</p>
        </div>
      ) : (
        <Table data-testid="project-statuses-table">
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Order</TableHead>
              <TableHead className="font-semibold">Color</TableHead>
              <TableHead className="font-semibold">Default</TableHead>
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {statuses.map((s) => (
              <TableRow
                key={s.id}
                data-testid={`project-status-row-${s.id}`}
                className="hover:bg-muted/40"
              >
                <TableCell>
                  <Badge variant="secondary">{s.name}</Badge>
                </TableCell>
                <TableCell className="tabular-nums">{s.displayOrder}</TableCell>
                <TableCell className="text-muted-foreground">
                  {s.color ?? "-"}
                </TableCell>
                <TableCell>
                  {s.isDefault && (
                    <Badge variant="default" className="text-xs">
                      Default
                    </Badge>
                  )}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingStatus(s);
                          setFormOpen(true);
                        }}
                        data-testid={`project-status-edit-${s.id}`}
                      >
                        <Pencil className="size-3.5" aria-hidden="true" /> Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(s.id)}
                        data-testid={`project-status-delete-${s.id}`}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />{" "}
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <ProjectStatusFormDialog
        key={editingStatus?.id ?? "new"}
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={editingStatus ? handleUpdate : handleCreate}
        status={editingStatus}
      />
    </div>
  );
}

// ── Configuration Page ──

/**
 * Unified configuration page with tabs for managing Roles and Funding Sources.
 */
export function ConfigurationPage() {
  const [activeTab, setActiveTab] = useState<ConfigTab>("roles");

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
          <Settings className="size-5 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold" data-testid="configuration-title">
          Configuration
        </h1>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex border-b" role="tablist" data-testid="configuration-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-6 py-3 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              data-testid={`configuration-tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "roles" && <RolesTab />}
          {activeTab === "funding-sources" && <FundingSourcesTab />}
          {activeTab === "project-statuses" && <ProjectStatusesTab />}
        </div>
      </div>
    </div>
  );
}
