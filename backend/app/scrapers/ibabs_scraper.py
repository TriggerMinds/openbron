from typing import Any
import time
import random
from urllib.parse import urlparse

from app.scrapers.proxy import StealthSession
from app.logging_config import get_logger

logger = get_logger(__name__)


class IbabsScraper:
    BASE_URL = "https://ibabs.eu"

    def __init__(self):
        self.session = StealthSession()

    def fetch(self, municipality_url: str = "", page: int = 1) -> list[dict[str, Any]]:
        api_url = f"{municipality_url.rstrip('/')}/api/v1/agendas"
        params = {
            "page": page,
            "pageSize": 50,
            "sort": "date_desc",
        }

        response = self.session.get(api_url, params=params)
        data = response.json()
        agendas = data.get("data", data.get("results", []))

        documents = []
        for agenda in agendas:
            agenda_id = agenda.get("id", "")
            agenda_date = agenda.get("date", "")
            agenda_title = agenda.get("title", "")

            items_response = self.session.get(
                f"{municipality_url.rstrip('/')}/api/v1/agendas/{agenda_id}/items"
            )
            items_data = items_response.json()
            items = items_data.get("data", items_data.get("results", []))

            for item in items:
                media_url = (
                    item.get("videoUrl")
                    or item.get("recordingUrl")
                    or item.get("mediaUrl")
                    or ""
                )
                for attachment in item.get("attachments", []):
                    pdf_url = attachment.get("url", "")
                    if not pdf_url.lower().endswith(".pdf"):
                        continue

                    documents.append({
                        "id": attachment.get("id", agenda_id),
                        "pdf_url": pdf_url,
                        "audio_url": media_url,
                        "metadata": {
                            "title": attachment.get("title", item.get("title", agenda_title)),
                            "source": "ibabs",
                            "source_url": f"{municipality_url}/agendas/{agenda_id}",
                            "publication_date": agenda_date,
                            "organization": urlparse(municipality_url).hostname or "",
                            "type": "agenda_item",
                            "agenda_id": str(agenda_id),
                            "item_number": item.get("number", ""),
                            "media_url": media_url,
                        },
                    })

            delay = random.uniform(1.0, 2.0)
            time.sleep(delay)

        logger.info("ibabs_scraper_fetched",
                    municipality=municipality_url,
                    page=page,
                    count=len(documents))

        return documents
