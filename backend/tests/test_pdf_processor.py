import pytest
import os
import tempfile

from app.ingestion.pdf_processor import PDFProcessor


class TestPDFProcessor:
    def setup_method(self):
        self.temp_dir = tempfile.mkdtemp()
        self.processor = PDFProcessor(self.temp_dir)

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_init_creates_work_dir(self):
        assert os.path.isdir(self.processor.work_dir)

    def test_download_pdf_invalid_url(self):
        with pytest.raises(Exception):
            self.processor.download_pdf("https://invalid.url/test.pdf", 1)

    def test_extract_text_nonexistent_pdf(self):
        result = self.processor.extract_text("/nonexistent/file.pdf")
        assert result == {}

    def test_ocr_page_empty(self):
        result = self.processor._ocr_page("nonexistent.pdf", 1, None)
        assert result == ""
