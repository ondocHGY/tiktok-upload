import logging
import os

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import async_session
from models import ScheduledUpload, TikTokAccount
from services.tiktok_auth import ensure_valid_token

logger = logging.getLogger(__name__)

BASE_URL = "https://open.tiktokapis.com"
DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024  # 10 MB


async def query_creator_info(access_token: str) -> dict:
    """Query creator info to get publish permissions and limits."""
    url = f"{BASE_URL}/v2/post/publish/creator_info/query/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=UTF-8",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers)
        resp.raise_for_status()
        return resp.json()


async def init_video_upload(
    access_token: str,
    video_size: int,
    chunk_size: int,
    title: str,
    privacy_level: str,
    disable_comment: bool,
    disable_duet: bool,
    disable_stitch: bool,
) -> dict:
    """Initialize a video upload via the TikTok Content Posting API (FILE_UPLOAD)."""
    url = f"{BASE_URL}/v2/post/publish/video/init/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=UTF-8",
    }
    total_chunk_count = -(-video_size // chunk_size)  # ceiling division
    payload = {
        "post_info": {
            "title": title,
            "privacy_level": privacy_level,
            "disable_comment": disable_comment,
            "disable_duet": disable_duet,
            "disable_stitch": disable_stitch,
        },
        "source_info": {
            "source": "FILE_UPLOAD",
            "video_size": video_size,
            "chunk_size": chunk_size,
            "total_chunk_count": total_chunk_count,
        },
    }
    logger.info("init_video_upload payload: %s", payload)
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, json=payload)
        logger.info("init_video_upload response: %s %s", resp.status_code, resp.text)
        resp.raise_for_status()
        return resp.json()


async def upload_video_chunks(
    upload_url: str,
    file_path: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
) -> None:
    """Read a video file and PUT it in chunks with Content-Range headers."""
    file_size = os.path.getsize(file_path)

    async with httpx.AsyncClient(timeout=httpx.Timeout(300.0)) as client:
        with open(file_path, "rb") as f:
            offset = 0
            while offset < file_size:
                chunk = f.read(chunk_size)
                end = offset + len(chunk) - 1
                headers = {
                    "Content-Range": f"bytes {offset}-{end}/{file_size}",
                    "Content-Type": "video/mp4",
                }
                resp = await client.put(upload_url, content=chunk, headers=headers)
                resp.raise_for_status()
                offset += len(chunk)


async def check_publish_status(access_token: str, publish_id: str) -> dict:
    """Check the status of a published video."""
    url = f"{BASE_URL}/v2/post/publish/status/fetch/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=UTF-8",
    }
    payload = {"publish_id": publish_id}
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        return resp.json()


async def execute_upload(schedule_id: int) -> None:
    """
    Main upload orchestrator.

    1. Load the schedule from DB
    2. Refresh the TikTok access token if needed
    3. Initialize the upload
    4. Upload video chunks
    5. Poll publish status
    6. Update the DB record
    """
    async with async_session() as db:
        # Load schedule
        result = await db.execute(
            select(ScheduledUpload).where(ScheduledUpload.id == schedule_id)
        )
        schedule = result.scalar_one_or_none()
        if schedule is None:
            logger.error("Schedule %s not found", schedule_id)
            return

        # Mark as uploading
        schedule.status = "uploading"
        db.add(schedule)
        await db.commit()

        try:
            # Load account
            result = await db.execute(
                select(TikTokAccount).where(
                    TikTokAccount.id == schedule.account_id
                )
            )
            account = result.scalar_one_or_none()
            if account is None:
                raise ValueError(f"Account {schedule.account_id} not found")

            # Ensure valid token
            access_token = await ensure_valid_token(account, db)

            # Resolve video path
            video_path = os.path.join(settings.VIDEO_DIR, schedule.video_filename)
            if not os.path.isfile(video_path):
                raise FileNotFoundError(f"Video file not found: {video_path}")

            video_size = os.path.getsize(video_path)
            chunk_size = min(DEFAULT_CHUNK_SIZE, video_size)

            # Init upload
            init_resp = await init_video_upload(
                access_token=access_token,
                video_size=video_size,
                chunk_size=chunk_size,
                title=schedule.title,
                privacy_level=schedule.privacy_level,
                disable_comment=schedule.disable_comment,
                disable_duet=schedule.disable_duet,
                disable_stitch=schedule.disable_stitch,
            )

            data = init_resp.get("data", {})
            publish_id = data.get("publish_id", "")
            upload_url = data.get("upload_url", "")

            if not upload_url:
                raise ValueError(
                    f"No upload_url in init response: {init_resp}"
                )

            # Upload chunks
            await upload_video_chunks(upload_url, video_path, chunk_size)

            # Poll publish status (simple retry loop)
            import asyncio

            final_status = "uploading"
            for _ in range(30):
                await asyncio.sleep(5)
                status_resp = await check_publish_status(access_token, publish_id)
                status_data = status_resp.get("data", {})
                pub_status = status_data.get("status", "PROCESSING_UPLOAD")
                if pub_status == "PUBLISH_COMPLETE":
                    final_status = "published"
                    break
                elif pub_status in ("FAILED", "PUBLISH_FAILED"):
                    fail_reason = status_data.get("fail_reason", "unknown")
                    raise RuntimeError(
                        f"TikTok publish failed: {fail_reason}"
                    )
                # else still processing, keep polling

            schedule.publish_id = publish_id
            schedule.status = final_status
            schedule.error_message = None

        except Exception as exc:
            logger.exception("Upload failed for schedule %s", schedule_id)
            schedule.status = "failed"
            schedule.error_message = str(exc)

        db.add(schedule)
        await db.commit()
