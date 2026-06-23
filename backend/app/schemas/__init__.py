from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, EmailStr
from enum import Enum


class JobStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"


class TaskType(str, Enum):
    WEB_SCRAPER = "web_scraper"
    BROWSER_AUTOMATION = "browser_automation"
    API_SCRAPER = "api_scraper"
    WORKFLOW = "workflow"
    BULK_TASK = "bulk_task"


class ScheduleType(str, Enum):
    MANUAL = "manual"
    ONCE = "once"
    CRON = "cron"
    RECURRING = "recurring"


# Base schemas
class TimestampMixin(BaseModel):
    created_at: datetime
    updated_at: Optional[datetime] = None


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None


class UserResponse(UserBase, TimestampMixin):
    id: UUID
    role: str

    class Config:
        from_attributes = True


# Workspace schemas
class WorkspaceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=3, max_length=255, pattern=r"^[a-z0-9-]+$")
    description: Optional[str] = None
    logo_url: Optional[str] = None


class WorkspaceCreate(WorkspaceBase):
    pass


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class WorkspaceResponse(WorkspaceBase, TimestampMixin):
    id: UUID
    owner_id: UUID
    settings: Dict[str, Any]

    class Config:
        from_attributes = True


class WorkspaceWithStatsResponse(WorkspaceResponse):
    member_count: int = 0
    project_count: int = 0
    jobs_today: int = 0
    usage_percent: float = 0


# Workspace Member schemas
class WorkspaceMemberBase(BaseModel):
    user_id: UUID
    role: str = "member"
    permissions: Optional[Dict[str, Any]] = None


class WorkspaceMemberCreate(WorkspaceMemberBase):
    pass


class WorkspaceMemberUpdate(BaseModel):
    role: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None


class WorkspaceMemberResponse(WorkspaceMemberBase, TimestampMixin):
    id: UUID
    workspace_id: UUID
    invited_by: Optional[UUID] = None
    joined_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# Project schemas
class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=3, max_length=255, pattern=r"^[a-z0-9-]+$")
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    tags: Optional[List[str]] = []


class ProjectCreate(ProjectBase):
    workspace_id: UUID


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    tags: Optional[List[str]] = None
    settings: Optional[Dict[str, Any]] = None


class ProjectResponse(ProjectBase, TimestampMixin):
    id: UUID
    workspace_id: UUID
    created_by: UUID
    settings: Dict[str, Any]

    class Config:
        from_attributes = True


class ProjectWithStatsResponse(ProjectResponse):
    task_count: int = 0
    active_jobs: int = 0
    total_items: int = 0


# Task schemas
class TaskConfigBase(BaseModel):
    url: Optional[str] = None
    selector: Optional[str] = None
    extract_pattern: Optional[Dict[str, Any]] = None
    pages: Optional[int] = None
    wait_selector: Optional[str] = None
    actions: Optional[List[Dict[str, Any]]] = None


class TaskBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    type: TaskType
    config: TaskConfigBase
    schedule_type: ScheduleType = ScheduleType.MANUAL
    schedule_cron: Optional[str] = None
    schedule_timezone: str = "UTC"
    priority: int = Field(5, ge=1, le=10)
    timeout_seconds: int = Field(3600, ge=60, le=86400)
    max_retries: int = Field(3, ge=0, le=10)
    retry_delay_seconds: int = Field(60, ge=10, le=3600)
    tags: Optional[List[str]] = []


class TaskCreate(TaskBase):
    project_id: UUID


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    config: Optional[TaskConfigBase] = None
    schedule_type: Optional[ScheduleType] = None
    schedule_cron: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    tags: Optional[List[str]] = None


class TaskResponse(TaskBase, TimestampMixin):
    id: UUID
    project_id: UUID
    created_by: UUID
    is_active: bool

    class Config:
        from_attributes = True


class TaskWithStatsResponse(TaskResponse):
    total_jobs: int = 0
    successful_jobs: int = 0
    failed_jobs: int = 0
    last_run: Optional[datetime] = None
    avg_duration_ms: Optional[int] = None


# Job schemas
class JobBase(BaseModel):
    task_id: UUID
    input: Optional[Dict[str, Any]] = None
    priority: int = 5


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    status: Optional[JobStatus] = None
    output: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


class JobResponse(JobBase, TimestampMixin):
    id: UUID
    status: JobStatus
    output: Optional[Dict[str, Any]] = None
    result_url: Optional[str] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    memory_used_mb: Optional[float] = None
    cpu_time_seconds: Optional[float] = None
    pages_extracted: int = 0
    items_extracted: int = 0
    retry_count: int = 0
    worker_id: Optional[str] = None
    metadata: Dict[str, Any] = {}

    class Config:
        from_attributes = True


class JobLogResponse(BaseModel):
    id: UUID
    job_id: UUID
    level: str
    message: str
    timestamp: datetime
    metadata: Dict[str, Any] = {}

    class Config:
        from_attributes = True


# Workflow schemas
class WorkflowNodeBase(BaseModel):
    id: str
    type: str
    position: Dict[str, float]
    data: Dict[str, Any]


class WorkflowEdgeBase(BaseModel):
    id: str
    source: str
    target: str
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None
    label: Optional[str] = None


class WorkflowDefinition(BaseModel):
    nodes: List[WorkflowNodeBase]
    edges: List[WorkflowEdgeBase]
    settings: Optional[Dict[str, Any]] = None


class WorkflowBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    definition: WorkflowDefinition


class WorkflowCreate(WorkflowBase):
    project_id: UUID
    is_template: bool = False
    template_category: Optional[str] = None


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    definition: Optional[WorkflowDefinition] = None
    change_description: Optional[str] = None


class WorkflowResponse(WorkflowBase, TimestampMixin):
    id: UUID
    project_id: UUID
    version: int
    is_template: bool
    template_category: Optional[str] = None
    created_by: UUID

    class Config:
        from_attributes = True


# API Key schemas
class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    workspace_id: Optional[UUID] = None
    scopes: Optional[List[str]] = []
    expires_at: Optional[datetime] = None


class ApiKeyResponse(BaseModel):
    id: UUID
    name: str
    key_prefix: str
    key: Optional[str] = None
    workspace_id: Optional[UUID] = None
    scopes: List[str]
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    created_at: datetime
    revoked_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Data Store schemas
class DataStoreBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    format: str = "json"


class DataStoreCreate(DataStoreBase):
    project_id: UUID
    job_id: Optional[UUID] = None
    schema: Optional[Dict[str, Any]] = None


class DataStoreResponse(DataStoreBase, TimestampMixin):
    id: UUID
    project_id: UUID
    job_id: Optional[UUID] = None
    schema: Optional[Dict[str, Any]] = None
    storage_path: Optional[str] = None
    row_count: int
    size_bytes: int

    class Config:
        from_attributes = True


class DataStoreItemResponse(BaseModel):
    id: UUID
    data: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


# Marketplace schemas
class MarketplaceTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = []
    workflow_definition: WorkflowDefinition
    icon: Optional[str] = None
    price: float = 0
    is_free: bool = True


class MarketplaceTemplateResponse(MarketplaceTemplateCreate, TimestampMixin):
    id: UUID
    author_id: UUID
    is_published: bool
    downloads: int
    rating_avg: float
    rating_count: int

    class Config:
        from_attributes = True


# Notification schemas
class NotificationResponse(BaseModel):
    id: UUID
    type: str
    title: str
    message: Optional[str] = None
    data: Dict[str, Any] = {}
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Stats schemas
class UsageStatsResponse(BaseModel):
    date: datetime
    jobs_total: int
    jobs_succeeded: int
    jobs_failed: int
    total_duration_seconds: int
    api_calls: int
    pages_scraped: int

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_jobs: int
    active_jobs: int
    queued_jobs: int
    completed_jobs_24h: int
    failed_jobs_24h: int
    total_items_extracted: int
    avg_job_duration_ms: float
    success_rate: float


# Pagination schemas
class PaginatedResponse(BaseModel, Generic[Any]):
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


# Export schemas
class ExportRequest(BaseModel):
    data_store_id: UUID
    format: str = Field("json", pattern="^(json|csv|excel)$")
    fields: Optional[List[str]] = None
    filters: Optional[Dict[str, Any]] = None
    limit: Optional[int] = None


# Auth responses
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OAuthLoginRequest(BaseModel):
    provider: str = Field(..., pattern="^(google|github)$")
    code: str
    redirect_uri: str


# Audit log schemas
class AuditLogResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[UUID] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
