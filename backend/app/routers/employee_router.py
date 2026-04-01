from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import require_role
from app.dao.employee_dao import EmployeeDao
from app.dependencies import get_db
from app.enums.employee_status import EmployeeStatus
from app.enums.user_role import UserRole
from app.routers.auth_router import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.base import MessageResponse, SuccessResponse
from app.schemas.employee import EmployeeCreate, EmployeeResponse, EmployeeUpdate
from app.services.employee_service import EmployeeService

router = APIRouter(prefix="/employees", tags=["employees"])


def get_employee_dao(db: AsyncSession = Depends(get_db)) -> EmployeeDao:
    return EmployeeDao(db)


def get_employee_service(
    dao: EmployeeDao = Depends(get_employee_dao),
) -> EmployeeService:
    return EmployeeService(dao)


@router.get("", response_model=SuccessResponse[list[EmployeeResponse]])
async def list_employees(
    status: EmployeeStatus | None = Query(None),
    search: str | None = Query(None),
    role_id: UUID | None = Query(None, alias="roleId"),
    service: EmployeeService = Depends(get_employee_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[list[EmployeeResponse]]:
    employees = await service.list_all(status=status, search=search, role_id=role_id)
    return SuccessResponse(data=employees)


@router.get("/{employee_id}", response_model=SuccessResponse[EmployeeResponse])
async def get_employee(
    employee_id: UUID,
    service: EmployeeService = Depends(get_employee_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[EmployeeResponse]:
    employee = await service.get_by_id(employee_id)
    return SuccessResponse(data=employee)


@router.post("", response_model=SuccessResponse[EmployeeResponse])
async def create_employee(
    data: EmployeeCreate,
    service: EmployeeService = Depends(get_employee_service),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN)),
) -> SuccessResponse[EmployeeResponse]:
    employee = await service.create(data)
    return SuccessResponse(data=employee)


@router.put("/{employee_id}", response_model=SuccessResponse[EmployeeResponse])
async def update_employee(
    employee_id: UUID,
    data: EmployeeUpdate,
    service: EmployeeService = Depends(get_employee_service),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN)),
) -> SuccessResponse[EmployeeResponse]:
    employee = await service.update(employee_id, data)
    return SuccessResponse(data=employee)


@router.delete("/{employee_id}", response_model=MessageResponse)
async def delete_employee(
    employee_id: UUID,
    service: EmployeeService = Depends(get_employee_service),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN)),
) -> MessageResponse:
    await service.delete(employee_id)
    return MessageResponse(message="Employee deleted successfully")
