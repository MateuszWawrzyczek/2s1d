from fastapi import APIRouter, HTTPException

from app.schemas.qr_code import MockItemResponse, QRCodeDataResponse

router = APIRouter()

MOCK_ITEMS = {
    1: {"id": 1, "name": "Laptop Dell", "description": "Służbowy laptop"},
    2: {"id": 2, "name": "Projektor Epson", "description": "Rzutnik"},
}

PREFIX = "ITEM-QR-"


@router.get("/{item_id}/generate-data", response_model=QRCodeDataResponse)
def get_qr_data_for_item(item_id: int):
    """
    Pobiera dane potrzebne do wygenerowania kodu QR dla przedmiotu.
    Frontend użyje tekstu 'qr_data', by narysować obrazek kodu QR.
    """
    if item_id not in MOCK_ITEMS:
        raise HTTPException(status_code=404, detail="Przedmiot nie istnieje.")

    return QRCodeDataResponse(item_id=item_id, qr_data=f"{PREFIX}{item_id}")


@router.get("/scan/{qr_data}", response_model=MockItemResponse)
def scan_qr_code(qr_data: str):
    """
    Wyszukuje przedmiot po zeskanowanym identyfikatorze z kodu QR.
    Zwraca szczegóły przedmiotu lub czytelny błąd.
    """
    if not qr_data.startswith(PREFIX):
        raise HTTPException(status_code=400, detail="Niepoprawny format kodu QR.")

    try:
        # Wyciągamy ID z tekstu np. "ITEM-QR-1" -> "1"
        item_id_str = qr_data.replace(PREFIX, "")
        item_id = int(item_id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Błędny ID w kodzie QR.")

    if item_id not in MOCK_ITEMS:
        raise HTTPException(status_code=404, detail="Nieznany przedmiot z QR.")

    item_info = MOCK_ITEMS[item_id]
    return MockItemResponse(
        id=item_info["id"],
        name=item_info["name"],
        description=item_info["description"],
        qr_data=qr_data,
    )
