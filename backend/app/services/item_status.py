from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.item_status import ItemStatus
from app.schemas.item_status import ItemStatusCreate, ItemStatusUpdate

SYSTEM_STATUS = [
    "Dostępny",
    "Wypożyczony",
    "Zarezerwowany",
    "Uszkodzony",
    "Oczekuje zatwierdzenia",
]


def init_system_statuses(db: Session):
    for name in SYSTEM_STATUS:
        exists = db.query(ItemStatus).filter(ItemStatus.name == name).first()
        if not exists:
            db.add(ItemStatus(name=name, is_system=True))
    db.commit()


def _check_name_unique(db: Session, name: str, exclude_id: int | None = None):
    q = db.query(ItemStatus).filter(ItemStatus.name == name)

    if exclude_id:
        q = q.filter(ItemStatus.id != exclude_id)

    exists = q.first()

    if exists:
        raise HTTPException(
            status_code=400, detail="Status with this name already exists"
        )


def get_all_statuses(db: Session):
    return db.query(ItemStatus).all()


def create_status(data: ItemStatusCreate, db: Session):
    _check_name_unique(db, data.name)

    status = ItemStatus(name=data.name, is_system=False)
    db.add(status)
    db.commit()
    db.refresh(status)
    return status


def update_status(status_id: int, data: ItemStatusUpdate, db: Session):
    status = db.query(ItemStatus).filter(ItemStatus.id == status_id).first()
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")
    if status.is_system:
        raise HTTPException(status_code=403, detail="Cannot modify system status")

    _check_name_unique(db, data.name, exclude_id=status_id)
    status.name = data.name
    db.commit()
    db.refresh(status)
    return status


def delete_status(status_id: int, db: Session):
    status = db.query(ItemStatus).filter(ItemStatus.id == status_id).first()
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")
    if status.is_system:
        raise HTTPException(status_code=403, detail="Cannot delete system status")
    db.delete(status)
    db.commit()
