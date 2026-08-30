from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.handoffs import router as handoffs_router

app = FastAPI(title="myStudy technical exercise")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(handoffs_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
