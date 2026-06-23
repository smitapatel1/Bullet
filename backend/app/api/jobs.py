from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload
import json

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models import User, Task, Job, JobLog, WorkspaceMember, Project
from app.schemas import JobResponse, JobLogResponse, JobStatus, DashboardStats

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Job)
        .where(Job.id == job_id)
        .options(selectinload(Job.task).selectinload(Task.project).selectinload(Project.workspace))
    )
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    ws_id = job.task.project.workspace_id
    member = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == ws_id,
            WorkspaceMember.user_id == current_user.id
        )
    )
    if not member.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return job


@router.post("/{job_id}/cancel", response_model=JobResponse)
async def cancel_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Job)
        .where(Job.id == job_id)
        .options(selectinload(Job.task).selectinload(Task.project).selectinload(Project.workspace))
    )
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if job.status in [JobStatus.COMPLETED.value, JobStatus.FAILED.value, JobStatus.CANCELLED.value]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot cancel job in current state")

    job.status = JobStatus.CANCELLED.value
    job.completed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(job)

    return job


@router.post("/{job_id}/retry", response_model=JobResponse)
async def retry_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Job)
        .where(Job.id == job_id)
        .options(selectinload(Job.task))
    )
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if job.status != JobStatus.FAILED.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only retry failed jobs")

    new_job = Job(
        task_id=job.task_id,
        input=job.input,
        priority=job.priority
    )
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)

    from app.workers.scraper import execute_job
    execute_job.delay(str(new_job.id))

    return new_job


@router.get("/{job_id}/logs", response_model=List[JobLogResponse])
async def get_job_logs(
    job_id: UUID,
    level: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    job = await db.execute(select(Job).where(Job.id == job_id))
    if not job.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    query = select(JobLog).where(JobLog.job_id == job_id)

    if level:
        query = query.where(JobLog.level == level)

    query = query.order_by(JobLog.timestamp.asc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    logs = result.scalars().all()

    return logs


@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    workspace_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import or_
    from datetime import datetime, timedelta

    query = (
        select(Job)
        .join(Task)
        .join(Project)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Project.workspace_id)
        .where(WorkspaceMember.user_id == current_user.id)
    )

    if workspace_id:
        query = query.where(Project.workspace_id == workspace_id)

    total_result = await db.execute(
        select(func.count(Job.id))
        .join(Task)
        .join(Project)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Project.workspace_id)
        .where(WorkspaceMember.user_id == current_user.id)
    )
    total_jobs = total_result.scalar() or 0

    active_result = await db.execute(
        select(func.count(Job.id))
        .join(Task)
        .join(Project)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Project.workspace_id)
        .where(
            WorkspaceMember.user_id == current_user.id,
            Job.status.in_([JobStatus.RUNNING.value, JobStatus.QUEUED.value])
        )
    )
    active_jobs = active_result.scalar() or 0

    queued_result = await db.execute(
        select(func.count(Job.id))
        .join(Task)
        .join(Project)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Project.workspace_id)
        .where(
            WorkspaceMember.user_id == current_user.id,
            Job.status == JobStatus.QUEUED.value
        )
    )
    queued_jobs = queued_result.scalar() or 0

    yesterday = datetime.utcnow() - timedelta(hours=24)
    completed_result = await db.execute(
        select(func.count(Job.id))
        .join(Task)
        .join(Project)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Project.workspace_id)
        .where(
            WorkspaceMember.user_id == current_user.id,
            Job.status == JobStatus.COMPLETED.value,
            Job.completed_at >= yesterday
        )
    )
    completed_24h = completed_result.scalar() or 0

    failed_result = await db.execute(
        select(func.count(Job.id))
        .join(Task)
        .join(Project)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Project.workspace_id)
        .where(
            WorkspaceMember.user_id == current_user.id,
            Job.status == JobStatus.FAILED.value,
            Job.completed_at >= yesterday
        )
    )
    failed_24h = failed_result.scalar() or 0

    items_result = await db.execute(
        select(func.sum(Job.items_extracted))
        .join(Task)
        .join(Project)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Project.workspace_id)
        .where(WorkspaceMember.user_id == current_user.id)
    )
    total_items = items_result.scalar() or 0

    duration_result = await db.execute(
        select(func.avg(Job.duration_ms))
        .join(Task)
        .join(Project)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Project.workspace_id)
        .where(
            WorkspaceMember.user_id == current_user.id,
            Job.status == JobStatus.COMPLETED.value,
            Job.duration_ms.isnot(None)
        )
    )
    avg_duration = duration_result.scalar() or 0

    total_completed = await db.execute(
        select(func.count(Job.id))
        .join(Task)
        .join(Project)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Project.workspace_id)
        .where(
            WorkspaceMember.user_id == current_user.id,
            Job.status.in_([JobStatus.COMPLETED.value, JobStatus.FAILED.value])
        )
    )
    total_completed_count = total_completed.scalar() or 0
    success_rate = (completed_24h / total_completed_count * 100) if total_completed_count > 0 else 0

    return DashboardStats(
        total_jobs=total_jobs,
        active_jobs=active_jobs,
        queued_jobs=queued_jobs,
        completed_jobs_24h=completed_24h,
        failed_jobs_24h=failed_24h,
        total_items_extracted=total_items,
        avg_job_duration_ms=float(avg_duration) if avg_duration else 0,
        success_rate=success_rate
    )


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[UUID, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, job_id: UUID):
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = []
        self.active_connections[job_id].append(websocket)

    def disconnect(self, websocket: WebSocket, job_id: UUID):
        if job_id in self.active_connections:
            self.active_connections[job_id].remove(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]

    async def broadcast(self, job_id: UUID, message: dict):
        if job_id in self.active_connections:
            for connection in self.active_connections[job_id]:
                await connection.send_json(message)


manager = ConnectionManager()


@router.websocket("/{job_id}/ws")
async def job_websocket(
    websocket: WebSocket,
    job_id: UUID
):
    await manager.connect(websocket, job_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                await websocket.send_text(f"ack: {data}")
            except:
                break
    except WebSocketDisconnect:
        manager.disconnect(websocket, job_id)


async def send_job_update(job_id: UUID, update_data: dict):
    await manager.broadcast(job_id, update_data)
