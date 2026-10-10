import hashlib
import json
import logging
from typing import Optional, Dict, Any
import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger(__name__)

class CacheService:
    def __init__(self):
        self.redis_client: Optional[aioredis.Redis] = None
        self.is_connected = False
        self.backend_type = "uninitialized"

    async def initialize(self):
        """
        Attempts to connect to live Redis.
        If live Redis is unavailable, falls back to fakeredis for resilient in-memory caching.
        """
        try:
            client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=1.5,
                socket_connect_timeout=1.5
            )
            await client.ping()
            self.redis_client = client
            self.is_connected = True
            self.backend_type = "Redis Server"
            logger.info("Connected to live Redis server at %s", settings.REDIS_URL)
        except Exception as e:
            logger.warning("Could not connect to Redis server (%s). Initializing fakeredis fallback.", e)
            try:
                import fakeredis.aioredis as fake_aioredis
                self.redis_client = fake_aioredis.FakeRedis(decode_responses=True)
                self.is_connected = True
                self.backend_type = "In-Memory FakeRedis (Fallback)"
                logger.info("Fakeredis async cache initialized successfully.")
            except Exception as fe:
                logger.error("Failed to initialize fakeredis fallback: %s", fe)
                self.redis_client = None
                self.is_connected = False
                self.backend_type = "Disabled"

    async def close(self):
        if self.redis_client:
            await self.redis_client.close()

    @staticmethod
    def generate_fingerprint(resume_text: str, job_description: str) -> str:
        """
        Generates a deterministic SHA-256 fingerprint from normalized
        resume text and job description.
        """
        # Normalize whitespace and lowercase
        norm_resume = " ".join(resume_text.lower().split())
        norm_jd = " ".join(job_description.lower().split())
        payload = f"{norm_resume}::{norm_jd}".encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    def _cache_key(self, fingerprint: str) -> str:
        return f"resume_rank:{fingerprint}"

    async def get(self, fingerprint: str) -> Optional[Dict[str, Any]]:
        """Retrieve evaluation result from Redis by fingerprint."""
        if not self.redis_client:
            await self.initialize()
        if not self.redis_client or not self.is_connected:
            return None
        try:
            raw = await self.redis_client.get(self._cache_key(fingerprint))
            if raw:
                return json.loads(raw)
        except Exception as e:
            logger.warning("Error reading from cache key %s: %s", fingerprint, e)
        return None

    async def set(self, fingerprint: str, data: Dict[str, Any], ttl: Optional[int] = None) -> bool:
        """Store evaluation result in Redis with TTL (default from settings)."""
        if not self.redis_client:
            await self.initialize()
        if not self.redis_client or not self.is_connected:
            return False
        try:
            ttl_seconds = ttl if ttl is not None else settings.CACHE_TTL_SECONDS
            serialized = json.dumps(data)
            await self.redis_client.setex(self._cache_key(fingerprint), ttl_seconds, serialized)
            return True
        except Exception as e:
            logger.warning("Error saving to cache key %s: %s", fingerprint, e)
            return False

    async def delete(self, fingerprint: str) -> bool:
        """Explicitly invalidate a cached fingerprint."""
        if not self.redis_client or not self.is_connected:
            return False
        try:
            await self.redis_client.delete(self._cache_key(fingerprint))
            return True
        except Exception as e:
            logger.warning("Error deleting cache key %s: %s", fingerprint, e)
            return False

    def get_status(self) -> Dict[str, Any]:
        return {
            "connected": self.is_connected,
            "backend": self.backend_type
        }

cache_service = CacheService()
