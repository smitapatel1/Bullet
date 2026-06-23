import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any
from uuid import UUID
from celery import shared_task
from sqlalchemy import select, func, and_
import psutil
import platform

from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models import (
    Job, Task, UsageStats, BrowserPool, ProxyPool, Workspace,
    Project, JobStatus
)
from app.workers.scraper import execute_job


@celery_app.task
def process_scheduled_tasks():
    async def _process():
        async with AsyncSessionLocal() as db:
            now = datetime.utcnow()

            result = await db.execute(
                select(Task).where(
                    Task.is_active == True,
                    Task.schedule_type.in_(['cron', 'recurring', 'once'])
                )
            )
            tasks = result.scalars().all()

            for task in tasks:
                should_run = False

                if task.schedule_type == 'once':
                    if task.schedule_cron:
                        scheduled_time = datetime.fromisoformat(task.schedule_cron)
                        if now >= scheduled_time:
                            should_run = True
                            task.schedule_cron = None
                            task.is_active = False

                elif task.schedule_type == 'cron':
                    if task.schedule_cron:
                        from croniter import croniter
                        try:
                            cron = croniter(task.schedule_cron)
                            next_run = cron.get_next(datetime)
                            if now >= next_run:
                                should_run = True
                        except Exception as e:
                            print(f"Cron parse error for task {task.id}: {e}")

                elif task.schedule_type == 'recurring':
                    last_result = await db.execute(
                        select(Job)
                        .where(Job.task_id == task.id)
                        .order_by(Job.created_at.desc())
                        .limit(1)
                    )
                    last_job = last_result.scalar_one_or_none()

                    if last_job:
                        interval = int(task.schedule_cron or '60')
                        if now >= last_job.created_at + timedelta(minutes=interval):
                            should_run = True
                    else:
                        should_run = True

                if should_run:
                    job = Job(
                        task_id=task.id,
                        status=JobStatus.QUEUED.value,
                        priority=task.priority
                    )
                    db.add(job)
                    await db.flush()

                    execute_job.delay(str(job.id))

            await db.commit()

    asyncio.run(_process())


@celery_app.task
def cleanup_expired_jobs():
    async def _cleanup():
        async with AsyncSessionLocal() as db:
            cutoff = datetime.utcnow() - timedelta(hours=24)

            result = await db.execute(
                select(Job).where(
                    Job.status.in_(['pending', 'queued']),
                    Job.created_at < cutoff
                )
            )
            expired_jobs = result.scalars().all()

            for job in expired_jobs:
                job.status = JobStatus.CANCELLED.value
                job.completed_at = datetime.utcnow()
                job.error_message = "Job cancelled due to timeout"

            await db.commit()

            return len(expired_jobs)

    return asyncio.run(_cleanup())


@celery_app.task
def calculate_usage_stats():
    async def _calculate():
        async with AsyncSessionLocal() as db:
            today = datetime.utcnow().date()

            workspaces_result = await db.execute(select(Workspace))
            workspaces = workspaces_result.scalars().all()

            for workspace in workspaces:
                projects_result = await db.execute(
                    select(Project).where(Project.workspace_id == workspace.id)
                )
                projects = projects_result.scalars().all()
                project_ids = [p.id for p in projects]

                if not project_ids:
                    continue

                tasks_result = await db.execute(
                    select(Task).where(Task.project_id.in_(project_ids))
                )
                tasks = tasks_result.scalars().all()
                task_ids = [t.id for t in tasks]

                if not task_ids:
                    continue

                stats_result = await db.execute(
                    select(
                        func.count(Job.id).label('total'),
                        func.sum(func.case((Job.status == JobStatus.COMPLETED.value, 1), else_=0)).label('success'),
                        func.sum(func.case((Job.status == JobStatus.FAILED.value, 1), else_=0)).label('failed'),
                        func.sum(func.coalesce(Job.duration_ms, 0)).label('total_duration'),
                        func.sum(func.coalesce(Job.items_extracted, 0)).label('total_items'),
                        func.sum(func.coalesce(Job.pages_extracted, 0)).label('total_pages')
                    ).where(
                        Job.task_id.in_(task_ids),
                        func.date(Job.created_at) == today
                    )
                )
                stats = stats_result.first()

                existing_stats = await db.execute(
                    select(UsageStats).where(
                        UsageStats.workspace_id == workspace.id,
                        UsageStats.date == today
                    )
                )
                usage_stats = existing_stats.scalar_one_or_none()

                if not usage_stats:
                    usage_stats = UsageStats(
                        workspace_id=workspace.id,
                        date=today
                    )
                    db.add(usage_stats)

                usage_stats.jobs_total = stats.total or 0
                usage_stats.jobs_succeeded = stats.success or 0
                usage_stats.jobs_failed = stats.failed or 0
                usage_stats.total_duration_seconds = (stats.total_duration or 0) // 1000
                usage_stats.pages_scraped = stats.total_pages or 0

            await db.commit()

    asyncio.run(_calculate())


@celery_app.task
def health_check_browser_pools():
    async def _check():
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(BrowserPool).where(BrowserPool.is_active == True)
            )
            pools = result.scalars().all()

            for pool in pools:
                try:
                    import psutil
                    cpu_percent = psutil.cpu_percent(interval=1)
                    memory_percent = psutil.virtual_memory().percent

                    if cpu_percent > 90 or memory_percent > 90:
                        pool.active_browsers = max(0, pool.active_browsers - 1)

                    pool.updated_at = datetime.utcnow()

                except Exception as e:
                    print(f"Health check error for pool {pool.id}: {e}")

                await db.commit()

    asyncio.run(_check())


@celery_app.task
def retry_failed_jobs():
    async def _retry():
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Job).join(Task).where(
                    Job.status == JobStatus.FAILED.value,
                    Job.retry_count < Task.max_retries,
                    Job.created_at > datetime.utcnow() - timedelta(hours=1)
                )
            )
            jobs = result.scalars().all()

            for job in jobs:
                job.retry_count += 1
                job.status = JobStatus.PENDING.value
                job.error_message = None
                job.error_stack = None

                task_result = await db.execute(select(Task).where(Task.id == job.task_id))
                task = task_result.scalar_one_or_none()

                if task and task.retry_delay_seconds:
                    execute_job.apply_async(
                        args=[str(job.id)],
                        countdown=task.retry_delay_seconds
                    )
                else:
                    execute_job.delay(str(job.id))

            await db.commit()

            return len(jobs)

    return asyncio.run(_retry())


@celery_app.task
def get_system_health():
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')

        return {
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'memory_available_gb': memory.available / (1024**3),
            'disk_percent': disk.percent,
            'disk_free_gb': disk.free / (1024**3),
            'platform': platform.system(),
            'python_version': platform.python_version()
        }
    except Exception as e:
        return {'error': str(e)}


@celery_app.task
def check_subscription_limits():
    async def _check():
        async with AsyncSessionLocal() as db:
            from app.models import WorkspaceSubscription, SubscriptionPlan

            result = await db.execute(
                select(WorkspaceSubscription)
                .where(WorkspaceSubscription.status == 'active')
            )
            subscriptions = result.scalars().all()

            for sub in subscriptions:
                plan_result = await db.execute(
                    select(SubscriptionPlan).where(SubscriptionPlan.id == sub.plan_id)
                )
                plan = plan_result.scalar_one_or_none()

                if not plan:
                    continue

                limits = plan.limits or {}
                jobs_monthly_limit = limits.get('jobs_per_month', -1)

                if jobs_monthly_limit == -1:
                    continue

                month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

                jobs_result = await db.execute(
                    select(func.count(Job.id))
                    .join(Task)
                    .join(Project)
                    .where(
                        Project.workspace_id == sub.workspace_id,
                        Job.created_at >= month_start
                    )
                )
                jobs_count = jobs_result.scalar() or 0

                if jobs_count >= jobs_monthly_limit:
                    pass

            await db.commit()

    asyncio.run(_check())
