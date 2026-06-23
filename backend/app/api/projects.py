from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
import re

from app.core.database import get_db
from app.api.deps import get_current_user, get_workspace_member
from app.models import User, Workspace, WorkspaceMember, Project, Task, Job
from app.schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectWithStatsResponse,
    TaskCreate, TaskUpdate, TaskResponse, TaskWithStatsResponse,
    JobCreate, JobResponse, JobStatus, TaskType
)

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    member = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == data.workspace_id,
            WorkspaceMember.user_id == current_user.id
        )
    )
    if not member.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this workspace"
        )

    slug = data.slug or re.sub(r"[^a-z0-9-]", "", data.name.lower().replace(" ", "-")).strip("-")

    result = await db.execute(
        select(Project).where(
            Project.workspace_id == data.workspace_id,
            Project.slug == slug
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Project with this slug already exists"
        )

    project = Project(
        workspace_id=data.workspace_id,
        name=data.name,
        slug=slug,
        description=data.description,
        icon=data.icon,
        color=data.color,
        tags=data.tags or [],
        created_by=current_user.id
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    return project


@router.get("/workspace/{workspace_id}", response_model=List[ProjectWithStatsResponse])
async def list_projects(
    workspace_id: UUID,
    search: Optional[str] = Query(None),
    tags: Optional[str] = Query(None),
    member: WorkspaceMember = Depends(get_workspace_member),
    db: AsyncSession = Depends(get_db)
):
    query = select(Project).where(Project.workspace_id == workspace_id)

    if search:
        query = query.where(Project.name.ilike(f"%{search}%"))

    if tags:
        tag_list = tags.split(",")
        query = query.where(Project.tags.overlap(tag_list))

    query = query.order_by(Project.created_at.desc())
    result = await db.execute(query)
    projects = result.scalars().all()

    response = []
    for project in projects:
        task_count = await db.execute(
            select(func.count(Task.id)).where(Task.project_id == project.id)
        )
        active_jobs = await db.execute(
            select(func.count(Job.id))
            .join(Task)
            .where(Task.project_id == project.id, Job.status == JobStatus.RUNNING.value)
        )
        total_items = await db.execute(
            select(func.sum(Job.items_extracted))
            .join(Task)
            .where(Task.project_id == project.id)
        )

        response.append(ProjectWithStatsResponse(
            **{k: getattr(project, k) for k in ProjectResponse.model_fields.keys()},
            task_count=task_count.scalar() or 0,
            active_jobs=active_jobs.scalar() or 0,
            total_items=total_items.scalar() or 0
        ))

    return response


@router.get("/{project_id}", response_model=ProjectWithStatsResponse)
async def get_project(
    project_id: UUID,
    member: WorkspaceMember = Depends(get_workspace_member),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .options(selectinload(Project.workspace))
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == project.workspace_id,
            WorkspaceMember.user_id == member.user_id
        )
    )

    task_count = await db.execute(
        select(func.count(Task.id)).where(Task.project_id == project.id)
    )
    active_jobs = await db.execute(
        select(func.count(Job.id))
        .join(Task)
        .where(Task.project_id == project.id, Job.status == JobStatus.RUNNING.value)
    )
    total_items = await db.execute(
        select(func.sum(Job.items_extracted))
        .join(Task)
        .where(Task.project_id == project.id)
    )

    return ProjectWithStatsResponse(
        **{k: getattr(project, k) for k in ProjectResponse.model_fields.keys()},
        task_count=task_count.scalar() or 0,
        active_jobs=active_jobs.scalar() or 0,
        total_items=total_items.scalar() or 0
    )


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    member: WorkspaceMember = Depends(get_workspace_member),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)

    await db.commit()
    await db.refresh(project)

    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    member: WorkspaceMember = Depends(get_workspace_member),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    await db.delete(project)
    await db.commit()


@router.post("/{project_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    project_id: UUID,
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    member: WorkspaceMember = Depends(get_workspace_member),
    db: AsyncSession = Depends(get_db)
):
    project = await db.execute(select(Project).where(Project.id == project_id))
    if not project.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    task = Task(
        project_id=project_id,
        name=data.name,
        description=data.description,
        type=data.type.value if isinstance(data.type, TaskType) else data.type,
        config=data.config.model_dump(),
        schedule_type=data.schedule_type.value if hasattr(data.schedule_type, 'value') else data.schedule_type,
        schedule_cron=data.schedule_cron,
        schedule_timezone=data.schedule_timezone,
        priority=data.priority,
        timeout_seconds=data.timeout_seconds,
        max_retries=data.max_retries,
        retry_delay_seconds=data.retry_delay_seconds,
        tags=data.tags or [],
        created_by=current_user.id
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    return task


@router.get("/{project_id}/tasks", response_model=List[TaskWithStatsResponse])
async def list_tasks(
    project_id: UUID,
    is_active: Optional[bool] = Query(None),
    type: Optional[TaskType] = Query(None),
    member: WorkspaceMember = Depends(get_workspace_member),
    db: AsyncSession = Depends(get_db)
):
    query = select(Task).where(Task.project_id == project_id)

    if is_active is not None:
        query = query.where(Task.is_active == is_active)
    if type:
        query = query.where(Task.type == type.value)

    query = query.order_by(Task.created_at.desc())
    result = await db.execute(query)
    tasks = result.scalars().all()

    response = []
    for task in tasks:
        stats_result = await db.execute(
            select(
                func.count(Job.id).label('total'),
                func.sum(func.case((Job.status == JobStatus.COMPLETED.value, 1), else_=0)).label('success'),
                func.sum(func.case((Job.status == JobStatus.FAILED.value, 1), else_=0)).label('failed'),
                func.max(Job.created_at).label('last_run'),
                func.avg(Job.duration_ms).label('avg_duration')
            )
            .where(Job.task_id == task.id)
        )
        stats = stats_result.first()

        response.append(TaskWithStatsResponse(
            **{k: getattr(task, k) for k in TaskResponse.model_fields.keys()},
            total_jobs=stats.total or 0,
            successful_jobs=int(stats.success or 0),
            failed_jobs=int(stats.failed or 0),
            last_run=stats.last_run,
            avg_duration_ms=int(stats.avg_duration) if stats.avg_duration else None
        ))

    return response


@router.post("/{project_id}/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    project_id: UUID,
    data: JobCreate,
    current_user: User = Depends(get_current_user),
    member: WorkspaceMember = Depends(get_workspace_member),
    db: AsyncSession = Depends(get_db)
):
    task_result = await db.execute(select(Task).where(Task.id == data.task_id))
    task = task_result.scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    if task.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task does not belong to this project"
        )

    job = Job(
        task_id=task.id,
        input=data.input or {},
        priority=data.priority
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    from app.workers.scraper import execute_job
    execute_job.delay(str(job.id))

    return job


@router.get("/{project_id}/jobs", response_model=List[JobResponse])
async def list_jobs(
    project_id: UUID,
    status_filter: Optional[JobStatus] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    member: WorkspaceMember = Depends(get_workspace_member),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Job)
        .join(Task)
        .where(Task.project_id == project_id)
    )

    if status_filter:
        query = query.where(Job.status == status_filter.value)

    query = query.order_by(Job.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    jobs = result.scalars().all()

    return jobs
