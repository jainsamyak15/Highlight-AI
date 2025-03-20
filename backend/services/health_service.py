import asyncio
import aiohttp
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HealthService:
    def __init__(self):
        self.last_check = None
        self.is_healthy = True
        self.base_url = "https://highlight-ai.onrender.com"

    async def health_check(self):
        """Perform a health check and return status"""
        try:
            self.last_check = datetime.utcnow()
            return {
                "status": "healthy",
                "last_check": self.last_check.isoformat(),
                "uptime": "active"
            }
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            self.is_healthy = False
            return {"status": "unhealthy", "error": str(e)}

    async def keep_alive(self):
        """Periodically make requests to keep the application alive"""
        async with aiohttp.ClientSession() as session:
            while True:
                try:
                    async with session.get(f"{self.base_url}/api/health") as response:
                        if response.status == 200:
                            logger.info("Keep-alive request successful")
                        else:
                            logger.warning(f"Keep-alive request failed with status {response.status}")
                except Exception as e:
                    logger.error(f"Keep-alive request failed: {str(e)}")

                await asyncio.sleep(600)