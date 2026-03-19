from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class TikTokAccount(Base):
    __tablename__ = "tiktok_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    open_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[str] = mapped_column(Text, nullable=False)
    token_expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    refresh_expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, onupdate=func.now()
    )

    uploads: Mapped[list["ScheduledUpload"]] = relationship(
        "ScheduledUpload", back_populates="account", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<TikTokAccount id={self.id} open_id={self.open_id}>"


class ScheduledUpload(Base):
    __tablename__ = "scheduled_uploads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tiktok_accounts.id"), nullable=False
    )
    video_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False, default="")
    privacy_level: Mapped[str] = mapped_column(
        String(50), nullable=False, default="SELF_ONLY"
    )
    disable_comment: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    disable_duet: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    disable_stitch: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    product_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    scheduled_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pending"
    )
    publish_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, onupdate=func.now()
    )

    account: Mapped["TikTokAccount"] = relationship(
        "TikTokAccount", back_populates="uploads"
    )

    def __repr__(self) -> str:
        return (
            f"<ScheduledUpload id={self.id} status={self.status} "
            f"scheduled_time={self.scheduled_time}>"
        )
