import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict


class AuditLogAction(str, Enum):
    ITEM_CREATED = "ITEM_CREATED"
    ITEM_UPDATED = "ITEM_UPDATED"
    STATUS_CHANGED = "STATUS_CHANGED"
    LOCATION_CHANGED = "LOCATION_CHANGED"
    ITEM_BORROWED = "ITEM_BORROWED"
    PHOTO_ADDED = "PHOTO_ADDED"
    OWNER_CHANGED = "OWNER_CHANGED"
    DELEGATES_CHANGED = "DELEGATES_CHANGED"


class AuditLogBase(BaseModel):
    user_id: int
    action: AuditLogAction
    item_id: int
    old_value: dict[str, Any] | None = None
    new_value: dict[str, Any] | None = None


class AuditLogCreate(AuditLogBase):
    pass


class AuditLogResponse(AuditLogBase):
    id: int
    timestamp: datetime.datetime
    model_config = ConfigDict(from_attributes=True)
