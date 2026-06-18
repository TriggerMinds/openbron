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
    def __init__(
        self,
        black_threshold: int = 40,
        white_threshold: int = 240,
        min_contour_area: int = 50,
    ):
        self.black_lower = np.array([0, 0, 0], dtype=np.uint8)
        self.black_upper = np.array([black_threshold] * 3, dtype=np.uint8)
        self.white_lower = np.array([white_threshold] * 3, dtype=np.uint8)
        self.white_upper = np.array([255, 255, 255], dtype=np.uint8)
        self.min_contour_area = min_contour_area

    def scan(self, pdf_path: str) -> float:
        result = self.scan_with_layout(pdf_path)
        return result["ratio"]

    def scan_with_layout(self, pdf_path: str) -> dict:
        logger.info("redaction_scan_started", path=pdf_path)

        total_redacted_pixels = 0
        total_page_pixels = 0
        page_redactions = []
        all_bounding_boxes = []

        try:
            pdf = pdfplumber.open(pdf_path)
        except Exception as exc:
            logger.error("redaction_scan_failed", path=pdf_path, error=str(exc))
            return {
                "ratio": 0.0,
                "page_redactions": [],
                "bounding_boxes": [],
            }

        with pdf:
            for page_num, page in enumerate(pdf.pages, start=1):
                img = page.to_image(resolution=150)
                img_path = os.path.join(
                    tempfile.mkdtemp(),
                    f"redact_page_{page_num}.png",
                )
                img.save(img_path)

                try:
                    page_result = self._analyze_page(img_path, page_num)
                    page_redactions.append(page_result)
                    total_redacted_pixels += page_result["redacted_pixels"]
                    total_page_pixels += page_result["total_pixels"]
                    all_bounding_boxes.extend(page_result["bounding_boxes"])
                finally:
                    os.remove(img_path)

        if total_page_pixels == 0:
            return {
                "ratio": 0.0,
                "page_redactions": page_redactions,
                "bounding_boxes": all_bounding_boxes,
            }

        ratio = total_redacted_pixels / total_page_pixels
        logger.info("redaction_scan_completed",
                    path=pdf_path,
                    page_count=len(page_redactions),
                    redaction_ratio=round(ratio, 4))

        return {
            "ratio": round(ratio, 4),
            "page_redactions": page_redactions,
            "bounding_boxes": all_bounding_boxes,
        }

    def _analyze_page(self, image_path: str, page_num: int) -> dict:
        img = cv2.imread(image_path, cv2.IMREAD_COLOR)
        if img is None:
            return {
                "page": page_num,
                "redacted_pixels": 0,
                "total_pixels": 0,
                "bounding_boxes": [],
            }

        height, width = img.shape[:2]
        total_pixels = height * width

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        black_mask = cv2.inRange(gray, 0, self.black_upper[0])

        white_mask = cv2.inRange(gray, self.white_lower[0], 255)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        variance = cv2.Laplacian(blur, cv2.CV_64F)
        variance = cv2.convertScaleAbs(variance)
        low_var_mask = cv2.threshold(variance, 10, 255, cv2.THRESH_BINARY_INV)[1]
        whiteout_mask = cv2.bitwise_and(white_mask, low_var_mask)

        combined_mask = cv2.bitwise_or(black_mask, whiteout_mask)

        redacted_pixels = cv2.countNonZero(combined_mask)

        bounding_boxes = []
        contours, _ = cv2.findContours(
            combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area >= self.min_contour_area:
                x, y, w, h = cv2.boundingRect(cnt)
                bounding_boxes.append((int(x), int(y), int(w), int(h)))

        return {
            "page": page_num,
            "redacted_pixels": redacted_pixels,
            "total_pixels": total_pixels,
            "bounding_boxes": bounding_boxes,
        }
