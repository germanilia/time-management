from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.exceptions import AppException


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": "error", "message": exc.message},
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors: list[str] = []
    for err in exc.errors():
        loc = " → ".join(str(part) for part in err["loc"] if part != "body")
        errors.append(f"{loc}: {err['msg']}")
    message = "; ".join(errors) if errors else "Validation error"
    return JSONResponse(
        status_code=422,
        content={"status": "error", "message": message},
    )
