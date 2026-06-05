from app.schemas.audit_log import AuditLogCreate
from app.services.audit_log import create_audit_log


def test_get_audit_logs_endpoint(client):
    response = client.get("/api/v1/audit-logs/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_and_fetch_audit_log(client, db):
    log_data = AuditLogCreate(
        user_id=1,
        action="ITEM_CREATED",
        item_id=123,
    )

    create_audit_log(db, log_data)

    get_response = client.get("/api/v1/audit-logs/")
    assert get_response.status_code == 200
    data = get_response.json()

    assert any(log.get("action") == "ITEM_CREATED" for log in data)
