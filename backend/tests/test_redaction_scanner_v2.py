import os
import tempfile

from app.ingestion.redaction_scanner import RedactionScanner


class TestRedactionScannerV2:
    def setup_method(self):
        self.scanner = RedactionScanner()

    def test_scan_with_layout_returns_dict(self):
        result = self.scanner.scan_with_layout("nonexistent.pdf")
        assert isinstance(result, dict)
        assert "ratio" in result
        assert "page_redactions" in result
        assert "bounding_boxes" in result

    def test_scan_with_layout_on_missing_file(self):
        result = self.scanner.scan_with_layout("/missing/file.pdf")
        assert result["ratio"] == 0.0
        assert result["page_redactions"] == []
        assert result["bounding_boxes"] == []

    def test_scan_backwards_compatible(self):
        ratio = self.scanner.scan("nonexistent.pdf")
        assert isinstance(ratio, float)
        assert 0.0 <= ratio <= 1.0

    def test_analyze_page_empty_image(self):
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            img_path = f.name
        try:
            page_result = self.scanner._analyze_page(img_path, 1)
            assert isinstance(page_result, dict)
            assert page_result["page"] == 1
            assert page_result["redacted_pixels"] == 0
            assert page_result["total_pixels"] == 0
            assert page_result["bounding_boxes"] == []
        finally:
            if os.path.exists(img_path):
                os.remove(img_path)
