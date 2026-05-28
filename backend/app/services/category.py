from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryTree, CategoryUpdate


def get_all(db: Session) -> list[Category]:
    return db.query(Category).all()


def get_by_id(db: Session, category_id: int) -> Category:
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Kategoria nie istnieje")
    return category


def _check_name_unique_under_parent(
    db: Session, name: str, parent_id: int | None, exclude_id: int | None = None
) -> None:
    query = db.query(Category).filter(
        Category.name == name, Category.parent_id == parent_id
    )
    if exclude_id is not None:
        query = query.filter(Category.id != exclude_id)
    if query.first():
        raise HTTPException(
            status_code=400,
            detail="Kategoria o tej nazwie, pod tym samym rodzicem już istnieje :(",
        )


def _get_all_descendant_ids(category: Category) -> set[int]:
    ids = {category.id}
    for child in category.children:
        ids |= _get_all_descendant_ids(child)
    return ids


def _check_no_cycle(db: Session, category_id: int, new_parent_id: int) -> None:
    if category_id == new_parent_id:
        raise HTTPException(
            status_code=400,
            detail="Kategoria nie może być jednocześnie swoim własnym rodzicem!",
        )
    category = db.query(Category).filter(Category.id == category_id).first()
    if category is None:
        return
    descendants = _get_all_descendant_ids(category)
    if new_parent_id in descendants:
        raise HTTPException(
            status_code=400,
            detail="Zmiana rodzica spowodowałaby cykl w drzewie kategorii",
        )


def create(db: Session, data: CategoryCreate) -> Category:
    if data.parent_id is not None:
        get_by_id(db, data.parent_id)

    _check_name_unique_under_parent(db, data.name, data.parent_id)

    category = Category(name=data.name, parent_id=data.parent_id)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update(db: Session, category_id: int, data: CategoryUpdate) -> Category:
    category = get_by_id(db, category_id)

    _check_name_unique_under_parent(
        db, data.name, data.parent_id, exclude_id=category_id
    )

    if data.parent_id is not None:
        get_by_id(db, data.parent_id)
        _check_no_cycle(db, category_id, data.parent_id)
        category.parent_id = data.parent_id

    category.name = data.name
    db.commit()
    db.refresh(category)
    return category


def delete(db: Session, category_id: int) -> None:
    category = get_by_id(db, category_id)

    if category.children:
        raise HTTPException(
            status_code=400,
            detail="Nie można usunąć kategorii, która ma podkategorie",
        )

    db.delete(category)
    db.commit()


def _build_tree(category: Category) -> CategoryTree:
    return CategoryTree(
        id=category.id,
        name=category.name,
        parent_id=category.parent_id,
        children=[_build_tree(child) for child in category.children],
    )


def get_tree(db: Session) -> list[CategoryTree]:
    roots = db.query(Category).filter(Category.parent_id == None).all()  # noqa: E711
    return [_build_tree(root) for root in roots]
