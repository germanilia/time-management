import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BillingType } from "@/types/project";
import type { FundingSource } from "@/types/funding-source";
import type { ProjectStatusConfig } from "@/types/project-status";
import * as fundingSourceService from "@/services/funding-source-service";
import * as projectStatusService from "@/services/project-status-service";

const BILLING_TYPE_OPTIONS: { value: BillingType; label: string }[] = [
  { value: BillingType.TIME_AND_MATERIALS, label: "Time & Materials" },
  { value: BillingType.FIXED_PRICE, label: "Fixed Price" },
];

interface ProjectInfoStepProps {
  name: string;
  onNameChange: (value: string) => void;
  customer: string;
  onCustomerChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  salesforceLink: string;
  onSalesforceLinkChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  status?: string;
  onStatusChange?: (value: string) => void;
  billingType: BillingType;
  onBillingTypeChange: (value: BillingType) => void;
  fixedPriceAmount: string;
  onFixedPriceAmountChange: (value: string) => void;
  fundingSourceId: string;
  onFundingSourceIdChange: (value: string) => void;
}

/**
 * Step 1 of the project creation wizard — collects project name,
 * description, date range, billing type, and funding source.
 */
export function ProjectInfoStep({
  name,
  onNameChange,
  customer,
  onCustomerChange,
  description,
  onDescriptionChange,
  salesforceLink,
  onSalesforceLinkChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  status,
  onStatusChange,
  billingType,
  onBillingTypeChange,
  fixedPriceAmount,
  onFixedPriceAmountChange,
  fundingSourceId,
  onFundingSourceIdChange,
}: ProjectInfoStepProps) {
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<ProjectStatusConfig[]>([]);

  useEffect(() => {
    fundingSourceService
      .listFundingSources()
      .then(setFundingSources)
      .catch(() => {});
    projectStatusService
      .listProjectStatuses()
      .then(setProjectStatuses)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4" data-testid="wizard-step-project-info">
      <div className="space-y-2">
        <Label htmlFor="proj-name">Name</Label>
        <Input
          id="proj-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
          data-testid="project-name-input"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="proj-customer">Customer</Label>
        <Input
          id="proj-customer"
          value={customer}
          onChange={(e) => onCustomerChange(e.target.value)}
          required
          data-testid="project-customer-input"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="proj-desc">Description</Label>
        <Input
          id="proj-desc"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          data-testid="project-description-input"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="proj-start">Start Date</Label>
          <Input
            id="proj-start"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            required
            data-testid="project-start-date-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="proj-end">End Date (optional)</Label>
          <div className="flex items-center gap-1">
            <Input
              id="proj-end"
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              data-testid="project-end-date-input"
            />
            {endDate && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEndDateChange("");
                }}
                aria-label="Clear end date"
                data-testid="project-end-date-clear-button"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="proj-billing-type">Billing Type</Label>
          <select
            id="proj-billing-type"
            value={billingType}
            onChange={(e) => onBillingTypeChange(e.target.value as BillingType)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            data-testid="project-billing-type-select"
          >
            {BILLING_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {billingType === BillingType.FIXED_PRICE && (
          <div className="space-y-2">
            <Label htmlFor="proj-fixed-price">Fixed Price Amount ($)</Label>
            <Input
              id="proj-fixed-price"
              type="number"
              min="0"
              step="0.01"
              value={fixedPriceAmount}
              onChange={(e) => onFixedPriceAmountChange(e.target.value)}
              placeholder="0.00"
              data-testid="project-fixed-price-input"
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="proj-salesforce-link">Link to Salesforce (optional)</Label>
        <Input
          id="proj-salesforce-link"
          value={salesforceLink}
          onChange={(e) => onSalesforceLinkChange(e.target.value)}
          placeholder="https://..."
          data-testid="project-salesforce-link-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="proj-funding-source">Funding Source</Label>
        <select
          id="proj-funding-source"
          value={fundingSourceId}
          onChange={(e) => onFundingSourceIdChange(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          data-testid="project-funding-source-select"
        >
          <option value="">None</option>
          {fundingSources.map((fs) => (
            <option key={fs.id} value={fs.id}>
              {fs.name}
            </option>
          ))}
        </select>
      </div>

      {status !== undefined && onStatusChange && (
        <div className="space-y-2">
          <Label htmlFor="proj-status">Status</Label>
          <select
            id="proj-status"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            data-testid="project-status-select"
          >
            {projectStatuses.map((ps) => (
              <option key={ps.id} value={ps.name}>
                {ps.name.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
