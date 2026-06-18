from typing import Any
import time
import random

from app.scrapers.proxy import StealthSession
from app.logging_config import get_logger

logger = get_logger(__name__)


class WooScraper:
    BASE_URL = "https://open.overheid.nl"

    def __init__(self):
        self.session = StealthSession()

    def fetch(self, query: str = "", page: int = 1, page_size: int = 20) -> list[dict[str, Any]]:
        params = {
            "q": query or "woo",
            "page": page,
            "pageSize": page_size,
            "sort": "date_desc",
            "type": "document",
        }

        response = self.session.get(
            f"{self.BASE_URL}/api/v1/documents",
            params=params,
        )
        data = response.json()
        results = data.get("results", [])

        documents = []
        for item in results:
            doc_id = item.get("id", "")
            pdf_url = None
            for file in item.get("files", []):
                if file.get("mimeType") == "application/pdf":
                    pdf_url = file.get("url")
                    break

            if not pdf_url:
                continue

            documents.append({
                "id": doc_id,
                "pdf_url": pdf_url,
                "metadata": {
                    "title": item.get("title", ""),
                    "source": "openoverheid",
                    "source_url": item.get("url", ""),
                    "publication_date": item.get("publicationDate", ""),
                    "organization": item.get("organization", ""),
                    "type": item.get("type", ""),
                    "summary": item.get("summary", ""),
                },
            })

            delay = random.uniform(0.5, 1.5)
            time.sleep(delay)

        logger.info("woo_scraper_fetched",
                    query=query,
                    page=page,
                    count=len(documents))

        return documents
