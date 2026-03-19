from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ---------- Schedule schemas ----------


class ScheduleCreate(BaseModel):
    account_id: int
    video_filename: str
    title: str
    privacy_level: str = "SELF_ONLY"
    scheduled_time: datetime
    product_id: Optional[str] = None
    disable_comment: bool = False
    disable_duet: bool = False
    disable_stitch: bool = False


class ScheduleUpdate(BaseModel):
    account_id: Optional[int] = None
    video_filename: Optional[str] = None
    title: Optional[str] = None
    privacy_level: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    product_id: Optional[str] = None
    disable_comment: Optional[bool] = None
    disable_duet: Optional[bool] = None
    disable_stitch: Optional[bool] = None


class ScheduleResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    account_id: int
    video_filename: str
    title: str
    privacy_level: str
    disable_comment: bool
    disable_duet: bool
    disable_stitch: bool
    product_id: Optional[str] = None
    scheduled_time: datetime
    status: str
    publish_id: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# ---------- Account schemas ----------


class AccountResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    open_id: str
    display_name: str
    token_expires_at: datetime
    created_at: datetime
