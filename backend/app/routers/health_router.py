from fastapi import APIRouter

from app.schemas.base import SuccessResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=SuccessResponse[dict])
async def health_check() -> SuccessResponse[dict]:
    return SuccessResponse(data={"status": "healthy"})
