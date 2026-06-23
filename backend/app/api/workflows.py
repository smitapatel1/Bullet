from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
import json

from app.core.database import get_db
from app.api.deps import get_current_user, get_workspace_member
from app.models import (
    User, WorkspaceMember, Project, Workflow, WorkflowVersion,
    MarketplaceTemplate, TemplateReview
)
from app.schemas import (
    WorkflowCreate, WorkflowUpdate, WorkflowResponse, WorkflowDefinition,
    MarketplaceTemplateCreate, MarketplaceTemplateResponse
)

router = APIRouter(prefix="/workflows", tags=["Workflows"])
marketplace_router = APIRouter(prefix="/marketplace", tags=["Marketplace"])


@router.post("", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    data: WorkflowCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    project = await db.execute(select(Project).where(Project.id == data.project_id))
    if not project.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    workflow = Workflow(
        project_id=data.project_id,
        name=data.name,
        description=data.description,
        definition=data.definition.model_dump(),
        is_template=data.is_template,
        template_category=data.template_category,
        created_by=current_user.id
    )
    db.add(workflow)
    await db.flush()

    version = WorkflowVersion(
        workflow_id=workflow.id,
        version=1,
        definition=data.definition.model_dump(),
        change_description="Initial version",
        created_by=current_user.id
    )
    db.add(version)

    await db.commit()
    await db.refresh(workflow)

    return workflow


@router.get("/project/{project_id}", response_model=List[WorkflowResponse])
async def list_workflows(
    project_id: UUID,
    member: WorkspaceMember = Depends(get_workspace_member),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Workflow)
        .where(Workflow.project_id == project_id)
        .order_by(Workflow.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Workflow)
        .where(Workflow.id == workflow_id)
        .options(selectinload(Workflow.project).selectinload(Project.workspace))
    )
    workflow = result.scalar_one_or_none()

    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    return workflow


@router.patch("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: UUID,
    data: WorkflowUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id)
    )
    workflow = result.scalar_one_or_none()

    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    update_data = data.model_dump(exclude_unset=True)

    if 'definition' in update_data:
        update_data['definition'] = update_data['definition'].model_dump()
        workflow.version += 1

        version = WorkflowVersion(
            workflow_id=workflow.id,
            version=workflow.version,
            definition=update_data['definition'],
            change_description=data.change_description,
            created_by=current_user.id
        )
        db.add(version)

    for key, value in update_data.items():
        setattr(workflow, key, value)

    await db.commit()
    await db.refresh(workflow)

    return workflow


@router.get("/{workflow_id}/versions", response_model=List[dict])
async def list_workflow_versions(
    workflow_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WorkflowVersion)
        .where(WorkflowVersion.workflow_id == workflow_id)
        .order_by(WorkflowVersion.version.desc())
    )
    versions = result.scalars().all()

    return [
        {
            "id": str(v.id),
            "version": v.version,
            "change_description": v.change_description,
            "created_at": v.created_at.isoformat(),
            "created_by": str(v.created_by)
        }
        for v in versions
    ]


@router.post("/{workflow_id}/restore/{version_num}", response_model=WorkflowResponse)
async def restore_workflow_version(
    workflow_id: UUID,
    version_num: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    workflow = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id)
    )
    workflow = workflow.scalar_one_or_none()

    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    version = await db.execute(
        select(WorkflowVersion).where(
            WorkflowVersion.workflow_id == workflow_id,
            WorkflowVersion.version == version_num
        )
    )
    version = version.scalar_one_or_none()

    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")

    new_version = workflow.version + 1
    new_version_record = WorkflowVersion(
        workflow_id=workflow.id,
        version=new_version,
        definition=version.definition,
        change_description=f"Restored from version {version_num}",
        created_by=current_user.id
    )
    db.add(new_version_record)

    workflow.definition = version.definition
    workflow.version = new_version
    workflow.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(workflow)

    return workflow


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id)
    )
    workflow = result.scalar_one_or_none()

    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    await db.delete(workflow)
    await db.commit()


@marketplace_router.get("", response_model=List[MarketplaceTemplateResponse])
async def list_marketplace_templates(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query("popular"),
    db: AsyncSession = Depends(get_db)
):
    query = select(MarketplaceTemplate).where(MarketplaceTemplate.is_published == True)

    if category:
        query = query.where(MarketplaceTemplate.category == category)

    if search:
        query = query.where(
            MarketplaceTemplate.name.ilike(f"%{search}%") |
            MarketplaceTemplate.description.ilike(f"%{search}%")
        )

    if sort == "popular":
        query = query.order_by(MarketplaceTemplate.downloads.desc())
    elif sort == "rating":
        query = query.order_by(MarketplaceTemplate.rating_avg.desc())
    elif sort == "newest":
        query = query.order_by(MarketplaceTemplate.created_at.desc())

    result = await db.execute(query)
    return result.scalars().all()


@marketplace_router.get("/categories", response_model=List[str])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MarketplaceTemplate.category)
        .where(MarketplaceTemplate.is_published == True)
        .distinct()
    )
    return [r[0] for r in result.fetchall() if r[0]]


@marketplace_router.get("/{template_id}", response_model=MarketplaceTemplateResponse)
async def get_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(MarketplaceTemplate).where(MarketplaceTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    return template


@marketplace_router.post("", response_model=MarketplaceTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: MarketplaceTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(
        select(MarketplaceTemplate).where(MarketplaceTemplate.slug == data.slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already exists")

    template = MarketplaceTemplate(
        author_id=current_user.id,
        name=data.name,
        slug=data.slug,
        description=data.description,
        category=data.category,
        tags=data.tags or [],
        workflow_definition=data.workflow_definition.model_dump(),
        icon=data.icon,
        price=data.price,
        is_free=data.is_free
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)

    return template


@marketplace_router.post("/{template_id}/publish", response_model=MarketplaceTemplateResponse)
async def publish_template(
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(MarketplaceTemplate).where(
            MarketplaceTemplate.id == template_id,
            MarketplaceTemplate.author_id == current_user.id
        )
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    template.is_published = True
    await db.commit()
    await db.refresh(template)

    return template


@marketplace_router.post("/{template_id}/use", response_model=WorkflowResponse)
async def use_template(
    template_id: UUID,
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(MarketplaceTemplate).where(MarketplaceTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    project = await db.execute(select(Project).where(Project.id == project_id))
    if not project.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    workflow = Workflow(
        project_id=project_id,
        name=template.name,
        description=template.description,
        definition=template.workflow_definition,
        created_by=current_user.id
    )
    db.add(workflow)

    template.downloads += 1

    await db.commit()
    await db.refresh(workflow)

    return workflow


@marketplace_router.post("/{template_id}/review")
async def review_template(
    template_id: UUID,
    rating: int,
    comment: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(
        select(TemplateReview).where(
            TemplateReview.template_id == template_id,
            TemplateReview.user_id == current_user.id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already reviewed")

    review = TemplateReview(
        template_id=template_id,
        user_id=current_user.id,
        rating=rating,
        comment=comment
    )
    db.add(review)

    template = await db.execute(
        select(MarketplaceTemplate).where(MarketplaceTemplate.id == template_id)
    )
    template = template.scalar_one()

    avg_result = await db.execute(
        select(func.avg(TemplateReview.rating), func.count(TemplateReview.id))
        .where(TemplateReview.template_id == template_id)
    )
    avg, count = avg_result.first()

    template.rating_avg = avg or rating
    template.rating_count = count or 1

    await db.commit()

    return {"message": "Review added successfully"}
