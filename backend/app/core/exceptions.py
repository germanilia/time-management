class AppException(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundException(AppException):
    def __init__(self, resource: str, resource_id: str | None = None) -> None:
        detail = f"{resource} not found"
        if resource_id:
            detail = f"{resource} with id '{resource_id}' not found"
        super().__init__(message=detail, status_code=404)


class ConflictException(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(message=message, status_code=409)


class OverAllocationException(AppException):
    def __init__(
        self, employee_name: str, total_percent: float, date_range: str
    ) -> None:
        super().__init__(
            message=(
                f"Employee '{employee_name}' would be over-allocated at {total_percent}% "
                f"during {date_range}"
            ),
            status_code=409,
        )


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Invalid credentials") -> None:
        super().__init__(message=message, status_code=401)


class ForbiddenException(AppException):
    def __init__(self, message: str = "Forbidden") -> None:
        super().__init__(message=message, status_code=403)


class ValidationException(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(message=message, status_code=422)
