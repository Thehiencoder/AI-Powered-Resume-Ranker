from fastapi import APIRouter
from app.services.cache_service import cache_service
from app.config import settings
from app.models.schemas import HealthResponse

router = APIRouter()

@router.get("/health", response_model=HealthResponse, summary="System health status")
async def health_check():
    status_info = cache_service.get_status()
    has_openai = bool(settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("sk-your-"))
    return HealthResponse(
        status="ok",
        redis_connected=status_info["connected"],
        redis_backend=status_info["backend"],
        openai_configured=has_openai,
        model=settings.OPENAI_MODEL
    )

@router.delete("/cache/{fingerprint}", summary="Invalidate specific cache entry")
async def invalidate_cache(fingerprint: str):
    success = await cache_service.delete(fingerprint)
    return {"fingerprint": fingerprint, "invalidated": success}
