from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db, InspectionItem

router = APIRouter()


class InspectionCheckRequest(BaseModel):
    current_value: Optional[str] = None
    status: str  # normal/caution/warning
    notes: Optional[str] = None


def item_to_dict(item: InspectionItem) -> dict:
    return {
        "id": item.id,
        "device_id": item.device_id,
        "item_name_ja": item.item_name_ja,
        "item_name_en": item.item_name_en,
        "category": item.category,
        "frequency": item.frequency,
        "method_ja": item.method_ja,
        "method_en": item.method_en,
        "normal_range": item.normal_range,
        "current_value": item.current_value,
        "status": item.status,
        "last_checked": item.last_checked,
        "is_recommended": item.is_recommended,
    }


@router.get("")
async def list_items(
    device_id: Optional[str] = None,
    frequency: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(InspectionItem).order_by(InspectionItem.device_id, InspectionItem.frequency)
    if device_id:
        query = query.where(InspectionItem.device_id == device_id)
    if frequency:
        query = query.where(InspectionItem.frequency == frequency)
    result = await db.execute(query)
    items = result.scalars().all()
    return [item_to_dict(i) for i in items]


@router.post("/{item_id}/check")
async def record_check(item_id: int, req: InspectionCheckRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(InspectionItem).where(InspectionItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inspection item not found")

    if req.current_value is not None:
        item.current_value = req.current_value
    item.status = req.status
    item.last_checked = datetime.utcnow()
    await db.commit()
    await db.refresh(item)
    return item_to_dict(item)


@router.get("/checklist/{device_id}")
async def get_checklist(device_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(InspectionItem)
        .where(InspectionItem.device_id == device_id)
        .order_by(InspectionItem.frequency, InspectionItem.category)
    )
    items = result.scalars().all()
    checklist = {"daily": [], "weekly": [], "monthly": []}
    for item in items:
        freq = item.frequency
        if freq in checklist:
            checklist[freq].append(item_to_dict(item))
    return {"device_id": device_id, "checklist": checklist}


async def seed_inspection_items(db: AsyncSession):
    result = await db.execute(select(InspectionItem))
    existing = result.scalars().first()
    if existing:
        return

    from datetime import timedelta
    now = datetime.utcnow()
    items = [
        # CC-001 daily
        InspectionItem(device_id="CC-001", item_name_ja="潤滑油レベル確認", item_name_en="Lubricant Oil Level Check",
                       category="潤滑システム", frequency="daily",
                       method_ja="オイルサイトグラスにて油面位置を確認。LOW〜HIGH範囲内であること。",
                       method_en="Check oil level via sight glass. Level must be between LOW and HIGH marks.",
                       normal_range="LOW〜HIGH", current_value="正常範囲内", status="normal",
                       last_checked=now - timedelta(hours=8), is_recommended=False),
        InspectionItem(device_id="CC-001", item_name_ja="吸込・吐出圧力確認", item_name_en="Suction/Discharge Pressure Check",
                       category="プロセス", frequency="daily",
                       method_ja="計器盤の圧力指示値を確認。設計値との比較。",
                       method_en="Check pressure readings on instrument panel. Compare with design values.",
                       normal_range="吸込: 0.1〜0.15 MPa / 吐出: 3.5〜4.0 MPa",
                       current_value="吸込: 0.12 MPa, 吐出: 3.75 MPa", status="normal",
                       last_checked=now - timedelta(hours=4), is_recommended=False),
        InspectionItem(device_id="CC-001", item_name_ja="軸受温度監視", item_name_en="Bearing Temperature Monitoring",
                       category="軸受", frequency="daily",
                       method_ja="DCSにて軸受温度（ジャーナル・スラスト）を確認。",
                       method_en="Check bearing temperatures (journal and thrust) via DCS.",
                       normal_range="< 85°C", current_value="78°C", status="normal",
                       last_checked=now - timedelta(hours=2), is_recommended=False),
        InspectionItem(device_id="CC-001", item_name_ja="振動値確認", item_name_en="Vibration Value Check",
                       category="回転体", frequency="daily",
                       method_ja="DCSにて振動振幅（ピーク・ピーク）を確認。",
                       method_en="Check vibration amplitude (peak-to-peak) via DCS.",
                       normal_range="< 50 μm p-p", current_value="62 μm p-p", status="caution",
                       last_checked=now - timedelta(hours=1), is_recommended=True),
        # CC-001 weekly
        InspectionItem(device_id="CC-001", item_name_ja="潤滑油サンプリング・外観確認", item_name_en="Lubricant Oil Sampling & Visual Check",
                       category="潤滑システム", frequency="weekly",
                       method_ja="サンプルを採取し色・透明度・水分混入を確認。",
                       method_en="Take sample and check color, transparency, and moisture contamination.",
                       normal_range="淡黄色・透明・水分なし", current_value="正常", status="normal",
                       last_checked=now - timedelta(days=3), is_recommended=False),
        InspectionItem(device_id="CC-001", item_name_ja="シール部ガスリーク確認", item_name_en="Seal Gas Leak Check",
                       category="シール", frequency="weekly",
                       method_ja="ガス検知器にてシール周辺のガス漏洩を確認。",
                       method_en="Check for gas leakage around seals using gas detector.",
                       normal_range="漏洩なし", current_value="漏洩なし", status="normal",
                       last_checked=now - timedelta(days=2), is_recommended=False),
        # CC-001 monthly
        InspectionItem(device_id="CC-001", item_name_ja="カップリングボルト締め付け確認", item_name_en="Coupling Bolt Torque Check",
                       category="カップリング", frequency="monthly",
                       method_ja="トルクレンチにて規定トルクで締め付け確認。",
                       method_en="Verify tightening to specified torque using torque wrench.",
                       normal_range="150 N·m", current_value="148 N·m", status="normal",
                       last_checked=now - timedelta(days=20), is_recommended=False),
        InspectionItem(device_id="CC-001", item_name_ja="フィルター差圧確認", item_name_en="Filter Differential Pressure Check",
                       category="フィルター", frequency="monthly",
                       method_ja="オイルフィルター前後の差圧を測定。",
                       method_en="Measure differential pressure across oil filter.",
                       normal_range="< 0.08 MPa", current_value="0.12 MPa", status="warning",
                       last_checked=now - timedelta(days=5), is_recommended=True),
        # CC-002 daily
        InspectionItem(device_id="CC-002", item_name_ja="潤滑油レベル確認", item_name_en="Lubricant Oil Level Check",
                       category="潤滑システム", frequency="daily",
                       method_ja="オイルサイトグラスにて油面位置を確認。LOW〜HIGH範囲内であること。",
                       method_en="Check oil level via sight glass. Level must be between LOW and HIGH marks.",
                       normal_range="LOW〜HIGH", current_value="正常範囲内", status="normal",
                       last_checked=now - timedelta(hours=6), is_recommended=False),
        InspectionItem(device_id="CC-002", item_name_ja="シール圧力差確認", item_name_en="Seal Differential Pressure Check",
                       category="シール", frequency="daily",
                       method_ja="メカニカルシール前後の差圧を確認。",
                       method_en="Check differential pressure across mechanical seal.",
                       normal_range="0.03〜0.05 MPa", current_value="0.04 MPa", status="normal",
                       last_checked=now - timedelta(hours=3), is_recommended=False),
        InspectionItem(device_id="CC-002", item_name_ja="軸受温度監視", item_name_en="Bearing Temperature Monitoring",
                       category="軸受", frequency="daily",
                       method_ja="DCSにて軸受温度を確認。",
                       method_en="Check bearing temperatures via DCS.",
                       normal_range="< 85°C", current_value="81°C", status="normal",
                       last_checked=now - timedelta(hours=1), is_recommended=False),
        # CC-003 items
        InspectionItem(device_id="CC-003", item_name_ja="振動値確認", item_name_en="Vibration Value Check",
                       category="回転体", frequency="daily",
                       method_ja="DCSにて振動振幅を確認。",
                       method_en="Check vibration amplitude via DCS.",
                       normal_range="< 50 μm p-p", current_value="35 μm p-p", status="normal",
                       last_checked=now - timedelta(hours=2), is_recommended=False),
        InspectionItem(device_id="CC-003", item_name_ja="吐出温度確認", item_name_en="Discharge Temperature Check",
                       category="プロセス", frequency="daily",
                       method_ja="計器盤の吐出温度指示値を確認。",
                       method_en="Check discharge temperature reading on instrument panel.",
                       normal_range="< 160°C", current_value="168°C", status="warning",
                       last_checked=now - timedelta(hours=1), is_recommended=True),
        # CC-004 items
        InspectionItem(device_id="CC-004", item_name_ja="潤滑油レベル確認", item_name_en="Lubricant Oil Level Check",
                       category="潤滑システム", frequency="daily",
                       method_ja="オイルサイトグラスにて油面位置を確認。",
                       method_en="Check oil level via sight glass.",
                       normal_range="LOW〜HIGH", current_value="正常範囲内", status="normal",
                       last_checked=now - timedelta(hours=5), is_recommended=False),
        InspectionItem(device_id="CC-004", item_name_ja="軸受温度監視", item_name_en="Bearing Temperature Monitoring",
                       category="軸受", frequency="daily",
                       method_ja="DCSにて軸受温度を確認。",
                       method_en="Check bearing temperatures via DCS.",
                       normal_range="< 85°C", current_value="72°C", status="normal",
                       last_checked=now - timedelta(hours=2), is_recommended=False),
    ]
    for item in items:
        db.add(item)
    await db.commit()
    print("Inspection items seeded.")
