from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "dataforge",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.browser",
        "app.workers.scraper",
        "app.workers.export",
        "app.workers.scheduler"
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,
    task_soft_time_limit=3300,
    worker_prefetch_multiplier=1,
    worker_concurrency=4,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    broker_connection_retry_on_startup=True
)

celery_app.conf.beat_schedule = {
    "cleanup-expired-jobs": {
        "task": "app.workers.scheduler.cleanup_expired_jobs",
        "schedule": crontab(minute=0, hour="*/1"),
    },
    "calculate-usage-stats": {
        "task": "app.workers.scheduler.calculate_usage_stats",
        "schedule": crontab(minute=0, hour=0),
    },
    "health-check-browser-pools": {
        "task": "app.workers.scheduler.health_check_browser_pools",
        "schedule": crontab(minute="*/15"),
    },
    "process-scheduled-tasks": {
        "task": "app.workers.scheduler.process_scheduled_tasks",
        "schedule": crontab(minute="*/1"),
    },
}
