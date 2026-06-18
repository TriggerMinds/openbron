from app.config import settings

broker_url = settings.celery_broker_url
result_backend = settings.celery_result_backend

worker_concurrency = settings.celery_worker_concurrency
worker_max_tasks_per_child = 50
worker_prefetch_multiplier = 1

task_acks_late = True
task_reject_on_worker_lost = True
task_track_started = True
task_serializer = "json"
result_serializer = "json"
accept_content = ["json"]

task_annotations = {
    "app.tasks.ingest_document": {"rate_limit": f"{settings.celery_task_rate_limit}/m"},
    "app.tasks.scrape_source": {"rate_limit": f"{settings.celery_task_rate_limit}/m"},
}

task_routes = {
    "app.tasks.ingest_document": {"queue": "ingestion"},
    "app.tasks.scrape_source": {"queue": "scraping"},
    "app.tasks.generate_embeddings": {"queue": "embeddings"},
    "app.tasks.check_alerts": {"queue": "alerts"},
}

beat_schedule = {
    "check-alerts-every-15-minutes": {
        "task": "app.tasks.check_alerts",
        "schedule": 900.0,
    },
}

timezone = "Europe/Amsterdam"
enable_utc = True
