from pydantic import BaseModel


class QRCodeDataResponse(BaseModel):
    item_id: int
    qr_data: str


class MockItemResponse(BaseModel):
    id: int
    name: str
    description: str
    qr_data: str
