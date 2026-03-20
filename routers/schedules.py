import asyncio
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from models import ScheduledUpload
from schemas import ScheduleCreate, ScheduleResponse, ScheduleUpdate
from services.scheduler import add_upload_job, remove_upload_job
from services.tiktok_upload import execute_upload

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


@router.get("", response_model=list[ScheduleResponse])
async def list_schedules(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all scheduled uploads, optionally filtered by status."""
    stmt = select(ScheduledUpload).order_by(ScheduledUpload.scheduled_time.desc())
    if status:
        stmt = stmt.where(ScheduledUpload.status == status)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=ScheduleResponse, status_code=201)
async def create_schedule(
    payload: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new scheduled upload and register it with the scheduler."""
    schedule = ScheduledUpload(
        account_id=payload.account_id,
        video_filename=payload.video_filename,
        title=payload.title,
        privacy_level=payload.privacy_level,
        scheduled_time=payload.scheduled_time,
        product_id=payload.product_id,
        disable_comment=payload.disable_comment,
        disable_duet=payload.disable_duet,
        disable_stitch=payload.disable_stitch,
        status="pending",
    )
    db.add(schedule)
    await db.flush()
    await db.refresh(schedule)

    add_upload_job(schedule.id, schedule.scheduled_time)
    return schedule


@router.get("/videos/list")
async def list_video_files():
    """List available video files in the configured VIDEO_DIR."""
    video_dir = settings.VIDEO_DIR
    if not os.path.isdir(video_dir):
        return {"files": []}

    files = [
        f
        for f in os.listdir(video_dir)
        if os.path.isfile(os.path.join(video_dir, f))
        and not f.startswith(".")
    ]
    files.sort()
    return {"files": files}


@router.post("/videos/upload")
async def upload_video_file(file: UploadFile = File(...)):
    """Upload a video file to the VIDEO_DIR."""
    video_dir = settings.VIDEO_DIR
    os.makedirs(video_dir, exist_ok=True)

    filename = file.filename or "video.mp4"
    # 동일 파일명 존재 시 덮어쓰기 방지
    save_path = os.path.join(video_dir, filename)
    if os.path.exists(save_path):
        name, ext = os.path.splitext(filename)
        counter = 1
        while os.path.exists(save_path):
            filename = f"{name}_{counter}{ext}"
            save_path = os.path.join(video_dir, filename)
            counter += 1

    with open(save_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)

    return {"filename": filename}


@router.post("/{schedule_id}/upload-now")
async def upload_now(schedule_id: int, db: AsyncSession = Depends(get_db)):
    """Trigger immediate upload for a pending schedule."""
    result = await db.execute(
        select(ScheduledUpload).where(ScheduledUpload.id == schedule_id)
    )
    schedule = result.scalar_one_or_none()
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if schedule.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Only pending schedules can be uploaded immediately",
        )

    remove_upload_job(schedule.id)
    asyncio.create_task(execute_upload(schedule.id))
    return {"message": "Upload started"}


@router.get("/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(schedule_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single scheduled upload by ID."""
    result = await db.execute(
        select(ScheduledUpload).where(ScheduledUpload.id == schedule_id)
    )
    schedule = result.scalar_one_or_none()
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: int,
    payload: ScheduleUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a scheduled upload (only if still pending)."""
    result = await db.execute(
        select(ScheduledUpload).where(ScheduledUpload.id == schedule_id)
    )
    schedule = result.scalar_one_or_none()
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if schedule.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Only pending schedules can be updated",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(schedule, field, value)

    db.add(schedule)
    await db.flush()
    await db.refresh(schedule)

    # Re-register the scheduler job if the scheduled_time changed
    if "scheduled_time" in update_data:
        remove_upload_job(schedule.id)
        add_upload_job(schedule.id, schedule.scheduled_time)

    return schedule


@router.delete("/{schedule_id}")
async def delete_schedule(schedule_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a scheduled upload (only if still pending)."""
    result = await db.execute(
        select(ScheduledUpload).where(ScheduledUpload.id == schedule_id)
    )
    schedule = result.scalar_one_or_none()
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if schedule.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Only pending schedules can be deleted",
        )

    remove_upload_job(schedule.id)
    await db.delete(schedule)
    return {"message": "Schedule deleted"}
