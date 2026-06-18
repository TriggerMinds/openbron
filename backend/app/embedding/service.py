import asyncio
from typing import Any

from app.config import settings
from app.logging_config import get_logger
from app.db.vector_store import VectorStore

logger = get_logger(__name__)


class EmbeddingService:
    def __init__(self):
        self.vector_store = VectorStore()
        self._model = None
        self._openai_client = None

    def _get_model(self):
        if settings.embedding_provider == "openai":
            if self._openai_client is None:
                from openai import AsyncOpenAI
                self._openai_client = AsyncOpenAI(
                    api_key=settings.embedding_api_key,
                    base_url=settings.embedding_endpoint,
                )
            return self._openai_client
        else:
            if self._model is None:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(
                    settings.embedding_model,
                    trust_remote_code=True,
                )
            return self._model

    async def _embed_openai(self, texts: list[str]) -> list[list[float]]:
        client = self._get_model()
        response = await client.embeddings.create(
            model=settings.embedding_model,
            input=texts,
        )
        return [item.embedding for item in response.data]

    def _embed_local(self, texts: list[str]) -> list[list[float]]:
        model = self._get_model()
        embeddings = model.encode(texts, show_progress_bar=False)
        return embeddings.tolist()

    async def generate_embedding(self, text: str) -> list[float]:
        if settings.embedding_provider == "openai":
            return (await self._embed_openai([text]))[0]
        else:
            return self._embed_local([text])[0]

    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        if settings.embedding_provider == "openai":
            return await self._embed_openai(texts)
        else:
            return self._embed_local(texts)

    def store_embeddings(self, document_id: int, chunks: list[dict[str, Any]]) -> None:
        asyncio.run(self._store_embeddings_async(document_id, chunks))

    async def _store_embeddings_async(
        self,
        document_id: int,
        chunks: list[dict[str, Any]],
    ) -> None:
        texts = [chunk["content"] for chunk in chunks]
        embeddings = await self.generate_embeddings(texts)

        for chunk, embedding in zip(chunks, embeddings):
            chunk_id = chunk.get("id")
            if chunk_id:
                await self.vector_store.store_chunk_embedding(chunk_id, embedding)

        logger.info("embeddings_stored",
                    document_id=document_id,
                    chunk_count=len(chunks))
