from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from typing import Any, Optional

from app.config import settings
from app.logging_config import get_logger

logger = get_logger(__name__)


class VectorStore:
    def __init__(self):
        self.engine = create_async_engine(settings.database_url, echo=False, pool_size=5)
        self.async_session = async_sessionmaker(
            self.engine, class_=AsyncSession, expire_on_commit=False
        )

    async def store_chunk_embedding(
        self,
        chunk_id: int,
        embedding: list[float],
    ) -> None:
        async with self.async_session() as session:
            stmt = (
                text("UPDATE document_chunks SET embedding = :embedding WHERE id = :id")
                .bindparams(embedding=embedding, id=chunk_id)
            )
            await session.execute(stmt)
            await session.commit()

    async def hybrid_search(
        self,
        query_text: str,
        query_embedding: list[float],
        limit: int = 20,
        offset: int = 0,
        source_filter: Optional[str] = None,
        org_filter: Optional[str] = None,
        min_date: Optional[str] = None,
        max_date: Optional[str] = None,
        min_redaction: Optional[float] = None,
        max_redaction: Optional[float] = None,
        entity_filter: Optional[list[str]] = None,
        entity_type: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        conditions = ["1=1"]
        params: dict[str, Any] = {
            "query_embedding": str(query_embedding),
            "limit": limit,
            "offset": offset,
        }

        if source_filter:
            conditions.append("d.source = :source_filter")
            params["source_filter"] = source_filter
        if org_filter:
            conditions.append("d.organization = :org_filter")
            params["org_filter"] = org_filter
        if min_date:
            conditions.append("d.publication_date >= :min_date")
            params["min_date"] = min_date
        if max_date:
            conditions.append("d.publication_date <= :max_date")
            params["max_date"] = max_date
        if min_redaction is not None:
            conditions.append("d.redaction_ratio >= :min_redaction")
            params["min_redaction"] = min_redaction
        if max_redaction is not None:
            conditions.append("d.redaction_ratio <= :max_redaction")
            params["max_redaction"] = max_redaction
        if entity_filter:
            conditions.append("d.metadata IS NOT NULL")
            for i, name in enumerate(entity_filter):
                key = f"entity_name_{i}"
                conditions.append(f"d.metadata->'extracted_entities' @> :{key}::jsonb")
                params[key] = str([{"name": name}])
        if entity_type:
            conditions.append("d.metadata->'extracted_entities' @> :entity_type_val::jsonb")
            params["entity_type_val"] = str([{"type": entity_type}])

        where_clause = " AND ".join(conditions)

        sql = f"""
            WITH vector_scores AS (
                SELECT
                    dc.id AS chunk_id,
                    dc.document_id,
                    dc.chunk_index,
                    dc.page_number,
                    dc.content,
                    dc.embedding <=> :query_embedding::vector AS vector_distance
                FROM document_chunks dc
                WHERE dc.embedding IS NOT NULL
            ),
            bm25_scores AS (
                SELECT
                    dc.id AS chunk_id,
                    ts_rank(
                        to_tsvector('dutch', dc.content),
                        plainto_tsquery('dutch', :query_text)
                    ) AS bm25_score
                FROM document_chunks dc
            )
            SELECT
                vs.document_id,
                d.title,
                d.source,
                d.source_url,
                d.pdf_url,
                d.publication_date,
                d.organization,
                d.redaction_ratio,
                d.metadata,
                vs.chunk_id,
                vs.chunk_index,
                vs.page_number,
                vs.content,
                vs.vector_distance,
                COALESCE(bs.bm25_score, 0) AS bm25_score,
                (
                    COALESCE(bs.bm25_score, 0) * 0.5
                    + (1 - vs.vector_distance) * 0.5
                ) AS combined_score
            FROM vector_scores vs
            LEFT JOIN bm25_scores bs ON vs.chunk_id = bs.chunk_id
            JOIN documents d ON vs.document_id = d.id
            WHERE {where_clause}
            ORDER BY combined_score DESC
            LIMIT :limit OFFSET :offset
        """

        params["query_text"] = query_text

        async with self.async_session() as session:
            result = await session.execute(text(sql), params)
            rows = result.fetchall()

        logger.info("hybrid_search_completed",
                    query=query_text,
                    result_count=len(rows))

        return [dict(row._mapping) for row in rows]
