from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class JsonModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=lambda field_name: "".join(
            word.capitalize() if i > 0 else word
            for i, word in enumerate(field_name.split("_"))
        ),
    )


class SuccessResponse(JsonModel, Generic[T]):
    status: str = "success"
    data: T


class ErrorResponse(JsonModel):
    status: str = "error"
    message: str


class MessageResponse(JsonModel):
    status: str = "success"
    message: str
