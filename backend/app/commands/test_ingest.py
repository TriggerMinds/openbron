import argparse
import os
import sys
import tempfile
import traceback

from app.logging_config import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)

SUCCESS = 0
FAILURE = 1


def _step(label: str, ok: bool, detail: str = "") -> None:
    status = "OK" if ok else "FAIL"
    line = f"  [{status}] {label}"
    if detail:
        line += f"  --  {detail}"
    print(line)


def _print_header(title: str) -> None:
    print("")
    print("=" * 72)
    print(f"  {title}")
    print("=" * 72)


def _try_import(module_path: str, name: str):
    try:
        mod = __import__(module_path, fromlist=[name])
        return getattr(mod, name)
    except Exception as exc:
        logger.error("import_failed", module=module_path, name=name, error=str(exc))
        return None


def test_pdf_pipeline(pdf_path: str, document_id: int) -> dict:
    results: dict = {}

    PDFProcessor = _try_import("app.ingestion.pdf_processor", "PDFProcessor")
    RedactionScanner = _try_import(
        "app.ingestion.redaction_scanner", "RedactionScanner"
    )
    NERService = _try_import("app.ingestion.ner_service", "NERService")
    DocumentChunker = _try_import("app.ingestion.chunker", "DocumentChunker")

    _print_header("TEXT EXTRACTION")
    pdf_ok = False
    text_by_page = {}
    if PDFProcessor is not None:
        try:
            processor = PDFProcessor()
            text_by_page = processor.extract_text(pdf_path)
            total_chars = sum(len(t) for t in text_by_page.values())
            sample = ""
            for pn in sorted(text_by_page):
                txt = text_by_page[pn]
                if txt.strip():
                    sample = txt.strip()[:120]
                    break
            pdf_ok = len(text_by_page) > 0
            _step(
                "extract_text",
                pdf_ok,
                f"pages={len(text_by_page)}  chars={total_chars}"
                + (f"  sample={sample!r}" if sample else ""),
            )
        except Exception as exc:
            _step("extract_text", False, str(exc))
            logger.error("pipeline_extract_text_failed", error=str(exc))
    else:
        _step("extract_text (import failed)", False)
    results["text_by_page"] = text_by_page

    _print_header("REDACTION SCAN")
    scan_result = {}
    if RedactionScanner is not None:
        try:
            scanner = RedactionScanner()
            scan_result = scanner.scan_with_layout(pdf_path)
            bb_count = sum(
                len(p["bounding_boxes"]) for p in scan_result.get("page_redactions", [])
            )
            _step(
                "scan_with_layout",
                True,
                f"ratio={scan_result.get('ratio', 0)}  "
                f"pages_scanned={len(scan_result.get('page_redactions', []))}  "
                f"bboxes={bb_count}",
            )
        except Exception as exc:
            _step("scan_with_layout", False, str(exc))
            logger.error("pipeline_redaction_scan_failed", error=str(exc))
    else:
        _step("scan_with_layout (import failed)", False)
    results["scan_result"] = scan_result

    _print_header("NER")
    all_entities = {"PER": [], "ORG": [], "GPE": []}
    if NERService is not None:
        try:
            ner = NERService()
            for page_num in sorted(text_by_page.keys()):
                text = text_by_page[page_num]
                if text.strip():
                    page_entities = ner.extract_entities(text)
                    for label in ("PER", "ORG", "GPE"):
                        all_entities[label].extend(page_entities.get(label, []))
            for label in ("PER", "ORG", "GPE"):
                all_entities[label] = list(dict.fromkeys(all_entities[label]))
            detail_parts = []
            for label in ("PER", "ORG", "GPE"):
                if all_entities[label]:
                    detail_parts.append(f"{label}={all_entities[label]}")
            _step(
                "extract_entities",
                True,
                "; ".join(detail_parts) if detail_parts else "no entities found",
            )
        except Exception as exc:
            _step("extract_entities", False, str(exc))
            logger.error("pipeline_ner_failed", error=str(exc))
    else:
        _step("extract_entities (import failed)", False)
    results["entities"] = all_entities

    _print_header("CHUNKING")
    chunks = []
    if DocumentChunker is not None:
        try:
            enriched_metadata = {
                "source": "test_cli",
                "document_id": document_id,
                "redaction_layout": scan_result,
                "extracted_entities": all_entities,
            }
            chunker = DocumentChunker()
            chunks = chunker.split(text_by_page, document_id, enriched_metadata)
            token_counts = [c.get("token_count", 0) for c in chunks]
            _step(
                "split",
                True,
                f"chunks={len(chunks)}  "
                f"min_tokens={min(token_counts) if token_counts else 0}  "
                f"max_tokens={max(token_counts) if token_counts else 0}  "
                f"total_tokens={sum(token_counts)}",
            )
        except Exception as exc:
            _step("split", False, str(exc))
            logger.error("pipeline_chunking_failed", error=str(exc))
    else:
        _step("split (import failed)", False)
    results["chunks"] = chunks

    return results


def test_audio_pipeline(audio_path: str, document_id: int) -> dict:
    results: dict = {}

    AudioTranscriber = _try_import("app.ingestion.transcriber", "AudioTranscriber")

    _print_header("AUDIO TRANSCRIPTION")
    segments = []
    if AudioTranscriber is not None:
        try:
            transcriber = AudioTranscriber()
            segments = transcriber.transcribe(audio_path)
            audio_len = (
                segments[-1]["timestamp_end"] if segments else 0.0
            )
            _step(
                "transcribe",
                True,
                f"segments={len(segments)}  duration={audio_len:.2f}s",
            )
        except ImportError as exc:
            _step("transcribe", False, f"missing dependency: {exc}")
            logger.error("pipeline_transcribe_import_error", error=str(exc))
        except Exception as exc:
            _step("transcribe", False, str(exc))
            logger.error("pipeline_transcribe_failed", error=str(exc))
    else:
        _step("transcribe (import failed)", False)
    results["segments"] = segments
    return results


def run_online(source_url: str) -> int:
    from app.scrapers.proxy import StealthSession

    _print_header("ONLINE MODE")
    print(f"  Source URL: {source_url}")
    print("  Fetching document ...")

    StealthSession_cls = StealthSession
    document_id = abs(hash(source_url)) % (10 ** 9)
    pdf_path = None
    temp_dir = tempfile.mkdtemp(prefix="openbron_test_")

    try:
        _print_header("DOWNLOAD")
        try:
            session = StealthSession_cls()
            response = session.get(source_url)
            content_type = response.headers.get("content-type", "")
            file_size = len(response.content)
            _step(
                "download",
                True,
                f"size={file_size} bytes  type={content_type}",
            )
            ext = ".pdf"
            if "audio" in content_type or "video" in content_type:
                ext = ".bin"
            pdf_path = os.path.join(temp_dir, f"downloaded{ext}")
            with open(pdf_path, "wb") as f:
                f.write(response.content)
        except Exception as exc:
            _step("download", False, str(exc))
            logger.error("online_download_failed", error=str(exc))
            return FAILURE

        if pdf_path and pdf_path.endswith(".pdf"):
            test_pdf_pipeline(pdf_path, document_id)
        else:
            print("  (non-PDF content; skipping PDF pipeline)")

        return SUCCESS

    except Exception as exc:
        logger.error("online_mode_failed", error=str(exc), traceback=traceback.format_exc())
        return FAILURE
    finally:
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)


def run_offline(pdf_path: str | None, audio_path: str | None) -> int:
    _print_header("OFFLINE MODE")
    if pdf_path:
        print(f"  PDF:   {pdf_path}   ({os.path.getsize(pdf_path)} bytes)")
    if audio_path:
        print(f"  Audio: {audio_path}   ({os.path.getsize(audio_path)} bytes)")

    document_id = 999999
    any_failure = False

    if pdf_path:
        if not os.path.isfile(pdf_path):
            _step("pdf_file_exists", False, f"not found: {pdf_path}")
            any_failure = True
        else:
            _step("pdf_file_exists", True)
            results = test_pdf_pipeline(pdf_path, document_id)
            if not results.get("text_by_page"):
                any_failure = True

    if audio_path:
        if not os.path.isfile(audio_path):
            _step("audio_file_exists", False, f"not found: {audio_path}")
            any_failure = True
        else:
            _step("audio_file_exists", True)
            audio_results = test_audio_pipeline(audio_path, document_id)
            if not audio_results.get("segments"):
                any_failure = True

    return FAILURE if any_failure else SUCCESS


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Test the OpenBron ingestion pipeline end-to-end.",
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--source-url",
        type=str,
        default=None,
        help="Online mode: fetch document from this URL and run pipeline",
    )
    parser.add_argument(
        "--pdf",
        type=str,
        default=None,
        help="Offline mode: path to a local PDF file",
    )
    parser.add_argument(
        "--audio",
        type=str,
        default=None,
        help="Offline mode: path to a local audio file",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.source_url:
        return run_online(args.source_url)
    elif args.pdf or args.audio:
        return run_offline(args.pdf, args.audio)
    else:
        parser.print_help()
        return FAILURE


if __name__ == "__main__":
    sys.exit(main())
