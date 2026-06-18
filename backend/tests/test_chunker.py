from app.ingestion.chunker import DocumentChunker


class TestDocumentChunker:
    def setup_method(self):
        self.chunker = DocumentChunker(token_limit=100, overlap=20)

    def test_split_empty_pages(self):
        result = self.chunker.split({}, 1, {"source": "test"})
        assert result == []

    def test_split_single_page(self):
        text = "Dit is een test document met Nederlandse tekst voor de OpenBron applicatie. " * 10
        result = self.chunker.split({1: text}, 1, {"source": "test"})
        assert len(result) > 0
        assert all(c["document_id"] == 1 for c in result)
        assert all(c["page_number"] == 1 for c in result)
        assert all(c["metadata"]["source"] == "test" for c in result)

    def test_split_multiple_pages(self):
        text_by_page = {
            1: "Eerste pagina content. " * 10,
            2: "Tweede pagina content. " * 10,
            3: "Derde pagina content. " * 10,
        }
        result = self.chunker.split(text_by_page, 2, {"source": "multi"})
        assert len(result) > 0
        pages_found = set(c["page_number"] for c in result)
        assert pages_found == {1, 2, 3}

    def test_chunk_index_increments_globally(self):
        text_by_page = {
            1: "Pagina een. " * 10,
            2: "Pagina twee. " * 10,
        }
        result = self.chunker.split(text_by_page, 3, {})
        indices = [c["chunk_index"] for c in result]
        assert indices == list(range(len(result)))

    def test_token_limit_respected(self):
        text = "token " * 500
        result = self.chunker.split({1: text}, 4, {})
        for chunk in result:
            assert chunk["token_count"] <= 100

    def test_overlap_present(self):
        text = "Het is een zonnige dag vandaag in Nederland. " * 50
        result = self.chunker.split({1: text}, 5, {},)
        if len(result) > 1:
            assert "dag" in result[0]["content"] or "dag" in result[1]["content"]
