from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.workspaces import router as workspaces_router
from app.api.projects import router as projects_router
from app.api.jobs import router as jobs_router
from app.api.workflows import router as workflows_router, marketplace_router
from app.api.api_keys import router as api_keys_router, data_router
from app.api.notifications import router as notifications_router, audit_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(workspaces_router)
api_router.include_router(projects_router)
api_router.include_router(jobs_router)
api_router.include_router(workflows_router)
api_router.include_router(marketplace_router)
api_router.include_router(api_keys_router)
api_router.include_router(data_router)
api_router.include_router(notifications_router)
api_router.include_router(audit_router)
