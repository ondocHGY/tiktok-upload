import asyncio
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select

from database import async_session
from models import ScheduledUpload, TikTokAccount
from services.tiktok_upload import execute_upload

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def run_scheduled_upload(schedule_id: int) -> None:
    """Wrapper around execute_upload with top-level error handling."""
    try:
        logger.info("Starting scheduled upload for schedule_id=%s", schedule_id)
        await execute_upload(schedule_id)
        logger.info("Completed scheduled upload for schedule_id=%s", schedule_id)
    except Exception:
        logger.exception(
            "Unhandled error in scheduled upload for schedule_id=%s", schedule_id
        )


def add_upload_job(schedule_id: int, run_time: datetime) -> None:
    """Add a single DateTrigger job to the scheduler."""
    job_id = f"upload_{schedule_id}"
    scheduler.add_job(
        run_scheduled_upload,
        trigger=DateTrigger(run_date=run_time),
        id=job_id,
        args=[schedule_id],
        replace_existing=True,
    )
    logger.info("Added job %s for %s", job_id, run_time)


def remove_upload_job(schedule_id: int) -> None:
    """Remove a scheduled job if it exists."""
    job_id = f"upload_{schedule_id}"
    try:
        scheduler.remove_job(job_id)
        logger.info("Removed job %s", job_id)
    except Exception:
        logger.debug("Job %s not found; nothing to remove", job_id)


async def refresh_all_tokens() -> None:
    """Force-refresh access tokens for all connected TikTok accounts.

    Unlike ``ensure_valid_token`` (which only refreshes when the current token
    is already near expiry), this job unconditionally rotates every account's
    access_token / refresh_token on its schedule, so tokens never get close to
    expiry unnoticed.
    """
    from datetime import datetime, timedelta, timezone

    from services.tiktok_auth import refresh_access_token

    async with async_session() as db:
        result = await db.execute(select(TikTokAccount))
        accounts = result.scalars().all()
        for account in accounts:
            now = datetime.now(timezone.utc)
            if account.refresh_expires_at and account.refresh_expires_at.replace(
                tzinfo=timezone.utc
            ) <= now:
                logger.warning(
                    "Skipping account_id=%s: refresh_token expired, re-auth required",
                    account.id,
                )
                continue
            try:
                data = await refresh_access_token(account.refresh_token)
                account.access_token = data["access_token"]
                if data.get("refresh_token"):
                    account.refresh_token = data["refresh_token"]
                account.token_expires_at = now + timedelta(seconds=data["expires_in"])
                if data.get("refresh_expires_in"):
                    account.refresh_expires_at = now + timedelta(
                        seconds=data["refresh_expires_in"]
                    )
                db.add(account)
                await db.commit()
                await db.refresh(account)
                logger.info(
                    "Token refreshed for account_id=%s (new expiry=%s)",
                    account.id,
                    account.token_expires_at,
                )
            except Exception:
                await db.rollback()
                logger.exception("Failed to refresh token for account_id=%s", account.id)


async def setup_scheduler() -> None:
    """
    Initialize the scheduler and reload all pending uploads from the database
    so that jobs survive server restarts.
    """
    async with async_session() as db:
        result = await db.execute(
            select(ScheduledUpload).where(ScheduledUpload.status == "pending")
        )
        pending = result.scalars().all()

        for upload in pending:
            add_upload_job(upload.id, upload.scheduled_time)

        logger.info("Loaded %d pending upload jobs into scheduler", len(pending))

        # uploading 상태로 고착된 레코드 복구 (서버 재시작 시 처리 중이던 항목)
        stuck_result = await db.execute(
            select(ScheduledUpload).where(ScheduledUpload.status == "uploading")
        )
        stuck = stuck_result.scalars().all()
        for upload in stuck:
            upload.status = "failed"
            upload.error_message = "서버 재시작으로 인해 업로드가 중단되었습니다."
            db.add(upload)
        if stuck:
            await db.commit()
            logger.warning("Reset %d stuck 'uploading' records to 'failed'", len(stuck))

    scheduler.add_job(
        refresh_all_tokens,
        trigger=IntervalTrigger(hours=12),
        id="token_refresh",
        replace_existing=True,
    )
    logger.info("Token refresh job scheduled every 12 hours")

    scheduler.start()
    logger.info("Scheduler started")
