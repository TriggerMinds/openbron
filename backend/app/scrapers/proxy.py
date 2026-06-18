from curl_cffi import requests
from typing import Optional
import random
import time

from app.config import settings
from app.logging_config import get_logger

logger = get_logger(__name__)

USER_AGENTS = [
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
]


class StealthSession:
    def __init__(self, impersonate: str = "chrome120"):
        self.impersonate = impersonate
        self._session: Optional[requests.Session] = None

    def _get_session(self) -> requests.Session:
        if self._session is None:
            self._session = requests.Session()
        return self._session

    def request(
        self,
        method: str,
        url: str,
        **kwargs,
    ) -> requests.Response:
        session = self._get_session()
        kwargs.setdefault("impersonate", self.impersonate)
        kwargs.setdefault("proxies", {"all": settings.proxy_url})
        kwargs.setdefault("timeout", 30)
        kwargs.setdefault("headers", {
            "Accept": (
                "text/html,application/xhtml+xml,"
                "application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
            ),
            "Accept-Language": "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
        })

        delay = random.uniform(1.0, 3.0)
        time.sleep(delay)

        logger.info("http_request", method=method, url=url)

        try:
            response = session.request(method, url, **kwargs)
            response.raise_for_status()
            logger.info("http_response",
                        url=url,
                        status=response.status_code,
                        size=len(response.content))
            return response
        except Exception as exc:
            logger.error("http_request_failed", url=url, error=str(exc))
            raise

    def get(self, url: str, **kwargs) -> requests.Response:
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs) -> requests.Response:
        return self.request("POST", url, **kwargs)
