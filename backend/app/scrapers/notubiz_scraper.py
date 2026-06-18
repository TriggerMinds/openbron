from typing import Any
import time
import random
from urllib.parse import urlparse

from app.scrapers.proxy import StealthSession
from app.logging_config import get_logger

logger = get_logger(__name__)


class NotubizScraper:
    BASE_URL = "https://notubiz.nl"

    def __init__(self):
        self.session = StealthSession()

    def fetch(self, municipality_url: str = "", page: int = 1) -> list[dict[str, Any]]:
        api_url = f"{municipality_url.rstrip('/')}/api/2/meetings"
        params = {
            "page": page,
            "pageSize": 50,
            "order": "date_desc",
        }

        response = self.session.get(api_url, params=params)
        data = response.json()
        meetings = data.get("results", data.get("data", []))

        documents = []
        for meeting in meetings:
            meeting_id = meeting.get("id", "")
            meeting_date = meeting.get("date", "")
            meeting_title = meeting.get("title", "")

            documents_response = self.session.get(
                f"{municipality_url.rstrip('/')}/api/2/meetings/{meeting_id}/documents"
            )
            docs_data = documents_response.json()
            docs = docs_data.get("results", docs_data.get("data", []))

            for doc in docs:
                pdf_url = doc.get("url", "")
                if not pdf_url.lower().endswith(".pdf"):
                    continue

                documents.append({
                    "id": doc.get("id", meeting_id),
                    "pdf_url": pdf_url,
                    "metadata": {
                        "title": doc.get("title", meeting_title),
                        "source": "notubiz",
                        "source_url": f"{municipality_url}/meetings/{meeting_id}",
                        "publication_date": meeting_date,
                        "organization": urlparse(municipality_url).hostname or "",
                        "type": "meeting_document",
                        "meeting_id": str(meeting_id),
                    },
                })

            delay = random.uniform(1.0, 2.0)
            time.sleep(delay)

        logger.info("notubiz_scraper_fetched",
                    municipality=municipality_url,
                    page=page,
                    count=len(documents))

        return documents
