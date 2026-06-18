import subprocess
import os

from app.config import settings
from app.logging_config import get_logger

logger = get_logger(__name__)


class OCREngine:
    def __init__(self):
        self.tesseract_path = settings.tesseract_path
        self._check_tesseract()

    def _check_tesseract(self) -> None:
        if not os.path.exists(self.tesseract_path):
            logger.warning("tesseract_not_found", path=self.tesseract_path)

    def extract_text(self, image_path: str, lang: str = "nld+eng") -> str:
        logger.info("ocr_started", image_path=image_path, lang=lang)

        try:
            result = subprocess.run(
                [self.tesseract_path, image_path, "stdout", "-l", lang, "--psm", "6"],
                capture_output=True,
                text=True,
                timeout=120,
            )

            if result.returncode != 0:
                logger.error("ocr_failed",
                             image_path=image_path,
                             stderr=result.stderr)
                return ""

            text = result.stdout.strip()
            logger.info("ocr_completed",
                        image_path=image_path,
                        text_length=len(text))

            return text

        except subprocess.TimeoutExpired:
            logger.error("ocr_timeout", image_path=image_path)
            return ""
        except FileNotFoundError:
            logger.error("tesseract_missing", path=self.tesseract_path)
            return ""
