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

    def test_analyze_page_returns_tuple(self):
        result = self.scanner._analyze_page("nonexistent.png")
        assert isinstance(result, tuple)
        assert len(result) == 2
        assert all(isinstance(v, int) for v in result)

    def test_analyze_page_empty_image(self):
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            img_path = f.name

        try:
            redacted, total = self.scanner._analyze_page(img_path)
            assert redacted == 0
            assert total == 0
        finally:
            if os.path.exists(img_path):
                os.remove(img_path)
