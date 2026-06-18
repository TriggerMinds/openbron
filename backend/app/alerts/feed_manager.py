from datetime import datetime, timezone
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.db.models import Document, Feed
from app.logging_config import get_logger
from app.alerts.notification import NotificationService

logger = get_logger(__name__)

SYNC_DATABASE_URL = settings.database_url.replace("+asyncpg", "").replace("+asyncmy", "")


class FeedManager:
    def __init__(self):
        self.engine = create_engine(SYNC_DATABASE_URL, pool_pre_ping=True)
        self.Session = sessionmaker(bind=self.engine)
        self.notifier = NotificationService()

    def check_all(self) -> list[dict[str, Any]]:
        triggered: list[dict[str, Any]] = []
        session = self.Session()

        try:
            feeds = session.query(Feed).filter(Feed.is_active.is_(True)).all()

            for feed in feeds:
                matches = self._check_feed(session, feed)
                if matches:
                    for doc in matches:
                        self._record_match(session, feed.id, doc.id)
                        self.notifier.send_notification(feed, doc)
                    triggered.append({
                        "feed_id": feed.id,
                        "feed_name": feed.name,
                        "match_count": len(matches),
                    })

                feed.last_checked_at = datetime.now(timezone.utc)
                session.commit()

            logger.info("feed_check_completed",
                        feed_count=len(feeds),
                        triggered_count=len(triggered))

        finally:
            session.close()

        return triggered

    def _check_feed(self, session: Session, feed: Feed) -> list[Document]:
        subq = f"(SELECT fd.document_id FROM feed_documents fd WHERE fd.feed_id = {feed.id})"
        conditions = [f"d.id NOT IN {subq}"]

        if feed.filters:
            filters = feed.filters
            if filters.get("source"):
                conditions.append(f"d.source = '{filters['source']}'")
            if filters.get("organization"):
                conditions.append(f"d.organization = '{filters['organization']}'")
            if filters.get("min_redaction") is not None:
                conditions.append(f"d.redaction_ratio >= {filters['min_redaction']}")
            if filters.get("max_redaction") is not None:
                conditions.append(f"d.redaction_ratio <= {filters['max_redaction']}")

        where = " AND ".join(conditions)
        query_text = feed.query.replace("'", "''")

        sql = f"""
            SELECT d.* FROM documents d
            WHERE {where}
            AND (
                d.title ILIKE '%{query_text}%'
                OR d.summary ILIKE '%{query_text}%'
                OR EXISTS (
                    SELECT 1 FROM document_chunks dc
                    WHERE dc.document_id = d.id
                    AND dc.content ILIKE '%{query_text}%'
                )
            )
            ORDER BY d.publication_date DESC
            LIMIT 50
        """

        result = session.execute(text(sql))
        return [row for row in result.fetchall()]
