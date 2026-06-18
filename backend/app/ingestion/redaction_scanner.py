import cv2
import numpy as np
import tempfile
import os

import pdfplumber

from app.logging_config import get_logger

logger = get_logger(__name__)

BLACK_LOWER = np.array([0, 0, 0], dtype=np.uint8)
BLACK_UPPER = np.array([40, 40, 40], dtype=np.uint8)


class RedactionScanner:
    def __init__(self, black_threshold: int = 40):
        self.black_lower = np.array([0, 0, 0], dtype=np.uint8)
        self.black_upper = np.array([black_threshold] * 3, dtype=np.uint8)

    def scan(self, pdf_path: str) -> float:
        logger.info("redaction_scan_started", path=pdf_path)

        total_redacted_pixels = 0
        total_page_pixels = 0
        page_count = 0

        try:
            pdf = pdfplumber.open(pdf_path)
        except Exception as exc:
            logger.error("redaction_scan_failed", path=pdf_path, error=str(exc))
            return 0.0

        with pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                img = page.to_image(resolution=150)
                img_path = os.path.join(
                    tempfile.mkdtemp(),
                    f"redact_page_{page_num}.png",
                )
                img.save(img_path)

                try:
                    redacted_pixels, page_pixels = self._analyze_page(img_path)
                    total_redacted_pixels += redacted_pixels
                    total_page_pixels += page_pixels
                    page_count += 1
                finally:
                    os.remove(img_path)

        if total_page_pixels == 0:
            return 0.0

        ratio = total_redacted_pixels / total_page_pixels
        logger.info("redaction_scan_completed",
                    path=pdf_path,
                    page_count=page_count,
                    redaction_ratio=round(ratio, 4))

        return round(ratio, 4)

    def _analyze_page(self, image_path: str) -> tuple[int, int]:
        img = cv2.imread(image_path, cv2.IMREAD_COLOR)
        if img is None:
            return 0, 0

        height, width = img.shape[:2]
        total_pixels = height * width

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, threshold = cv2.threshold(gray, 30, 255, cv2.THRESH_BINARY)

        mask = cv2.inRange(gray, 0, 40)

        redacted_pixels = cv2.countNonZero(mask)

        return redacted_pixels, total_pixels
