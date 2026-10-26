import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("musicroom.actions")


class ActionLogMiddleware(BaseHTTPMiddleware):
    """Logs every request with the client's platform, device and app version.

    The mobile app is expected to send X-Platform, X-Device and X-App-Version headers.
    """

    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "%s %s -> %d (%.1fms) platform=%s device=%s app_version=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request.headers.get("x-platform", "-"),
            request.headers.get("x-device", "-"),
            request.headers.get("x-app-version", "-"),
        )
        return response
