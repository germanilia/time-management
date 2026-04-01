import uuid
from calendar import monthrange
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.dao.assignment_dao import AssignmentDao
from app.dao.employee_dao import EmployeeDao
from app.dao.phase_dao import PhaseDao
from app.dao.project_dao import ProjectDao
from app.enums.allocation_type import AssignmentAllocationType
from app.enums.billing_type import BillingType
from app.enums.employee_status import EmployeeStatus
from app.schemas.analytics import (
    CapacityForecast,
    CapacityPeriod,
    EmployeeUtilizationRecord,
    EmployeeWeekAllocation,
    EmployeeWeeklyRow,
    FinancialSummaryResponse,
    PhaseBudgetInsight,
    ProjectAllocationEntry,
    ProjectBudgetInsight,
    ProjectFinancialInsight,
    ProjectSummaryEntry,
    UtilizationProjectionPoint,
    UtilizationProjectionResponse,
    UtilizationSummary,
    WeeklyAllocationsResponse,
)
from app.schemas.assignment import AssignmentResponse
from app.utils.date_utils import count_working_days, iter_week_starts

HOURS_PER_DAY = 8


def _effective_percentage(assignment: AssignmentResponse) -> float:
    if assignment.allocation_type == AssignmentAllocationType.PERCENTAGE:
        return float(assignment.allocation_percentage or 0)
    working_days = count_working_days(assignment.start_date, assignment.end_date)
    if working_days == 0:
        return 0.0
    daily_hours = (assignment.allocated_hours or 0) / working_days
    return (daily_hours / HOURS_PER_DAY) * 100


class AnalyticsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.employee_dao = EmployeeDao(db)
        self.assignment_dao = AssignmentDao(db)
        self.project_dao = ProjectDao(db)
        self.phase_dao = PhaseDao(db)

    async def get_utilization_summary(
        self, start_date: date, end_date: date
    ) -> UtilizationSummary:
        employees = await self.employee_dao.list_all(status=EmployeeStatus.ACTIVE)
        idle_count = 0
        over_count = 0
        under_count = 0
        total_util = 0.0

        for emp in employees:
            assignments = await self.assignment_dao.get_overlapping(
                emp.id, start_date, end_date
            )
            total_pct = sum(_effective_percentage(a) for a in assignments)
            available = emp.job_percentage
            if total_pct == 0:
                idle_count += 1
            elif total_pct > available:
                over_count += 1
            elif total_pct < emp.target_utilization_percentage:
                under_count += 1
            total_util += total_pct

        avg = total_util / len(employees) if employees else 0.0

        return UtilizationSummary(
            start_date=start_date,
            end_date=end_date,
            average_utilization=round(avg, 1),
            over_allocated_count=over_count,
            under_utilized_count=under_count,
            idle_count=idle_count,
            total_employees=len(employees),
        )

    async def get_per_employee_utilization(
        self, start_date: date, end_date: date
    ) -> list[EmployeeUtilizationRecord]:
        employees = await self.employee_dao.list_all(status=EmployeeStatus.ACTIVE)
        records: list[EmployeeUtilizationRecord] = []

        for emp in employees:
            assignments = await self.assignment_dao.get_overlapping(
                emp.id, start_date, end_date
            )
            total_pct = sum(_effective_percentage(a) for a in assignments)
            target = float(emp.target_utilization_percentage)
            records.append(
                EmployeeUtilizationRecord(
                    employee_id=str(emp.id),
                    employee_name=emp.name,
                    department=emp.department,
                    average_utilization=round(total_pct, 1),
                    target_utilization=target,
                    target_gap=round(target - total_pct, 1),
                    assignments_count=len(assignments),
                )
            )
        return records

    async def get_capacity_forecast(
        self, start_date: date, end_date: date, granularity: str = "monthly"
    ) -> CapacityForecast:
        employees = await self.employee_dao.list_all(status=EmployeeStatus.ACTIVE)
        periods: list[CapacityPeriod] = []

        current = date(start_date.year, start_date.month, 1)
        while current <= end_date:
            _, last_day = monthrange(current.year, current.month)
            period_start = max(current, start_date)
            period_end = min(date(current.year, current.month, last_day), end_date)

            working_days = count_working_days(period_start, period_end)
            total_capacity = 0.0
            allocated = 0.0

            for emp in employees:
                emp_capacity = (
                    working_days * HOURS_PER_DAY * emp.job_percentage / 100
                )
                total_capacity += emp_capacity

                assignments = await self.assignment_dao.get_overlapping(
                    emp.id, period_start, period_end
                )
                for a in assignments:
                    pct = _effective_percentage(a)
                    allocated += working_days * HOURS_PER_DAY * pct / 100

            periods.append(
                CapacityPeriod(
                    period=current.strftime("%Y-%m"),
                    total_capacity_hours=round(total_capacity, 1),
                    allocated_hours=round(allocated, 1),
                    available_hours=round(total_capacity - allocated, 1),
                    gap=round(total_capacity - allocated, 1),
                )
            )

            if current.month == 12:
                current = date(current.year + 1, 1, 1)
            else:
                current = date(current.year, current.month + 1, 1)

        return CapacityForecast(periods=periods)

    # ── Weekly allocations ──

    async def get_weekly_allocations(
        self, start_date: date, end_date: date
    ) -> WeeklyAllocationsResponse:
        employees = await self.employee_dao.list_all(status=EmployeeStatus.ACTIVE)
        all_assignments = await self.assignment_dao.get_all_overlapping(
            start_date, end_date
        )
        all_projects = await self.project_dao.list_all()
        project_names: dict[uuid.UUID, str] = {p.id: p.name for p in all_projects}

        # Index assignments by employee_id
        emp_assignments: dict[uuid.UUID, list[AssignmentResponse]] = defaultdict(list)
        for a in all_assignments:
            emp_assignments[a.employee_id].append(a)

        week_starts = list(iter_week_starts(start_date, end_date))
        week_start_strs = [w.isoformat() for w in week_starts]

        seen_project_ids: set[uuid.UUID] = set()
        employee_rows: list[EmployeeWeeklyRow] = []

        for emp in employees:
            max_days = 5.0 * emp.job_percentage / 100
            weeks: dict[str, EmployeeWeekAllocation] = {}

            for sunday in week_starts:
                thursday = sunday + timedelta(days=4)
                project_days: dict[uuid.UUID, float] = defaultdict(float)

                for a in emp_assignments.get(emp.id, []):
                    overlap_start = max(sunday, a.start_date)
                    overlap_end = min(thursday, a.end_date)
                    if overlap_start > overlap_end:
                        continue
                    overlap_wd = count_working_days(overlap_start, overlap_end)
                    if overlap_wd == 0:
                        continue

                    days = self._assignment_days_for_period(a, overlap_wd)
                    project_days[a.project_id] += days
                    seen_project_ids.add(a.project_id)

                allocations = [
                    ProjectAllocationEntry(
                        project_id=str(pid),
                        project_name=project_names.get(pid, "Unknown"),
                        allocated_days=round(d, 1),
                    )
                    for pid, d in project_days.items()
                    if d > 0
                ]
                total = sum(e.allocated_days for e in allocations)
                weeks[sunday.isoformat()] = EmployeeWeekAllocation(
                    allocations=allocations,
                    total_days=round(total, 1),
                    max_days=max_days,
                )

            employee_rows.append(
                EmployeeWeeklyRow(
                    employee_id=str(emp.id),
                    employee_name=emp.name,
                    max_days_per_week=max_days,
                    weeks=weeks,
                )
            )

        project_summaries = [
            ProjectSummaryEntry(
                project_id=str(pid),
                project_name=project_names.get(pid, "Unknown"),
            )
            for pid in seen_project_ids
        ]

        return WeeklyAllocationsResponse(
            employees=employee_rows,
            projects=project_summaries,
            week_starts=week_start_strs,
        )

    @staticmethod
    def _assignment_days_for_period(
        a: AssignmentResponse, overlap_working_days: int
    ) -> float:
        """Calculate working days an assignment contributes to a period."""
        if a.allocation_type == AssignmentAllocationType.PERCENTAGE:
            return overlap_working_days * (a.allocation_percentage or 0) / 100

        total_wd = count_working_days(a.start_date, a.end_date)
        if total_wd == 0:
            return 0.0
        daily_hours = (a.allocated_hours or 0) / total_wd
        daily_fraction = daily_hours / HOURS_PER_DAY
        return overlap_working_days * daily_fraction

    # ── Utilization projection ──

    async def get_utilization_projection(
        self,
        start_date: date,
        end_date: date,
        employee_ids: list[uuid.UUID] | None = None,
    ) -> UtilizationProjectionResponse:
        employees = await self.employee_dao.list_all(status=EmployeeStatus.ACTIVE)
        if employee_ids:
            employee_id_set = set(employee_ids)
            employees = [e for e in employees if e.id in employee_id_set]

        all_assignments = await self.assignment_dao.get_all_overlapping(
            start_date, end_date
        )

        emp_id_set = {e.id for e in employees}
        emp_assignments: dict[uuid.UUID, list[AssignmentResponse]] = defaultdict(list)
        for a in all_assignments:
            if a.employee_id in emp_id_set:
                emp_assignments[a.employee_id].append(a)

        week_starts = list(iter_week_starts(start_date, end_date))
        today = date.today()
        current_week_index = 0

        points: list[UtilizationProjectionPoint] = []

        for idx, sunday in enumerate(week_starts):
            thursday = sunday + timedelta(days=4)
            week_wd = count_working_days(sunday, thursday)

            if sunday <= today <= thursday:
                current_week_index = idx
            elif sunday > today and (idx == 0 or week_starts[idx - 1] + timedelta(days=4) < today):
                current_week_index = idx

            capacity = 0.0
            allocated = 0.0

            for emp in employees:
                emp_cap = week_wd * HOURS_PER_DAY * emp.job_percentage / 100
                capacity += emp_cap

                for a in emp_assignments.get(emp.id, []):
                    overlap_start = max(sunday, a.start_date)
                    overlap_end = min(thursday, a.end_date)
                    if overlap_start > overlap_end:
                        continue
                    overlap_wd = count_working_days(overlap_start, overlap_end)
                    if overlap_wd == 0:
                        continue
                    days = self._assignment_days_for_period(a, overlap_wd)
                    allocated += days * HOURS_PER_DAY

            util_pct = (allocated / capacity * 100) if capacity > 0 else 0.0

            points.append(
                UtilizationProjectionPoint(
                    week_start=sunday.isoformat(),
                    capacity_hours=round(capacity, 1),
                    allocated_hours=round(allocated, 1),
                    available_hours=round(capacity - allocated, 1),
                    utilization_percentage=round(util_pct, 1),
                )
            )

        return UtilizationProjectionResponse(
            points=points,
            current_week_index=current_week_index,
        )

    # ── Budget insights ──

    async def get_budget_insights(
        self, project_id: uuid.UUID
    ) -> ProjectBudgetInsight:
        """Calculate budget insights for a project: cost, profit, margin per phase."""
        project = await self.project_dao.get_by_id(project_id)
        if not project:
            raise NotFoundException("Project", str(project_id))

        phases = await self.phase_dao.list_by_project(project_id)
        phase_insights: list[PhaseBudgetInsight] = []
        total_budget = Decimal("0")
        total_cost = Decimal("0")

        for phase in phases:
            phase_cost = await self._calculate_phase_cost(phase.id)
            phase_budget = phase.budget or Decimal("0")
            phase_profit = phase_budget - phase_cost
            margin = (
                float(phase_profit / phase_budget * 100)
                if phase_budget > 0
                else None
            )

            phase_insights.append(
                PhaseBudgetInsight(
                    phase_id=str(phase.id),
                    phase_name=phase.name,
                    budget=phase.budget,
                    cost=phase_cost,
                    profit=phase_profit if phase.budget is not None else None,
                    margin_percentage=round(margin, 1) if margin is not None else None,
                )
            )
            total_budget += phase_budget
            total_cost += phase_cost

        total_profit = total_budget - total_cost
        total_margin = (
            round(float(total_profit / total_budget * 100), 1)
            if total_budget > 0
            else 0.0
        )

        return ProjectBudgetInsight(
            project_id=str(project_id),
            project_name=project.name,
            total_budget=total_budget,
            total_cost=total_cost,
            total_profit=total_profit,
            margin_percentage=total_margin,
            phases=phase_insights,
        )

    # ── Financial insights ──

    async def get_financial_insights(
        self, project_id: uuid.UUID
    ) -> ProjectFinancialInsight:
        """Calculate financial insights for a project.

        Income = hours x billing rate (what we charge the client).
        For fixed-price: budget = what client pays. Profit = budget - income consumed.
        For T&M: income = hours x rate. If budget set, track over/under.
        """
        project = await self.project_dao.get_by_id(project_id)
        if not project:
            raise NotFoundException("Project", str(project_id))

        phases = await self.phase_dao.list_by_project(project_id)
        phase_insights: list[PhaseBudgetInsight] = []
        total_phase_budget = Decimal("0")
        total_income = Decimal("0")
        total_hours = Decimal("0")

        for phase in phases:
            phase_income, phase_hours = await self._calculate_phase_income(
                phase.id
            )
            phase_budget = phase.budget or Decimal("0")
            phase_profit = phase_budget - phase_income
            margin = (
                float(phase_profit / phase_budget * 100)
                if phase_budget > 0
                else None
            )

            phase_insights.append(
                PhaseBudgetInsight(
                    phase_id=str(phase.id),
                    phase_name=phase.name,
                    budget=phase.budget,
                    cost=phase_income,
                    profit=phase_profit if phase.budget is not None else None,
                    margin_percentage=(
                        round(margin, 1) if margin is not None else None
                    ),
                )
            )
            total_phase_budget += phase_budget
            total_income += phase_income
            total_hours += phase_hours

        # Determine project-level financials based on billing type
        if project.billing_type == BillingType.FIXED_PRICE:
            budget = project.fixed_price_amount or Decimal("0")
            profit = budget - total_income
            remaining = budget - total_income
        else:
            budget = total_phase_budget
            profit = budget - total_income if budget > 0 else Decimal("0")
            remaining = budget - total_income if budget > 0 else None

        margin_pct = (
            round(float(profit / budget * 100), 1)
            if budget > 0
            else None
        )

        return ProjectFinancialInsight(
            project_id=str(project_id),
            project_name=project.name,
            billing_type=project.billing_type,
            funding_source_name=project.funding_source_name,
            income=total_income,
            total_cost=total_income,
            profit=profit,
            margin_percentage=margin_pct,
            remaining=remaining,
            total_hours=total_hours,
            total_budget=budget,
            phases=phase_insights,
        )

    async def get_financial_summary(
        self, funding_source_id: uuid.UUID | None = None
    ) -> FinancialSummaryResponse:
        """Aggregate financial insights across all projects."""
        all_projects = await self.project_dao.list_all(
            funding_source_id=funding_source_id
        )
        project_insights: list[ProjectFinancialInsight] = []
        total_income = Decimal("0")
        total_cost = Decimal("0")
        total_profit = Decimal("0")
        margins: list[float] = []

        for proj in all_projects:
            insight = await self.get_financial_insights(proj.id)
            project_insights.append(insight)
            total_income += insight.income
            total_cost += insight.total_cost
            total_profit += insight.profit
            if insight.margin_percentage is not None:
                margins.append(insight.margin_percentage)

        avg_margin = (
            round(sum(margins) / len(margins), 1)
            if margins
            else None
        )

        return FinancialSummaryResponse(
            total_income=total_income,
            total_cost=total_cost,
            total_profit=total_profit,
            average_margin=avg_margin,
            project_count=len(all_projects),
            projects=project_insights,
        )

    async def _calculate_phase_cost(self, phase_id: uuid.UUID) -> Decimal:
        """Sum of (effective rate * allocated_hours) for all assignments in a phase.

        Rate resolution order:
        1. Assignment hourly_rate_override
        2. Employee effective_hourly_rate (employee override -> role default)
        """
        assignments = await self.assignment_dao.list_by_phase(phase_id)
        total_cost = Decimal("0")
        for assignment in assignments:
            employee = await self.employee_dao.get_by_id(assignment.employee_id)
            if not employee:
                continue
            rate = (
                assignment.hourly_rate_override
                if assignment.hourly_rate_override is not None
                else employee.effective_hourly_rate
            )
            hours = Decimal(str(assignment.allocated_hours or 0))
            total_cost += rate * hours
        return total_cost

    async def _calculate_phase_income(
        self, phase_id: uuid.UUID
    ) -> tuple[Decimal, Decimal]:
        """Calculate income and total hours for a phase.

        Income = sum(effective_rate * allocated_hours) for all assignments.
        Returns (total_income, total_hours).
        """
        assignments = await self.assignment_dao.list_by_phase(phase_id)
        total_income = Decimal("0")
        total_hours = Decimal("0")
        for assignment in assignments:
            employee = await self.employee_dao.get_by_id(assignment.employee_id)
            if not employee:
                continue
            rate = (
                assignment.hourly_rate_override
                if assignment.hourly_rate_override is not None
                else employee.effective_hourly_rate
            )
            hours = Decimal(str(assignment.allocated_hours or 0))
            total_income += rate * hours
            total_hours += hours
        return total_income, total_hours
