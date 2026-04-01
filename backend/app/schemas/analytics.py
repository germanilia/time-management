from datetime import date
from decimal import Decimal

from app.schemas.base import JsonModel


class EmployeeUtilizationRecord(JsonModel):
    employee_id: str
    employee_name: str
    department: str | None
    average_utilization: float
    target_utilization: float
    target_gap: float
    assignments_count: int


class UtilizationSummary(JsonModel):
    start_date: date
    end_date: date
    average_utilization: float
    over_allocated_count: int
    under_utilized_count: int
    idle_count: int
    total_employees: int


class CapacityPeriod(JsonModel):
    period: str
    total_capacity_hours: float
    allocated_hours: float
    available_hours: float
    gap: float


class CapacityForecast(JsonModel):
    periods: list[CapacityPeriod]


class PhaseBudgetInsight(JsonModel):
    phase_id: str
    phase_name: str
    budget: Decimal | None
    cost: Decimal
    profit: Decimal | None
    margin_percentage: float | None


class ProjectBudgetInsight(JsonModel):
    project_id: str
    project_name: str
    total_budget: Decimal
    total_cost: Decimal
    total_profit: Decimal
    margin_percentage: float
    phases: list[PhaseBudgetInsight]


class ProjectFinancialInsight(JsonModel):
    project_id: str
    project_name: str
    billing_type: str
    funding_source_name: str | None
    income: Decimal
    total_cost: Decimal
    profit: Decimal
    margin_percentage: float | None
    remaining: Decimal | None
    total_hours: Decimal
    total_budget: Decimal
    phases: list[PhaseBudgetInsight]


class FinancialSummaryResponse(JsonModel):
    total_income: Decimal
    total_cost: Decimal
    total_profit: Decimal
    average_margin: float | None
    project_count: int
    projects: list[ProjectFinancialInsight]


# ── Weekly allocation schemas ──


class ProjectAllocationEntry(JsonModel):
    project_id: str
    project_name: str
    allocated_days: float


class EmployeeWeekAllocation(JsonModel):
    allocations: list[ProjectAllocationEntry]
    total_days: float
    max_days: float


class ProjectSummaryEntry(JsonModel):
    project_id: str
    project_name: str


class EmployeeWeeklyRow(JsonModel):
    employee_id: str
    employee_name: str
    max_days_per_week: float
    weeks: dict[str, EmployeeWeekAllocation]


class WeeklyAllocationsResponse(JsonModel):
    employees: list[EmployeeWeeklyRow]
    projects: list[ProjectSummaryEntry]
    week_starts: list[str]


# ── Utilization projection schemas ──


class UtilizationProjectionPoint(JsonModel):
    week_start: str
    capacity_hours: float
    allocated_hours: float
    available_hours: float
    utilization_percentage: float


class UtilizationProjectionResponse(JsonModel):
    points: list[UtilizationProjectionPoint]
    current_week_index: int
