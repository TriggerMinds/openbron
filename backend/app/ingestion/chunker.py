from typing import Any
import tiktoken

from app.logging_config import get_logger

logger = get_logger(__name__)

TOKEN_LIMIT = 500
OVERLAP_TOKENS = 50
ENCODER_MODEL = "cl100k_base"


class DocumentChunker:
    def __init__(self, token_limit: int = TOKEN_LIMIT, overlap: int = OVERLAP_TOKENS):
        self.token_limit = token_limit
        self.overlap = overlap
        self.encoder = tiktoken.get_encoding(ENCODER_MODEL)

    def split(
        self,
        text_by_page: dict[int, str],
        document_id: int,
        metadata: dict[str, Any],
    ) -> list[dict[str, Any]]:
        chunks: list[dict[str, Any]] = []
        global_chunk_index = 0

        for page_num in sorted(text_by_page.keys()):
            text = text_by_page[page_num]
            tokens = self.encoder.encode(text)
            total_tokens = len(tokens)

            if total_tokens == 0:
                continue

            start = 0
            while start < total_tokens:
                end = min(start + self.token_limit, total_tokens)
                chunk_tokens = tokens[start:end]
                chunk_text = self.encoder.decode(chunk_tokens)

                chunks.append({
                    "document_id": document_id,
                    "chunk_index": global_chunk_index,
                    "page_number": page_num,
                    "content": chunk_text,
                    "token_count": len(chunk_tokens),
                    "metadata": metadata,
                })

                global_chunk_index += 1

                if end >= total_tokens:
                    break

                start = end - self.overlap

        logger.info("document_chunked",
                    document_id=document_id,
                    chunk_count=len(chunks))

        return chunks
