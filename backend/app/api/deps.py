from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import decode_token
from app.models import User, WorkspaceMember, ApiKey

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        # Try API key authentication
        api_key_user = await authenticate_api_key(request, token, db)
        if api_key_user:
            return api_key_user

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user


async def authenticate_api_key(request: Request, token: str, db: AsyncSession) -> Optional[User]:
    if not token.startswith("df_"):
        return None

    key_prefix = f"df_{token[3:11]}"
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.key_prefix == key_prefix,
            ApiKey.revoked_at.is_(None),
            (ApiKey.expires_at.is_(None) | (ApiKey.expires_at > datetime.utcnow()))
        )
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        return None

    from app.core.security import verify_api_key
    if not verify_api_key(token, api_key.key_hash):
        return None

    api_key.last_used_at = datetime.utcnow()
    await db.commit()

    result = await db.execute(select(User).where(User.id == api_key.user_id))
    return result.scalar_one_or_none()


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    return current_user


async def get_workspace_member(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> WorkspaceMember:
    from uuid import UUID
    try:
        ws_id = UUID(workspace_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace ID"
        )

    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == ws_id,
            WorkspaceMember.user_id == current_user.id
        )
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this workspace"
        )

    return member


def require_role(roles: list[str]):
    async def role_checker(
        member: WorkspaceMember = Depends(get_workspace_member)
    ) -> WorkspaceMember:
        if member.role not in roles and member.role not in ["owner"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return member
    return role_checker


class RateLimiter:
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self._cache = {}

    async def __call__(self, request: Request, user: User = Depends(get_current_user)):
        import time
        key = f"ratelimit:{user.id}"
        now = time.time()

        if key in self._cache:
            timestamps = self._cache[key]
            timestamps = [t for t in timestamps if now - t < 60]

            if len(timestamps) >= self.requests_per_minute:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded"
                )

            timestamps.append(now)
            self._cache[key] = timestamps
        else:
            self._cache[key] = [now]


rate_limiter = RateLimiter()


from datetime import datetime
