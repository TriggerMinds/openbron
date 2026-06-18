from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean, func
)
from sqlalchemy.orm import DeclarativeBase, relationship
from pgvector.sqlalchemy import Vector


class Base(DeclarativeBase):
    pass


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(1024), nullable=False, index=True)
    source = Column(String(128), nullable=False, index=True)
    source_url = Column(String(2048), nullable=True)
    pdf_url = Column(String(2048), nullable=True)
    publication_date = Column(DateTime, nullable=True, index=True)
    organization = Column(String(512), nullable=True, index=True)
    document_type = Column(String(128), nullable=True)
    summary = Column(Text, nullable=True)
    redaction_ratio = Column(Float, nullable=True, default=0.0)
    metadata = Column(JSON, nullable=True, default=dict)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    chunks = relationship(
        "DocumentChunk", back_populates="document", cascade="all, delete-orphan"
    )
    feed_documents = relationship(
        "FeedDocument", back_populates="document", cascade="all, delete-orphan"
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(
        Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=False, default=0)
    embedding = Column(Vector(1024), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    document = relationship("Document", back_populates="chunks")


class Feed(Base):
    __tablename__ = "feeds"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(256), nullable=False)
    query = Column(Text, nullable=False)
    filters = Column(JSON, nullable=True, default=dict)
    notification_type = Column(String(64), nullable=False, default="email")
    notification_target = Column(String(512), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    last_checked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    documents = relationship("FeedDocument", back_populates="feed", cascade="all, delete-orphan")


class FeedDocument(Base):
    __tablename__ = "feed_documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    feed_id = Column(
        Integer, ForeignKey("feeds.id", ondelete="CASCADE"), nullable=False, index=True
    )
    document_id = Column(
        Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    notified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    feed = relationship("Feed", back_populates="documents")
    document = relationship("Document", back_populates="feed_documents")
