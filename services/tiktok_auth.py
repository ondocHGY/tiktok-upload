import base64
import hashlib
import secrets as secrets_mod
import urllib.parse
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models import TikTokAccount

TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/"
TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"

SCOPES = "user.info.basic,video.publish,video.upload"

# In-memory store for PKCE code_verifier (keyed by state)
_pkce_store: dict[str, str] = {}


def _generate_code_verifier() -> str:
    """Generate a random code_verifier (43-128 chars, URL-safe)."""
    return secrets_mod.token_urlsafe(64)


def _generate_code_challenge(code_verifier: str) -> str:
    """Derive code_challenge = BASE64URL(SHA256(code_verifier))."""
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


def get_authorize_url(state: str) -> str:
    """Build the TikTok OAuth2 authorization URL with PKCE."""
    code_verifier = _generate_code_verifier()
    code_challenge = _generate_code_challenge(code_verifier)

    # Store verifier so we can use it in the token exchange
    _pkce_store[state] = code_verifier

    params = {
        "client_key": settings.TT_CLIENT_KEY,
        "scope": SCOPES,
        "response_type": "code",
        "redirect_uri": settings.TT_REDIRECT_URI,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    return f"{TIKTOK_AUTH_URL}?{urllib.parse.urlencode(params)}"


def get_code_verifier(state: str) -> str:
    """Retrieve and remove the code_verifier for a given state."""
    return _pkce_store.pop(state, "")


async def exchange_code(code: str, code_verifier: str) -> dict:
    """Exchange an authorization code for access + refresh tokens (with PKCE)."""
    payload = {
        "client_key": settings.TT_CLIENT_KEY,
        "client_secret": settings.TT_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.TT_REDIRECT_URI,
        "code_verifier": code_verifier,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            TIKTOK_TOKEN_URL,
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        return resp.json()


async def refresh_access_token(refresh_token: str) -> dict:
    """Use a refresh token to obtain a new access token."""
    payload = {
        "client_key": settings.TT_CLIENT_KEY,
        "client_secret": settings.TT_CLIENT_SECRET,
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            TIKTOK_TOKEN_URL,
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        return resp.json()


async def ensure_valid_token(account: TikTokAccount, db: AsyncSession) -> str:
    """Return a valid access token, refreshing it first if expired."""
    now = datetime.now(timezone.utc)

    # If the token is still valid (with a 5-minute buffer), return it as-is
    if account.token_expires_at and account.token_expires_at.replace(
        tzinfo=timezone.utc
    ) > now + timedelta(minutes=5):
        return account.access_token

    # Token expired or about to expire -- refresh it
    data = await refresh_access_token(account.refresh_token)

    account.access_token = data["access_token"]
    account.refresh_token = data["refresh_token"]
    account.token_expires_at = now + timedelta(seconds=data["expires_in"])
    account.refresh_expires_at = now + timedelta(
        seconds=data["refresh_expires_in"]
    )

    db.add(account)
    await db.commit()
    await db.refresh(account)

    return account.access_token
