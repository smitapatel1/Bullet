from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models import User, Notification, WorkspaceMember, AuditLog, Workspace

router = APIRouter(prefix="/notifications", tags=["Notifications"])
audit_router = APIRouter(prefix="/audit", tags=["Audit Logs"])


class NotificationCreate(BaseModel):
    user_id: UUID
    type: str
    title: str
    message: Optional[str] = None
    data: Optional[dict] = None


class NotificationConnectionManager:
    def __init__(self):
        self.active_connections: dict[UUID, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: UUID):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: UUID):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send(self, user_id: UUID, notification: dict):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(notification)


notification_manager = NotificationConnectionManager()


@router.get("", response_model=List[dict])
async def list_notifications(
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Notification).where(Notification.user_id == current_user.id)

    if unread_only:
        query = query.where(Notification.read_at.is_(None))

    query = query.order_by(Notification.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    notifications = result.scalars().all()

    return [
        {
            "id": str(n.id),
            "type": n.type,
            "title": n.title,
            "message": n.message,
            "data": n.data,
            "read_at": n.read_at.isoformat() if n.read_at else None,
            "created_at": n.created_at.isoformat()
        }
        for n in notifications
    ]


@router.get("/count")
async def get_notification_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    total_result = await db.execute(
        select(func.count(Notification.id))
        .where(Notification.user_id == current_user.id)
    )
    unread_result = await db.execute(
        select(func.count(Notification.id))
        .where(
            Notification.user_id == current_user.id,
            Notification.read_at.is_(None)
        )
    )

    return {
        "total": total_result.scalar() or 0,
        "unread": unread_result.scalar() or 0
    }


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_as_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notification.read_at = datetime.utcnow()
    await db.commit()


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.read_at.is_(None)
        )
        .values(read_at=datetime.utcnow())
    )
    await db.commit()


@router.websocket("/ws")
async def notifications_websocket(
    websocket: WebSocket,
    current_user: User = Depends(get_current_user)
):
    await notification_manager.connect(websocket, current_user.id)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"ping: {data}")
    except WebSocketDisconnect:
        notification_manager.disconnect(current_user.id)


async def create_notification(
    user_id: UUID,
    notification_type: str,
    title: str,
    message: str = None,
    data: dict = None,
    db: AsyncSession = None
):
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        data=data or {}
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)

    await notification_manager.send(user_id, {
        "id": str(notification.id),
        "type": notification_type,
        "title": title,
        "message": message,
        "data": data,
        "created_at": notification.created_at.isoformat()
    })

    return notification


@audit_router.get("/workspace/{workspace_id}")
async def get_audit_logs(
    workspace_id: UUID,
    action: Optional[str] = Query(None),
    user_id: Optional[UUID] = Query(None),
    resource_type: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    member: WorkspaceMember = Depends(get_workspace_member),
    db: AsyncSession = Depends(get_db)
):
    query = select(AuditLog).where(AuditLog.workspace_id == workspace_id)

    if action:
        query = query.where(AuditLog.action.ilike(f"%{action}%"))
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    if start_date:
        query = query.where(AuditLog.created_at >= start_date)
    if end_date:
        query = query.where(AuditLog.created_at <= end_date)

    query = query.order_by(AuditLog.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    logs = result.scalars().all()

    return [
        {
            "id": str(log.id),
            "user_id": str(log.user_id) if log.user_id else None,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": str(log.resource_id) if log.resource_id else None,
            "old_values": log.old_values,
            "new_values": log.new_values,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ]


async def create_audit_log(
    workspace_id: UUID,
    user_id: UUID,
    action: str,
    resource_type: str = None,
    resource_id: UUID = None,
    old_values: dict = None,
    new_values: dict = None,
    request = None,
    db: AsyncSession = None
):
    ip_address = None
    user_agent = None

    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

    log = AuditLog(
        workspace_id=workspace_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)

    return log
