from __future__ import annotations

from pydantic import BaseModel, field_validator


class CategoryCreate(BaseModel):
    name: str
    parent_id: int | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Nazwa kategorii nie może być pusta!")
        if len(v) > 100:
            raise ValueError("Nazwa kategorii nie może być dłuższa niż 100 znaków.")
        return v.strip()


class CategoryUpdate(BaseModel):
    name: str
    parent_id: int | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Nazwa kategorii nie może być pusta!")
        if len(v) > 100:
            raise ValueError("Nazwa kategorii nie może być dłuższa niż 100 znaków.")
        return v.strip()


class CategoryResponse(BaseModel):
    id: int
    name: str
    parent_id: int | None

    model_config = {"from_attributes": True}


class CategoryTree(BaseModel):
    id: int
    name: str
    parent_id: int | None
    children: list[CategoryTree] = []

    model_config = {"from_attributes": True}
