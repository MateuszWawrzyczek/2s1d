from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.category import (
    CategoryCreate,
    CategoryResponse,
    CategoryTree,
    CategoryUpdate,
)
from app.services import category as service

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return service.get_all(db)


@router.get("/tree", response_model=list[CategoryTree])
def get_tree(db: Session = Depends(get_db)):
    return service.get_tree(db)


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(category_id: int, db: Session = Depends(get_db)):
    return service.get_by_id(db, category_id)


@router.post("/", response_model=CategoryResponse, status_code=201)
def create_category(data: CategoryCreate, db: Session = Depends(get_db)):
    return service.create(db, data)


@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int, data: CategoryUpdate, db: Session = Depends(get_db)
):
    return service.update(db, category_id, data)


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    service.delete(db, category_id)
