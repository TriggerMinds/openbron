import os
import tempfile
from typing import Optional

import pdfplumber
from pdfplumber.page import Page

from app.scrapers.proxy import StealthSession
from app.logging_config import get_logger

logger = get_logger(__name__)


class PDFProcessor:
    def __init__(self, work_dir: Optional[str] = None):
        self.work_dir = work_dir or tempfile.mkdtemp(prefix="openbron_pdf_")
        self.session = StealthSession()

    def download_pdf(self, url: str, document_id: int) -> str:
        pdf_path = os.path.join(self.work_dir, f"{document_id}.pdf")

        logger.info("pdf_download_started", document_id=document_id, url=url)

        response = self.session.get(url)
        with open(pdf_path, "wb") as f:
            f.write(response.content)

        file_size = os.path.getsize(pdf_path)
        logger.info("pdf_download_completed",
                    document_id=document_id,
                    file_size=file_size)

        return pdf_path

    def extract_text(self, pdf_path: str) -> dict[int, str]:
        text_by_page: dict[int, str] = {}

        logger.info("pdf_text_extraction_started", path=pdf_path)

        try:
            pdf = pdfplumber.open(pdf_path)
        except Exception as exc:
            logger.error("pdf_open_failed", path=pdf_path, error=str(exc))
            return {}

        with pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""

                if not text.strip():
                    text = self._ocr_page(pdf_path, page_num, page)

                text_by_page[page_num] = text

        logger.info("pdf_text_extraction_completed",
                    path=pdf_path,
                    page_count=len(text_by_page))

        return text_by_page

    def _ocr_page(self, pdf_path: str, page_num: int, page: Page) -> str:
        if page is None:
            return ""
        from app.ingestion.ocr_engine import OCREngine
        engine = OCREngine()
        image = page.to_image(resolution=300)
        image_path = os.path.join(self.work_dir, f"page_{page_num}.png")
        image.save(image_path)
        text = engine.extract_text(image_path)
        os.remove(image_path)
        return text
