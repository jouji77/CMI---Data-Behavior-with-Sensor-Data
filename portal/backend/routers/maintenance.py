from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import json

from database import get_db, MaintenanceRecord

router = APIRouter()


class MaintenanceRecordCreate(BaseModel):
    device_id: str
    device_name: str
    record_type: str  # maintenance/defect/inspection
    title: str
    description: str
    performed_by: str
    performed_at: Optional[datetime] = None
    next_scheduled_at: Optional[datetime] = None
    status: str = "completed"
    parts_replaced: Optional[List[str]] = []
    cost_jpy: Optional[float] = None


class MaintenanceRecordUpdate(BaseModel):
    record_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    performed_by: Optional[str] = None
    performed_at: Optional[datetime] = None
    next_scheduled_at: Optional[datetime] = None
    status: Optional[str] = None
    parts_replaced: Optional[List[str]] = None
    cost_jpy: Optional[float] = None


class ScheduleRequest(BaseModel):
    device_id: str
    device_name: str
    requested_date: str
    description: str
    contact_name: str
    contact_email: str


def record_to_dict(r: MaintenanceRecord) -> dict:
    return {
        "id": r.id,
        "device_id": r.device_id,
        "device_name": r.device_name,
        "record_type": r.record_type,
        "title": r.title,
        "description": r.description,
        "performed_by": r.performed_by,
        "performed_at": r.performed_at,
        "next_scheduled_at": r.next_scheduled_at,
        "status": r.status,
        "parts_replaced": json.loads(r.parts_replaced) if r.parts_replaced else [],
        "cost_jpy": r.cost_jpy,
        "created_at": r.created_at,
    }


@router.get("")
async def list_records(
    device_id: Optional[str] = None,
    record_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(MaintenanceRecord).order_by(MaintenanceRecord.performed_at.desc().nulls_last())
    if device_id:
        query = query.where(MaintenanceRecord.device_id == device_id)
    if record_type:
        query = query.where(MaintenanceRecord.record_type == record_type)
    result = await db.execute(query)
    records = result.scalars().all()
    return [record_to_dict(r) for r in records]


@router.post("")
async def create_record(req: MaintenanceRecordCreate, db: AsyncSession = Depends(get_db)):
    record = MaintenanceRecord(
        device_id=req.device_id,
        device_name=req.device_name,
        record_type=req.record_type,
        title=req.title,
        description=req.description,
        performed_by=req.performed_by,
        performed_at=req.performed_at or datetime.utcnow(),
        next_scheduled_at=req.next_scheduled_at,
        status=req.status,
        parts_replaced=json.dumps(req.parts_replaced or [], ensure_ascii=False),
        cost_jpy=req.cost_jpy,
        created_at=datetime.utcnow(),
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record_to_dict(record)


@router.put("/{record_id}")
async def update_record(record_id: int, req: MaintenanceRecordUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MaintenanceRecord).where(MaintenanceRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    if req.record_type is not None:
        record.record_type = req.record_type
    if req.title is not None:
        record.title = req.title
    if req.description is not None:
        record.description = req.description
    if req.performed_by is not None:
        record.performed_by = req.performed_by
    if req.performed_at is not None:
        record.performed_at = req.performed_at
    if req.next_scheduled_at is not None:
        record.next_scheduled_at = req.next_scheduled_at
    if req.status is not None:
        record.status = req.status
    if req.parts_replaced is not None:
        record.parts_replaced = json.dumps(req.parts_replaced, ensure_ascii=False)
    if req.cost_jpy is not None:
        record.cost_jpy = req.cost_jpy

    await db.commit()
    await db.refresh(record)
    return record_to_dict(record)


@router.delete("/{record_id}")
async def delete_record(record_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MaintenanceRecord).where(MaintenanceRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    await db.delete(record)
    await db.commit()
    return {"message": "Deleted successfully"}


@router.get("/schedule")
async def get_schedule(db: AsyncSession = Depends(get_db)):
    now = datetime.utcnow()
    query = (
        select(MaintenanceRecord)
        .where(MaintenanceRecord.next_scheduled_at >= now)
        .order_by(MaintenanceRecord.next_scheduled_at)
    )
    result = await db.execute(query)
    records = result.scalars().all()
    return [record_to_dict(r) for r in records]


@router.post("/schedule-request")
async def schedule_request(req: ScheduleRequest, db: AsyncSession = Depends(get_db)):
    record = MaintenanceRecord(
        device_id=req.device_id,
        device_name=req.device_name,
        record_type="maintenance",
        title=f"メンテナンス日程依頼: {req.device_name}",
        description=f"依頼者: {req.contact_name} ({req.contact_email})\n希望日: {req.requested_date}\n内容: {req.description}",
        performed_by=req.contact_name,
        performed_at=None,
        next_scheduled_at=None,
        status="pending",
        parts_replaced=json.dumps([], ensure_ascii=False),
        cost_jpy=None,
        created_at=datetime.utcnow(),
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return {"message": "Schedule request submitted", "record": record_to_dict(record)}


async def seed_maintenance(db: AsyncSession):
    result = await db.execute(select(MaintenanceRecord))
    existing = result.scalars().first()
    if existing:
        return

    now = datetime.utcnow()
    records = [
        MaintenanceRecord(
            device_id="CC-001", device_name="遠心圧縮機 CC-001",
            record_type="maintenance", title="定期オーバーホール",
            description="インペラ清掃、軸受交換、シール部品交換を実施。全体的な状態良好。",
            performed_by="田中 技術部", performed_at=now - timedelta(days=180),
            next_scheduled_at=now + timedelta(days=185),
            status="completed",
            parts_replaced=json.dumps(["主軸受 (MB-001)", "スラスト軸受 (TB-002)", "ラビリンスシール"], ensure_ascii=False),
            cost_jpy=2850000, created_at=now - timedelta(days=180),
        ),
        MaintenanceRecord(
            device_id="CC-001", device_name="遠心圧縮機 CC-001",
            record_type="inspection", title="月次点検",
            description="振動値、温度、圧力の測定。軸受温度が基準値の上限近くを示したため、次回点検時に潤滑油交換を推奨。",
            performed_by="鈴木 保全課", performed_at=now - timedelta(days=30),
            next_scheduled_at=now + timedelta(days=30),
            status="completed",
            parts_replaced=json.dumps([], ensure_ascii=False),
            cost_jpy=85000, created_at=now - timedelta(days=30),
        ),
        MaintenanceRecord(
            device_id="CC-001", device_name="遠心圧縮機 CC-001",
            record_type="defect", title="インペラ振動異常",
            description="振動センサーにて異常振動を検知。インペラバランス確認の結果、微小なダメージを発見。バランス修正にて対処。",
            performed_by="佐藤 技術部", performed_at=now - timedelta(days=60),
            next_scheduled_at=None,
            status="completed",
            parts_replaced=json.dumps([], ensure_ascii=False),
            cost_jpy=320000, created_at=now - timedelta(days=60),
        ),
        MaintenanceRecord(
            device_id="CC-002", device_name="遠心圧縮機 CC-002",
            record_type="maintenance", title="潤滑油交換・フィルター清掃",
            description="潤滑油全量交換、オイルフィルター交換、ストレーナ清掃を実施。",
            performed_by="山本 保全課", performed_at=now - timedelta(days=90),
            next_scheduled_at=now + timedelta(days=90),
            status="completed",
            parts_replaced=json.dumps(["オイルフィルター (OF-003)", "Oリングセット"], ensure_ascii=False),
            cost_jpy=145000, created_at=now - timedelta(days=90),
        ),
        MaintenanceRecord(
            device_id="CC-002", device_name="遠心圧縮機 CC-002",
            record_type="inspection", title="シール部点検",
            description="メカニカルシール外観点検。微小なリークを確認。次回定期メンテナンスでの交換を計画。",
            performed_by="中村 技術部", performed_at=now - timedelta(days=45),
            next_scheduled_at=now + timedelta(days=60),
            status="completed",
            parts_replaced=json.dumps([], ensure_ascii=False),
            cost_jpy=65000, created_at=now - timedelta(days=45),
        ),
        MaintenanceRecord(
            device_id="CC-002", device_name="遠心圧縮機 CC-002",
            record_type="maintenance", title="メカニカルシール交換（予定）",
            description="前回点検で確認したシールリークへの対処。メカニカルシール一式交換予定。",
            performed_by="技術部（予定）", performed_at=None,
            next_scheduled_at=now + timedelta(days=15),
            status="scheduled",
            parts_replaced=json.dumps(["メカニカルシール一式 (MS-011)"], ensure_ascii=False),
            cost_jpy=480000, created_at=now - timedelta(days=10),
        ),
        MaintenanceRecord(
            device_id="CC-003", device_name="遠心圧縮機 CC-003",
            record_type="maintenance", title="年次定期点検",
            description="分解点検、クリアランス測定、各部品の摩耗確認。インペラ軽微な腐食を確認し研磨処置。",
            performed_by="高橋 技術部", performed_at=now - timedelta(days=365),
            next_scheduled_at=now + timedelta(days=30),
            status="completed",
            parts_replaced=json.dumps(["軸受一式", "ガスケットセット", "カップリングボルト"], ensure_ascii=False),
            cost_jpy=3200000, created_at=now - timedelta(days=365),
        ),
        MaintenanceRecord(
            device_id="CC-003", device_name="遠心圧縮機 CC-003",
            record_type="defect", title="吐出温度高温アラーム",
            description="吐出温度が上限値を超過。冷却水流量低下が原因と判明。冷却水ストレーナ詰まりを清掃にて解消。",
            performed_by="伊藤 運転部", performed_at=now - timedelta(days=15),
            next_scheduled_at=None,
            status="completed",
            parts_replaced=json.dumps([], ensure_ascii=False),
            cost_jpy=25000, created_at=now - timedelta(days=15),
        ),
        MaintenanceRecord(
            device_id="CC-004", device_name="遠心圧縮機 CC-004",
            record_type="maintenance", title="カップリング交換",
            description="フレキシブルカップリングの劣化を確認し交換実施。アライメント調整含む。",
            performed_by="渡辺 技術部", performed_at=now - timedelta(days=120),
            next_scheduled_at=now + timedelta(days=240),
            status="completed",
            parts_replaced=json.dumps(["フレキシブルカップリング (FC-004)", "アライメントシム"], ensure_ascii=False),
            cost_jpy=580000, created_at=now - timedelta(days=120),
        ),
        MaintenanceRecord(
            device_id="CC-004", device_name="遠心圧縮機 CC-004",
            record_type="inspection", title="次回年次点検（予定）",
            description="年次定期点検。分解点検、全軸受交換、インペラ点検、シール交換を予定。",
            performed_by="技術部（予定）", performed_at=None,
            next_scheduled_at=now + timedelta(days=45),
            status="scheduled",
            parts_replaced=json.dumps(["軸受一式", "シール一式", "ガスケット類"], ensure_ascii=False),
            cost_jpy=2500000, created_at=now - timedelta(days=5),
        ),
    ]
    for r in records:
        db.add(r)
    await db.commit()
    print("Maintenance records seeded.")
