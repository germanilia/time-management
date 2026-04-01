from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.routers.auth_router import get_current_user
from app.schemas.analytics import (
    CapacityForecast,
    EmployeeUtilizationRecord,
    FinancialSummaryResponse,
    ProjectBudgetInsight,
    ProjectFinancialInsight,
    UtilizationProjectionResponse,
    UtilizationSummary,
    WeeklyAllocationsResponse,
)
from app.schemas.auth import UserResponse
from app.schemas.base import SuccessResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


def get_analytics_service(db: AsyncSession = Depends(get_db)) -> AnalyticsService:
    return AnalyticsService(db)


@router.get("/utilization", response_model=SuccessResponse[UtilizationSummary])
async def get_utilization(
    start_date: date = Query(alias="startDate"),
    end_date: date = Query(alias="endDate"),
    service: AnalyticsService = Depends(get_analytics_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[UtilizationSummary]:
    result = await service.get_utilization_summary(start_date, end_date)
    return SuccessResponse(data=result)


@router.get(
    "/utilization/employees",
    response_model=SuccessResponse[list[EmployeeUtilizationRecord]],
)
async def get_employee_utilization(
    start_date: date = Query(alias="startDate"),
    end_date: date = Query(alias="endDate"),
    service: AnalyticsService = Depends(get_analytics_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[list[EmployeeUtilizationRecord]]:
    result = await service.get_per_employee_utilization(start_date, end_date)
    return SuccessResponse(data=result)


@router.get("/capacity", response_model=SuccessResponse[CapacityForecast])
async def get_capacity(
    start_date: date = Query(alias="startDate"),
    end_date: date = Query(alias="endDate"),
    granularity: str = Query("monthly"),
    service: AnalyticsService = Depends(get_analytics_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[CapacityForecast]:
    result = await service.get_capacity_forecast(start_date, end_date, granularity)
    return SuccessResponse(data=result)


@router.get(
    "/weekly-allocations",
    response_model=SuccessResponse[WeeklyAllocationsResponse],
)
async def get_weekly_allocations(
    start_date: date = Query(alias="startDate"),
    end_date: date = Query(alias="endDate"),
    service: AnalyticsService = Depends(get_analytics_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[WeeklyAllocationsResponse]:
    result = await service.get_weekly_allocations(start_date, end_date)
    return SuccessResponse(data=result)


@router.get(
    "/utilization-projection",
    response_model=SuccessResponse[UtilizationProjectionResponse],
)
async def get_utilization_projection(
    start_date: date = Query(alias="startDate"),
    end_date: date = Query(alias="endDate"),
    employee_ids: list[UUID] | None = Query(None, alias="employeeIds"),
    service: AnalyticsService = Depends(get_analytics_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[UtilizationProjectionResponse]:
    result = await service.get_utilization_projection(
        start_date, end_date, employee_ids=employee_ids
    )
    return SuccessResponse(data=result)


@router.get(
    "/budget/{project_id}",
    response_model=SuccessResponse[ProjectBudgetInsight],
)
async def get_budget_insights(
    project_id: UUID,
    service: AnalyticsService = Depends(get_analytics_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[ProjectBudgetInsight]:
    result = await service.get_budget_insights(project_id)
    return SuccessResponse(data=result)


@router.get(
    "/financial/{project_id}",
    response_model=SuccessResponse[ProjectFinancialInsight],
)
async def get_financial_insights(
    project_id: UUID,
    service: AnalyticsService = Depends(get_analytics_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[ProjectFinancialInsight]:
    result = await service.get_financial_insights(project_id)
    return SuccessResponse(data=result)


@router.get(
    "/financial-summary",
    response_model=SuccessResponse[FinancialSummaryResponse],
)
async def get_financial_summary(
    funding_source_id: UUID | None = Query(
        None, alias="fundingSourceId"
    ),
    service: AnalyticsService = Depends(get_analytics_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[FinancialSummaryResponse]:
    result = await service.get_financial_summary(
        funding_source_id=funding_source_id
    )
    return SuccessResponse(data=result)
