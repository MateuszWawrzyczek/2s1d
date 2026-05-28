from pydantic import BaseModel, Field, field_validator


class ItemStatusBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def normalize(cls, v: str):
        return v.strip()


class ItemStatusCreate(ItemStatusBase):
    pass


class ItemStatusUpdate(ItemStatusBase):
    pass


class ItemStatusResponse(BaseModel):
    id: int
    name: str
    is_system: bool

    model_config = {"from_attributes": True}
