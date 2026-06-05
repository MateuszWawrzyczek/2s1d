from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogCreate


def create_audit_log(db: Session, log_in: AuditLogCreate) -> AuditLog:
    db_log = AuditLog(
        user_id=log_in.user_id,
        action=log_in.action,
        item_id=log_in.item_id,
        old_value=log_in.old_value,
        new_value=log_in.new_value,
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


def get_audit_logs(db: Session, skip: int = 0, limit: int = 100) -> list[AuditLog]:
    return (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
