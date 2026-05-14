from fastapi import FastAPI

app = FastAPI(title="Inventory System API")

@app.get("/")
async def root():
    return {"message": "Inventory System API is running"}