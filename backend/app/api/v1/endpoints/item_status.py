from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.item_status import (
    ItemStatusCreate,
    ItemStatusResponse,
    ItemStatusUpdate,
)
from app.services import item_status as service

router = APIRouter(prefix="/item-status", tags=["item-status"])


@router.get("/", response_model=list[ItemStatusResponse])
def get_statuses(db: Session = Depends(get_db)):
    return service.get_all_statuses(db)


@router.post("/", response_model=ItemStatusResponse, status_code=201)
def create_status(data: ItemStatusCreate, db: Session = Depends(get_db)):
    return service.create_status(data, db)


@router.put("/{status_id}", response_model=ItemStatusResponse)
def update_status(
    status_id: int, data: ItemStatusUpdate, db: Session = Depends(get_db)
):
    return service.update_status(status_id, data, db)


@router.delete("/{status_id}", status_code=204)
def delete_status(status_id: int, db: Session = Depends(get_db)):
    service.delete_status(status_id, db)
