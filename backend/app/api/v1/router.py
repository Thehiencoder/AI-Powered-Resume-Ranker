from fastapi import APIRouter
from app.api.v1.endpoints import rank, health

api_router = APIRouter()
api_router.include_router(rank.router, tags=["Resume Ranker"])
api_router.include_router(health.router, tags=["System Health & Cache"])
