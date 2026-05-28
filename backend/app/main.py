from fastapi import FastAPI

from app.api.v1.router import api_router

app = FastAPI(title="Inventory System API")

app.include_router(api_router)


@app.get("/")
async def root():
    return {"message": "Inventory System API is running"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}
