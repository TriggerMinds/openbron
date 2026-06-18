from celery import Celery
from celery.exceptions import MaxRetriesExceededError
import tempfile
import shutil

from app.config import settings
from app.logging_config import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)

app = Celery("openbron")
app.config_from_object("celery_config")

logger.info("celery_app_initialized", broker=settings.celery_broker_url)


@app.task(bind=True, max_retries=settings.celery_task_max_retries, acks_late=True)
def ingest_document(self, document_id: int, pdf_url: str, metadata: dict) -> dict:
    temp_dir = tempfile.mkdtemp(prefix="openbron_ingest_")
    try:
        logger.info("ingest_document_started", document_id=document_id, pdf_url=pdf_url)

        from app.ingestion.pdf_processor import PDFProcessor
        from app.ingestion.redaction_scanner import RedactionScanner
        from app.ingestion.chunker import DocumentChunker
        from app.ingestion.ner_service import NERService

        processor = PDFProcessor(temp_dir)
        pdf_path = processor.download_pdf(pdf_url, document_id)

        scanner = RedactionScanner()
        scan_result = scanner.scan_with_layout(pdf_path)

        text_by_page = processor.extract_text(pdf_path)

        ner = NERService()
        all_entities = {"PER": [], "ORG": [], "GPE": []}
        entities_by_page: dict[int, dict[str, list[str]]] = {}
        for page_num in sorted(text_by_page.keys()):
            text = text_by_page[page_num]
            page_entities = ner.extract_entities(text)
            entities_by_page[page_num] = page_entities
            for label in ("PER", "ORG", "GPE"):
                all_entities[label].extend(page_entities[label])

        for label in ("PER", "ORG", "GPE"):
            all_entities[label] = list(dict.fromkeys(all_entities[label]))

        enriched_metadata = {
            **metadata,
            "redaction_layout": scan_result,
            "extracted_entities": all_entities,
        }

        chunker = DocumentChunker()
        chunks = chunker.split(text_by_page, document_id, enriched_metadata)

        for chunk in chunks:
            page_num = chunk["page_number"]
            if page_num in entities_by_page:
                chunk["entities"] = entities_by_page[page_num]

        generate_embeddings.delay(document_id, chunks)

        logger.info("ingest_document_completed",
                    document_id=document_id,
                    page_count=len(text_by_page),
                    chunk_count=len(chunks),
                    redaction_ratio=scan_result["ratio"])

        return {
            "document_id": document_id,
            "redaction_ratio": scan_result["ratio"],
            "page_count": len(text_by_page),
            "chunk_count": len(chunks),
        }

    except Exception as exc:
        logger.error("ingest_document_failed",
                     document_id=document_id,
                     error=str(exc),
                     attempt=self.request.retries)
        try:
            raise self.retry(exc=exc, countdown=2 ** self.request.retries * 60)
        except MaxRetriesExceededError:
            logger.error("ingest_document_dlq",
                         document_id=document_id,
                         error=str(exc),
                         job_id=self.request.id)
            return {"document_id": document_id, "status": "failed", "error": str(exc)}

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@app.task(bind=True, max_retries=settings.celery_task_max_retries, acks_late=True)
def scrape_source(self, source_type: str, source_url: str) -> list:
    try:
        logger.info("scrape_source_started", source_type=source_type, source_url=source_url)

        if source_type == "openoverheid":
            from app.scrapers.woo_scraper import WooScraper
            scraper = WooScraper()
        elif source_type == "notubiz":
            from app.scrapers.notubiz_scraper import NotubizScraper
            scraper = NotubizScraper()
        elif source_type == "ibabs":
            from app.scrapers.ibabs_scraper import IbabsScraper
            scraper = IbabsScraper()
        else:
            raise ValueError(f"Unknown source_type: {source_type}")

        documents = scraper.fetch(source_url)

        for doc in documents:
            ingest_document.delay(doc["id"], doc["pdf_url"], doc["metadata"])

        logger.info("scrape_source_completed",
                    source_type=source_type,
                    document_count=len(documents))

        return documents

    except Exception as exc:
        logger.error("scrape_source_failed",
                     source_type=source_type,
                     error=str(exc),
                     attempt=self.request.retries)
        try:
            raise self.retry(exc=exc, countdown=2 ** self.request.retries * 60)
        except MaxRetriesExceededError:
            logger.error("scrape_source_dlq",
                         source_type=source_type,
                         error=str(exc),
                         job_id=self.request.id)
            return []


@app.task(bind=True, max_retries=3, acks_late=True)
def generate_embeddings(self, document_id: int, chunks: list[dict]) -> dict:
    try:
        logger.info("generate_embeddings_started", document_id=document_id, chunk_count=len(chunks))

        from app.embedding.service import EmbeddingService
        service = EmbeddingService()
        service.store_embeddings(document_id, chunks)

        logger.info("generate_embeddings_completed", document_id=document_id)

        return {"document_id": document_id, "status": "indexed", "chunk_count": len(chunks)}

    except Exception as exc:
        logger.error("generate_embeddings_failed",
                     document_id=document_id,
                     error=str(exc))
        raise self.retry(exc=exc, countdown=60)


@app.task(acks_late=True)
def check_alerts() -> list:
    logger.info("check_alerts_started")
    from app.alerts.feed_manager import FeedManager
    manager = FeedManager()
    triggered = manager.check_all()
    logger.info("check_alerts_completed", alert_count=len(triggered))
    return triggered
