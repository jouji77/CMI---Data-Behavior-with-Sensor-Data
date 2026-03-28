from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer, Float, DateTime, Text, Boolean
from datetime import datetime
import os

DATABASE_URL = "sqlite+aiosqlite:///./portal.db"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_by: Mapped[str] = mapped_column(String(100), nullable=False, default="Unknown")
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    description: Mapped[str] = mapped_column(Text, nullable=True, default="")
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="その他")
    is_indexed: Mapped[bool] = mapped_column(default=False)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    room_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    sender_name: Mapped[str] = mapped_column(String(100), nullable=False)
    sender_role: Mapped[str] = mapped_column(String(50), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ChatRoom(Base):
    __tablename__ = "chat_rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    room_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    room_name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_by: Mapped[str] = mapped_column(String(100), nullable=False)


class SensorData(Base):
    __tablename__ = "sensor_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    device_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    inlet_pressure: Mapped[float] = mapped_column(Float, nullable=False)
    outlet_pressure: Mapped[float] = mapped_column(Float, nullable=False)
    inlet_temp: Mapped[float] = mapped_column(Float, nullable=False)
    outlet_temp: Mapped[float] = mapped_column(Float, nullable=False)
    vibration: Mapped[float] = mapped_column(Float, nullable=False)
    rpm: Mapped[float] = mapped_column(Float, nullable=False)
    power_kw: Mapped[float] = mapped_column(Float, nullable=False)
    efficiency: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="normal")


# ─────────────────────────────────────────────────────────────────────────────
# New models
# ─────────────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    company: Mapped[str] = mapped_column(String(200), nullable=False)
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="ja")
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="customer")
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    device_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    device_name: Mapped[str] = mapped_column(String(200), nullable=False)
    record_type: Mapped[str] = mapped_column(String(50), nullable=False)  # maintenance/defect/inspection
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    performed_by: Mapped[str] = mapped_column(String(100), nullable=False)
    performed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    next_scheduled_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="completed")  # completed/scheduled/pending
    parts_replaced: Mapped[str] = mapped_column(Text, nullable=True, default="[]")  # JSON list
    cost_jpy: Mapped[float] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title_ja: Mapped[str] = mapped_column(String(500), nullable=False)
    title_en: Mapped[str] = mapped_column(String(500), nullable=False)
    content_ja: Mapped[str] = mapped_column(Text, nullable=False)
    content_en: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)  # 技術情報/サービス情報/製品情報/事例紹介
    tags: Mapped[str] = mapped_column(String(500), nullable=True, default="")  # comma-separated
    author: Mapped[str] = mapped_column(String(100), nullable=False)
    published_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    thumbnail_url: Mapped[str] = mapped_column(String(500), nullable=True)


class SparePart(Base):
    __tablename__ = "spare_parts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    part_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    name_ja: Mapped[str] = mapped_column(String(300), nullable=False)
    name_en: Mapped[str] = mapped_column(String(300), nullable=False)
    description_ja: Mapped[str] = mapped_column(Text, nullable=True)
    description_en: Mapped[str] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    compatible_devices: Mapped[str] = mapped_column(Text, nullable=True, default="[]")  # JSON list
    unit_price_jpy: Mapped[float] = mapped_column(Float, nullable=False)
    unit_price_usd: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False, default="個")
    lead_time_weeks: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    stock_status: Mapped[str] = mapped_column(String(50), nullable=False, default="in_stock")
    image_url: Mapped[str] = mapped_column(String(500), nullable=True)
    is_recommended_for_next_maintenance: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class QuoteRequest(Base):
    __tablename__ = "quote_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_name: Mapped[str] = mapped_column(String(100), nullable=False)
    user_email: Mapped[str] = mapped_column(String(255), nullable=False)
    user_company: Mapped[str] = mapped_column(String(200), nullable=False)
    parts: Mapped[str] = mapped_column(Text, nullable=False, default="[]")  # JSON list of {part_id, quantity}
    message: Mapped[str] = mapped_column(Text, nullable=True, default="")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class InspectionItem(Base):
    __tablename__ = "inspection_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    device_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    item_name_ja: Mapped[str] = mapped_column(String(300), nullable=False)
    item_name_en: Mapped[str] = mapped_column(String(300), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    frequency: Mapped[str] = mapped_column(String(50), nullable=False)  # daily/weekly/monthly
    method_ja: Mapped[str] = mapped_column(Text, nullable=True)
    method_en: Mapped[str] = mapped_column(Text, nullable=True)
    normal_range: Mapped[str] = mapped_column(String(200), nullable=True)
    current_value: Mapped[str] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="normal")  # normal/caution/warning
    last_checked: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    is_recommended: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
