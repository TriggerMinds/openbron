import os
import tempfile

from app.ingestion.redaction_scanner import RedactionScanner


class TestRedactionScanner:
    def setup_method(self):
        self.scanner = RedactionScanner()

    def test_empty_pdf_returns_zero(self):
        result = self.scanner.scan("nonexistent.pdf")
        assert result == 0.0

    def test_ratio_is_float_between_zero_and_one(self):
        result = self.scanner.scan("nonexistent.pdf")
        assert isinstance(result, float)
        assert 0.0 <= result <= 1.0

    def test_analyze_page_returns_dict(self):
        result = self.scanner._analyze_page("nonexistent.png", 1)
        assert isinstance(result, dict)
        assert "page" in result
        assert "redacted_pixels" in result
        assert "total_pixels" in result
        assert "bounding_boxes" in result

    def test_analyze_page_empty_image(self):
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            img_path = f.name

        try:
            result = self.scanner._analyze_page(img_path, 1)
            assert result["page"] == 1
            assert result["redacted_pixels"] == 0
            assert result["total_pixels"] == 0
        finally:
            if os.path.exists(img_path):
                os.remove(img_path)
