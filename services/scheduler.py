import asyncio
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from sqlalchemy import select

from database import async_session
from models import ScheduledUpload
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

    scheduler.start()
    logger.info("Scheduler started")
