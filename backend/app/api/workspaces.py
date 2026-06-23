from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
import re

from app.core.database import get_db
from app.api.deps import get_current_user, get_workspace_member, require_role
from app.models import (
    User, Workspace, WorkspaceMember, Project, Task, Job, UsageStats,
    WorkspaceSubscription, SubscriptionPlan
)
from app.schemas import (
    WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse, WorkspaceWithStatsResponse,
    WorkspaceMemberCreate, WorkspaceMemberResponse
)

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


def generate_slug(name: str) -> str:
    slug = re.sub(r"[^a-z0-9-]", "", name.lower().replace(" ", "-"))
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    data: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    slug = data.slug or generate_slug(data.name)

    existing = await db.execute(select(Workspace).where(Workspace.slug == slug))
    if existing.scalar_one_or_none():
        suffix = 1
        while True:
            test_slug = f"{slug}-{suffix}"
            existing = await db.execute(select(Workspace).where(Workspace.slug == test_slug))
            if not existing.scalar_one_or_none():
                slug = test_slug
                break
            suffix += 1

    workspace = Workspace(
        name=data.name,
        slug=slug,
        description=data.description,
        logo_url=data.logo_url,
        owner_id=current_user.id
    )
    db.add(workspace)
    await db.flush()

    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role="owner",
        permissions={"all": True}
    )
    db.add(member)

    free_plan = await db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.slug == "free")
    )
    plan = free_plan.scalar_one_or_none()

    if plan:
        subscription = WorkspaceSubscription(
            workspace_id=workspace.id,
            plan_id=plan.id,
            status="active"
        )
        db.add(subscription)

    await db.commit()
    await db.refresh(workspace)

    return workspace


@router.get("", response_model=List[WorkspaceWithStatsResponse])
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Workspace)
        .join(WorkspaceMember)
        .where(WorkspaceMember.user_id == current_user.id)
        .options(selectinload(Workspace.members))
        .order_by(Workspace.created_at.desc())
    )
    workspaces = result.scalars().all()

    response = []
    for ws in workspaces:
        project_result = await db.execute(
            select(func.count(Project.id))
            .where(Project.workspace_id == ws.id)
        )
        project_count = project_result.scalar() or 0

        member_count = len(ws.members) if ws.members else 0

        today = datetime.utcnow().date()
        jobs_today_result = await db.execute(
            select(func.count(Job.id))
            .join(Task).join(Project)
            .where(
                Project.workspace_id == ws.id,
                func.date(Job.created_at) == today
            )
        )
        jobs_today = jobs_today_result.scalar() or 0

        response.append(WorkspaceWithStatsResponse(
            **{k: getattr(ws, k) for k in WorkspaceResponse.model_fields.keys()},
            member_count=member_count,
            project_count=project_count,
            jobs_today=jobs_today,
            usage_percent=0
        ))

    return response


@router.get("/{workspace_id}", response_model=WorkspaceWithStatsResponse)
async def get_workspace(
    workspace_id: UUID,
    member: WorkspaceMember = Depends(get_workspace_member),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Workspace)
        .where(Workspace.id == workspace_id)
        .options(selectinload(Workspace.members))
    )
    workspace = result.scalar_one_or_none()

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    project_result = await db.execute(
        select(func.count(Project.id))
        .where(Project.workspace_id == workspace.id)
    )
    project_count = project_result.scalar() or 0

    member_count = len(workspace.members) if workspace.members else 0

    today = datetime.utcnow().date()
    jobs_today_result = await db.execute(
        select(func.count(Job.id))
        .join(Task).join(Project)
        .where(
            Project.workspace_id == workspace.id,
            func.date(Job.created_at) == today
        )
    )
    jobs_today = jobs_today_result.scalar() or 0

    return WorkspaceWithStatsResponse(
        **{k: getattr(workspace, k) for k in WorkspaceResponse.model_fields.keys()},
        member_count=member_count,
        project_count=project_count,
        jobs_today=jobs_today,
        usage_percent=0
    )


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: UUID,
    data: WorkspaceUpdate,
    member: WorkspaceMember = Depends(require_role(["owner", "admin"])()),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id)
    )
    workspace = result.scalar_one_or_none()

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(workspace, key, value)

    await db.commit()
    await db.refresh(workspace)

    return workspace


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: UUID,
    member: WorkspaceMember = Depends(require_role(["owner"])()),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id)
    )
    workspace = result.scalar_one_or_none()

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    await db.delete(workspace)
    await db.commit()


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberResponse])
async def list_members(
    workspace_id: UUID,
    member: WorkspaceMember = Depends(get_workspace_member),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WorkspaceMember)
        .where(WorkspaceMember.workspace_id == workspace_id)
        .options(selectinload(WorkspaceMember.user))
    )
    members = result.scalars().all()

    return [
        WorkspaceMemberResponse(
            **{k: getattr(m, k) for k in WorkspaceMemberResponse.model_fields.keys() if k != "user"},
            user=UserResponse(**{k: getattr(m.user, k) for k in UserResponse.model_fields.keys()})
            if m.user else None
        )
        for m in members
    ]


@router.post("/{workspace_id}/members", response_model=WorkspaceMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_member(
    workspace_id: UUID,
    data: WorkspaceMemberCreate,
    member: WorkspaceMember = Depends(require_role(["owner", "admin"])()),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_result = await db.execute(
        select(User).where(User.email == data.user_id)
    )
    new_member_user = user_result.scalar_one_or_none()

    if not new_member_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    existing = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == new_member_user.id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already a member"
        )

    new_member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=new_member_user.id,
        role=data.role,
        permissions=data.permissions or {},
        invited_by=current_user.id
    )
    db.add(new_member)
    await db.commit()
    await db.refresh(new_member)

    return new_member


@router.patch("/{workspace_id}/members/{member_id}", response_model=WorkspaceMemberResponse)
async def update_member(
    workspace_id: UUID,
    member_id: UUID,
    data: dict,
    current_member: WorkspaceMember = Depends(require_role(["owner", "admin"])()),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.id == member_id
        )
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )

    if "role" in data:
        member.role = data["role"]
    if "permissions" in data:
        member.permissions = data["permissions"]

    await db.commit()
    await db.refresh(member)

    return member


@router.delete("/{workspace_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    workspace_id: UUID,
    member_id: UUID,
    current_member: WorkspaceMember = Depends(require_role(["owner", "admin"])()),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.id == member_id
        )
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )

    if member.role == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove owner"
        )

    await db.delete(member)
    await db.commit()


from app.schemas import UserResponse
