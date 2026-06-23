import asyncio
import json
import random
from datetime import datetime
from typing import Dict, Any, List, Optional
from uuid import UUID
import httpx
from celery import shared_task
from sqlalchemy import select

from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models import Job, JobLog, Task, DataStore, DataStoreItem, JobStatus
from app.workers.browser import BrowserManager

browser_manager = BrowserManager()


class WebScraper:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.results = []
        self.pages_scraped = 0
        self.client = None

    async def execute(self) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(
            timeout=self.config.get('timeout', 30),
            follow_redirects=True,
            headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
        ) as self.client:
            url = self.config.get('url')
            pages = self.config.get('pages', 1)
            wait_selector = self.config.get('wait_selector')

            if wait_selector:
                return await self._browser_scrape(url, pages, wait_selector)
            else:
                return await self._http_scrape(url, pages)

        return []

    async def _http_scrape(self, url: str, max_pages: int) -> List[Dict[str, Any]]:
        results = []
        visited = set()
        to_visit = [url]

        while to_visit and len(visited) < max_pages:
            current_url = to_visit.pop(0)
            if current_url in visited:
                continue

            try:
                response = await self.client.get(current_url)
                response.raise_for_status()

                data = await self._parse_response(response)
                if data:
                    results.extend(data)
                    self.pages_scraped += 1

                visited.add(current_url)
                await asyncio.sleep(random.uniform(0.5, 1.5))

            except httpx.HTTPError as e:
                print(f"Error scraping {current_url}: {e}")

        return results

    async def _browser_scrape(self, url: str, max_pages: int, wait_selector: str) -> List[Dict[str, Any]]:
        return await browser_manager.scrape(
            url=url,
            max_pages=max_pages,
            wait_selector=wait_selector,
            extract_schema=self.config.get('extract_pattern'),
            actions=self.config.get('actions', []),
            output=self.config.get('output', 'json')
        )

    async def _parse_response(self, response) -> List[Dict[str, Any]]:
        extract_pattern = self.config.get('extract_pattern')

        if not extract_pattern:
            content_type = response.headers.get('content-type', '')
            if 'json' in content_type:
                try:
                    data = response.json()
                    return [{'data': data, 'url': str(response.url)}]
                except json.JSONDecodeError:
                    pass
            return [{'html': response.text[:10000], 'url': str(response.url), 'status': response.status_code}]

        from bs4 import BeautifulSoup
        soup = BeautifulSoup(response.text, 'html.parser')

        results = []

        if extract_pattern.get('type') == 'list':
            container = extract_pattern.get('container')
            items = soup.select(container) if container else [soup]
            for item in items:
                row = {}
                for field, selector in extract_pattern.get('fields', {}).items():
                    elem = item.select_one(selector) if isinstance(selector, str) else None
                    if elem:
                        row[field] = elem.get_text(strip=True)
                if row:
                    results.append(row)

        elif extract_pattern.get('type') == 'single':
            row = {}
            for field, selector in extract_pattern.get('fields', {}).items():
                elem = soup.select_one(selector)
                if elem:
                    row[field] = elem.get_text(strip=True)
            if row:
                results.append(row)

        return results


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def execute_job(self, job_id: str):
    async def _execute():
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Job).where(Job.id == UUID(job_id)))
            job = result.scalar_one_or_none()

            if not job:
                return

            job.status = JobStatus.RUNNING.value
            job.started_at = datetime.utcnow()
            await db.commit()
            await db.flush()

            try:
                task_result = await db.execute(select(Task).where(Task.id == job.task_id))
                task = task_result.scalar_one_or_none()

                if not task:
                    raise Exception("Task not found")

                await log_job_event(db, job.id, "info", "Starting job execution")

                scraper = WebScraper(task.config)
                results = await scraper.execute()

                job.output = {"results": results[:min(len(results), 1000)]}
                job.items_extracted = len(results)
                job.pages_extracted = scraper.pages_scraped
                job.status = JobStatus.COMPLETED.value
                job.completed_at = datetime.utcnow()

                if job.started_at:
                    job.duration_ms = int((job.completed_at - job.started_at).total_seconds() * 1000)

                await log_job_event(db, job.id, "info", f"Job completed successfully. Extracted {len(results)} items")

                data_store = DataStore(
                    project_id=task.project_id,
                    job_id=job.id,
                    name=f"Job {job.id} results",
                    format="json",
                    row_count=len(results),
                    size_bytes=len(json.dumps(results))
                )
                db.add(data_store)
                await db.flush()

                for item in results:
                    store_item = DataStoreItem(
                        data_store_id=data_store.id,
                        data=item
                    )
                    db.add(store_item)

                await db.commit()

            except Exception as e:
                job.status = JobStatus.FAILED.value
                job.error_message = str(e)
                job.completed_at = datetime.utcnow()

                if job.started_at:
                    job.duration_ms = int((job.completed_at - job.started_at).total_seconds() * 1000)

                await log_job_event(db, job.id, "error", f"Job failed: {str(e)}")

                await db.commit()

                raise self.retry(exc=e)

    asyncio.run(_execute())


@celery_app.task
def bulk_execute_jobs(job_ids: List[str]):
    for job_id in job_ids:
        execute_job.delay(job_id)


async def log_job_event(db, job_id: UUID, level: str, message: str, metadata: dict = None):
    log = JobLog(
        job_id=job_id,
        level=level,
        message=message,
        metadata=metadata or {}
    )
    db.add(log)
    await db.commit()
