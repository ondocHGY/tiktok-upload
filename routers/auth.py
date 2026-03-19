import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import TikTokAccount
from schemas import AccountResponse
from services.tiktok_auth import (
    ensure_valid_token,
    exchange_code,
    get_authorize_url,
    get_code_verifier,
)

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")

router = APIRouter(prefix="/auth", tags=["auth"])


class AdminLoginPayload(BaseModel):
    password: str


@router.post("/admin/login")
async def admin_login(payload: AdminLoginPayload):
    """Validate admin password."""
    if payload.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")
    return {"message": "Login successful"}


@router.get("/login")
async def login():
    """Return the TikTok OAuth2 authorization URL for the frontend to redirect."""
    state = secrets.token_urlsafe(32)
    url = get_authorize_url(state)
    return {"auth_url": url}


class CallbackPayload(BaseModel):
    code: str
    state: str


@router.post("/callback")
async def callback(
    payload: CallbackPayload,
    db: AsyncSession = Depends(get_db),
):
    """Handle the OAuth2 callback forwarded from the frontend."""
    code_verifier = get_code_verifier(payload.state)
    if not code_verifier:
        raise HTTPException(status_code=400, detail="Invalid or expired state parameter")
    data = await exchange_code(payload.code, code_verifier)

    open_id = data.get("open_id", "")
    access_token = data.get("access_token", "")
    refresh_token = data.get("refresh_token", "")
    expires_in = data.get("expires_in", 86400)
    refresh_expires_in = data.get("refresh_expires_in", 86400 * 365)

    now = datetime.now(timezone.utc)

    # Upsert account
    result = await db.execute(
        select(TikTokAccount).where(TikTokAccount.open_id == open_id)
    )
    account = result.scalar_one_or_none()

    if account is None:
        account = TikTokAccount(
            open_id=open_id,
            display_name=data.get("display_name", ""),
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=now + timedelta(seconds=expires_in),
            refresh_expires_at=now + timedelta(seconds=refresh_expires_in),
        )
        db.add(account)
    else:
        account.access_token = access_token
        account.refresh_token = refresh_token
        account.token_expires_at = now + timedelta(seconds=expires_in)
        account.refresh_expires_at = now + timedelta(seconds=refresh_expires_in)
        if data.get("display_name"):
            account.display_name = data["display_name"]
        db.add(account)

    await db.flush()

    return {"message": "Account connected", "open_id": open_id}


@router.post("/refresh/{account_id}")
async def refresh_token(account_id: int, db: AsyncSession = Depends(get_db)):
    """Manually refresh the access token for an account."""
    result = await db.execute(
        select(TikTokAccount).where(TikTokAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")

    new_token = await ensure_valid_token(account, db)
    return {"access_token": new_token, "message": "Token refreshed"}


@router.get("/accounts", response_model=list[AccountResponse])
async def list_accounts(db: AsyncSession = Depends(get_db)):
    """List all connected TikTok accounts."""
    result = await db.execute(select(TikTokAccount))
    accounts = result.scalars().all()
    return accounts


@router.delete("/accounts/{account_id}")
async def delete_account(account_id: int, db: AsyncSession = Depends(get_db)):
    """Remove a connected TikTok account and its uploads."""
    result = await db.execute(
        select(TikTokAccount).where(TikTokAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")

    await db.delete(account)
    return {"message": "Account deleted"}
