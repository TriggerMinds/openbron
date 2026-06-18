import os
import time
from typing import Optional

import requests

from app.config import settings
from app.logging_config import get_logger

logger = get_logger(__name__)


class AudioTranscriber:

    def __init__(
        self,
        provider: Optional[str] = None,
        model_size: Optional[str] = None,
        api_key: Optional[str] = None,
    ):
        self.provider = (provider or settings.whisper_provider or "local").lower()
        self.model_size = model_size or settings.whisper_model_size or "base"
        self.api_key = api_key or settings.whisper_api_key or settings.llm_api_key

        self._model = None

    def _get_local_model(self):
        if self._model is not None:
            return self._model
        from faster_whisper import WhisperModel
        self._model = WhisperModel(
            self.model_size,
            device="cpu",
            compute_type="int8",
            cpu_threads=settings.opencv_threads or 4,
        )
        return self._model

    def transcribe(self, audio_path: str) -> list[dict]:
        if not audio_path or not os.path.isfile(audio_path):
            logger.error("transcribe_file_not_found", audio_path=audio_path)
            return []

        file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
        logger.info(
            "transcribe_started",
            audio_path=audio_path,
            file_size_mb=round(file_size_mb, 2),
            provider=self.provider,
        )

        started = time.monotonic()

        if self.provider == "openai":
            segments = self._transcribe_openai(audio_path)
        elif self.provider == "local":
            segments = self._transcribe_local(audio_path)
        else:
            raise ValueError(f"Unknown whisper provider: {self.provider}")

        elapsed = time.monotonic() - started
        audio_length = segments[-1]["timestamp_end"] if segments else 0.0

        logger.info(
            "transcribe_completed",
            audio_path=audio_path,
            segment_count=len(segments),
            audio_duration_seconds=round(audio_length, 2),
            elapsed_seconds=round(elapsed, 2),
        )

        return segments

    def _transcribe_local(self, audio_path: str) -> list[dict]:
        model = self._get_local_model()
        segments, info = model.transcribe(audio_path, beam_size=5)

        results = []
        for segment in segments:
            results.append({
                "timestamp_start": round(segment.start, 3),
                "timestamp_end": round(segment.end, 3),
                "text": segment.text.strip(),
            })

        logger.info(
            "transcribe_local_info",
            duration_seconds=round(info.duration, 2),
            language=info.language,
            language_probability=round(info.language_probability, 3),
        )

        return results

    def _transcribe_openai(self, audio_path: str) -> list[dict]:
        from openai import OpenAI

        client = OpenAI(api_key=self.api_key)

        with open(audio_path, "rb") as f:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                response_format="verbose_json",
                timestamp_granularities=["segment"],
            )

        results = []
        for seg in transcript.segments:
            results.append({
                "timestamp_start": round(seg.start, 3),
                "timestamp_end": round(seg.end, 3),
                "text": seg.text.strip(),
            })

        return results

    def transcribe_url(self, url: str, temp_dir: str) -> list[dict]:
        if not url:
            logger.error("transcribe_url_empty")
            return []

        logger.info("transcribe_url_download_started", url=url)
        started = time.monotonic()

        try:
            response = requests.get(url, stream=True, timeout=300)
            response.raise_for_status()
        except requests.RequestException as exc:
            logger.error("transcribe_url_download_failed", url=url, error=str(exc))
            return []

        ext = self._guess_extension(response.headers.get("content-type", ""))
        local_path = os.path.join(temp_dir, f"media{ext}")

        with open(local_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)

        download_elapsed = time.monotonic() - started
        logger.info(
            "transcribe_url_download_completed",
            url=url,
            elapsed_seconds=round(download_elapsed, 2),
        )

        return self.transcribe(local_path)

    @staticmethod
    def _guess_extension(content_type: str) -> str:
        mapping = {
            "audio/mpeg": ".mp3",
            "audio/mp3": ".mp3",
            "audio/wav": ".wav",
            "audio/webm": ".webm",
            "audio/ogg": ".ogg",
            "audio/mp4": ".m4a",
            "video/mp4": ".mp4",
            "video/webm": ".webm",
        }
        return mapping.get(content_type.split(";")[0].strip(), ".bin")
