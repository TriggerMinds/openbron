import subprocess
import sys
from typing import Optional

from app.logging_config import get_logger

logger = get_logger(__name__)

SPACY_MODEL = "nl_core_news_sm"


class NERService:
    def __init__(self, model_name: str = SPACY_MODEL):
        self.model_name = model_name
        self._nlp: Optional[object] = None

    @property
    def nlp(self):
        if self._nlp is None:
            self._load_model()
        return self._nlp

    def _load_model(self):
        try:
            import spacy
            self._nlp = spacy.load(self.model_name)
        except OSError:
            logger.info("ner_model_not_found", model=self.model_name)
            self._download_model()
            import spacy
            self._nlp = spacy.load(self.model_name)

    def _download_model(self):
        logger.info("ner_model_downloading", model=self.model_name)
        subprocess.check_call(
            [sys.executable, "-m", "spacy", "download", self.model_name]
        )
        logger.info("ner_model_downloaded", model=self.model_name)

    def extract_entities(self, text: str) -> dict:
        if not text or not text.strip():
            return {"PER": [], "ORG": [], "GPE": []}

        doc = self.nlp(text)

        entities: dict[str, list[str]] = {"PER": [], "ORG": [], "GPE": []}

        for ent in doc.ents:
            if ent.label_ == "PER" or ent.label_ == "PERSON":
                entities["PER"].append(ent.text)
            elif ent.label_ == "ORG":
                entities["ORG"].append(ent.text)
            elif ent.label_ == "GPE" or ent.label_ == "LOC":
                entities["GPE"].append(ent.text)

        entities["PER"] = list(dict.fromkeys(entities["PER"]))
        entities["ORG"] = list(dict.fromkeys(entities["ORG"]))
        entities["GPE"] = list(dict.fromkeys(entities["GPE"]))

        return entities
