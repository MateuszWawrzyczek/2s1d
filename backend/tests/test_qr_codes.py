from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_generate_qr_data_success():
    response = client.get("/api/v1/qr-codes/1/generate-data")
    assert response.status_code == 200
    assert response.json()["qr_data"] == "ITEM-QR-1"


def test_generate_qr_data_not_found():
    response = client.get("/api/v1/qr-codes/999/generate-data")
    assert response.status_code == 404


def test_scan_qr_code_success():
    response = client.get("/api/v1/qr-codes/scan/ITEM-QR-1")
    assert response.status_code == 200
    assert response.json()["name"] == "Laptop Dell"


def test_scan_qr_code_invalid_format():
    response = client.get("/api/v1/qr-codes/scan/ZLY-KOD-123")
    assert response.status_code == 400


def test_scan_qr_code_not_found():
    response = client.get("/api/v1/qr-codes/scan/ITEM-QR-999")
    assert response.status_code == 404
