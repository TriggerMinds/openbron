FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-nld \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN addgroup --system --gid 1001 openbron && \
    adduser --system --uid 1001 --gid 1001 openbron && \
    chown -R openbron:openbron /app /tmp

USER openbron

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import redis, psycopg2; r=redis.Redis.from_url('redis://redis:6379/0'); r.ping(); print('healthy')"
