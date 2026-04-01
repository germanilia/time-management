import { Badge } from "@/components/ui/badge";
import type { Role } from "@/types/employee";
import type { PhaseFormState } from "./types";

interface ReviewStepProps {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  phases: PhaseFormState[];
  roles: Role[];
}

/**
 * Step 3 of the project creation wizard — read-only summary
 * of all entered data before final submission.
 */
export function ReviewStep({
  name,
  description,
  startDate,
  endDate,
  phases,
  roles,
}: ReviewStepProps) {
  return (
    <div className="space-y-4" data-testid="wizard-step-review">
      <div className="rounded-lg border p-4 space-y-2">
        <h3 className="text-sm font-semibold">Project</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Name</dt>
          <dd data-testid="review-project-name">{name}</dd>
          <dt className="text-muted-foreground">Description</dt>
          <dd data-testid="review-project-description">{description || "—"}</dd>
          <dt className="text-muted-foreground">Start Date</dt>
          <dd data-testid="review-project-start-date">{startDate}</dd>
          <dt className="text-muted-foreground">End Date</dt>
          <dd data-testid="review-project-end-date">{endDate || "Ongoing"}</dd>
        </dl>
      </div>

      {phases.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">
            Phases ({phases.length})
          </h3>
          {phases.map((phase, index) => (
            <div
              key={index}
              className="rounded-lg border p-3 space-y-2"
              data-testid={`review-phase-${index}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {phase.name || `Phase ${index + 1}`}
                </span>
                <Badge variant="outline" className="text-xs">
                  {phase.allocationType}
                </Badge>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Dates</dt>
                <dd>
                  {phase.startDate} — {phase.endDate}
                </dd>
                {phase.requiredHours && (
                  <>
                    <dt className="text-muted-foreground">Hours</dt>
                    <dd>{phase.requiredHours}</dd>
                  </>
                )}
                {phase.requiredHeadcount && (
                  <>
                    <dt className="text-muted-foreground">Headcount</dt>
                    <dd>{phase.requiredHeadcount}</dd>
                  </>
                )}
                {phase.budget && (
                  <>
                    <dt className="text-muted-foreground">Budget</dt>
                    <dd>{parseFloat(phase.budget).toLocaleString("en-US")}</dd>
                  </>
                )}
              </dl>
              {phase.roleRequirements.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {phase.roleRequirements.map((rr, rrIndex) => (
                    <Badge
                      key={rrIndex}
                      variant="secondary"
                      className="text-xs"
                      data-testid={`review-phase-${index}-rr-${rrIndex}`}
                    >
                      {rr.count}x{" "}
                      {roles.find((r) => r.id === rr.roleId)?.name ?? rr.roleId}
                      {parseInt(rr.allocationPercentage) < 100
                        ? ` (${rr.allocationPercentage}%)`
                        : ""}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {phases.length === 0 && (
        <p className="text-sm text-muted-foreground">No phases configured.</p>
      )}
    </div>
  );
}
