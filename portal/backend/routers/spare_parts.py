from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json

from database import get_db, SparePart, QuoteRequest

router = APIRouter()


class QuotePartItem(BaseModel):
    part_id: int
    quantity: int


class QuoteRequestCreate(BaseModel):
    user_name: str
    user_email: str
    user_company: str
    parts: List[QuotePartItem]
    message: Optional[str] = ""


def part_to_dict(p: SparePart) -> dict:
    return {
        "id": p.id,
        "part_number": p.part_number,
        "name_ja": p.name_ja,
        "name_en": p.name_en,
        "description_ja": p.description_ja,
        "description_en": p.description_en,
        "category": p.category,
        "compatible_devices": json.loads(p.compatible_devices) if p.compatible_devices else [],
        "unit_price_jpy": p.unit_price_jpy,
        "unit_price_usd": p.unit_price_usd,
        "unit": p.unit,
        "lead_time_weeks": p.lead_time_weeks,
        "stock_status": p.stock_status,
        "image_url": p.image_url,
        "is_recommended_for_next_maintenance": p.is_recommended_for_next_maintenance,
    }


def quote_to_dict(q: QuoteRequest) -> dict:
    return {
        "id": q.id,
        "user_name": q.user_name,
        "user_email": q.user_email,
        "user_company": q.user_company,
        "parts": json.loads(q.parts) if q.parts else [],
        "message": q.message,
        "status": q.status,
        "created_at": q.created_at,
    }


@router.get("")
async def list_parts(
    device_id: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(SparePart).order_by(SparePart.part_number)
    if category:
        query = query.where(SparePart.category == category)
    result = await db.execute(query)
    parts = result.scalars().all()
    dicts = [part_to_dict(p) for p in parts]

    if device_id:
        dicts = [p for p in dicts if device_id in p["compatible_devices"]]
    return dicts


@router.get("/quotes")
async def list_quotes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(QuoteRequest).order_by(QuoteRequest.created_at.desc()))
    quotes = result.scalars().all()
    return [quote_to_dict(q) for q in quotes]


@router.get("/{part_id}")
async def get_part(part_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SparePart).where(SparePart.id == part_id))
    part = result.scalar_one_or_none()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    return part_to_dict(part)


@router.post("/quote")
async def submit_quote(req: QuoteRequestCreate, db: AsyncSession = Depends(get_db)):
    parts_data = [{"part_id": p.part_id, "quantity": p.quantity} for p in req.parts]
    quote = QuoteRequest(
        user_name=req.user_name,
        user_email=req.user_email,
        user_company=req.user_company,
        parts=json.dumps(parts_data, ensure_ascii=False),
        message=req.message or "",
        status="pending",
        created_at=datetime.utcnow(),
    )
    db.add(quote)
    await db.commit()
    await db.refresh(quote)
    return {"message": "Quote request submitted successfully", "quote": quote_to_dict(quote)}


async def seed_spare_parts(db: AsyncSession):
    result = await db.execute(select(SparePart))
    existing = result.scalars().first()
    if existing:
        return

    parts = [
        SparePart(
            part_number="MB-001", name_ja="主軸受（ティルティングパッド形）",
            name_en="Main Bearing (Tilting Pad Type)",
            description_ja="遠心圧縮機ロータを支持するティルティングパッド型ジャーナル軸受。高速・高荷重用。",
            description_en="Tilting pad journal bearing supporting the centrifugal compressor rotor. For high-speed, high-load applications.",
            category="軸受", compatible_devices=json.dumps(["CC-001", "CC-002", "CC-003"]),
            unit_price_jpy=485000, unit_price_usd=3230, unit="個",
            lead_time_weeks=12, stock_status="in_stock", image_url=None, is_recommended_for_next_maintenance=True,
        ),
        SparePart(
            part_number="TB-002", name_ja="スラスト軸受（ティルティングパッド形）",
            name_en="Thrust Bearing (Tilting Pad Type)",
            description_ja="軸方向荷重を受けるティルティングパッド型スラスト軸受。前後面一体型。",
            description_en="Tilting pad thrust bearing for axial load. Integrated front and rear type.",
            category="軸受", compatible_devices=json.dumps(["CC-001", "CC-002", "CC-003", "CC-004"]),
            unit_price_jpy=620000, unit_price_usd=4130, unit="組",
            lead_time_weeks=14, stock_status="in_stock", image_url=None, is_recommended_for_next_maintenance=True,
        ),
        SparePart(
            part_number="MS-011", name_ja="メカニカルシール一式",
            name_en="Mechanical Seal Assembly",
            description_ja="ガス漏洩を防ぐメカニカルシール一式。ドライガスシール対応。",
            description_en="Mechanical seal assembly to prevent gas leakage. Dry gas seal compatible.",
            category="シール", compatible_devices=json.dumps(["CC-002", "CC-004"]),
            unit_price_jpy=980000, unit_price_usd=6530, unit="組",
            lead_time_weeks=16, stock_status="low_stock", image_url=None, is_recommended_for_next_maintenance=True,
        ),
        SparePart(
            part_number="LS-012", name_ja="ラビリンスシール",
            name_en="Labyrinth Seal",
            description_ja="インペラアイ部及びバランスドラム部に使用されるラビリンスシール。",
            description_en="Labyrinth seal used at impeller eye and balance drum sections.",
            category="シール", compatible_devices=json.dumps(["CC-001", "CC-002", "CC-003", "CC-004"]),
            unit_price_jpy=145000, unit_price_usd=970, unit="個",
            lead_time_weeks=8, stock_status="in_stock", image_url=None, is_recommended_for_next_maintenance=False,
        ),
        SparePart(
            part_number="OF-003", name_ja="オイルフィルターエレメント",
            name_en="Oil Filter Element",
            description_ja="潤滑油システム用フィルターエレメント。精度10ミクロン。",
            description_en="Filter element for lubrication oil system. 10 micron precision.",
            category="フィルター", compatible_devices=json.dumps(["CC-001", "CC-002", "CC-003", "CC-004"]),
            unit_price_jpy=28000, unit_price_usd=187, unit="個",
            lead_time_weeks=2, stock_status="in_stock", image_url=None, is_recommended_for_next_maintenance=True,
        ),
        SparePart(
            part_number="GF-004", name_ja="ガスフィルターエレメント",
            name_en="Gas Filter Element",
            description_ja="ドライガスシール用ガスフィルターエレメント。異物除去用。",
            description_en="Gas filter element for dry gas seal. For foreign matter removal.",
            category="フィルター", compatible_devices=json.dumps(["CC-001", "CC-003"]),
            unit_price_jpy=42000, unit_price_usd=280, unit="個",
            lead_time_weeks=3, stock_status="in_stock", image_url=None, is_recommended_for_next_maintenance=False,
        ),
        SparePart(
            part_number="FC-004", name_ja="フレキシブルカップリング",
            name_en="Flexible Coupling",
            description_ja="ドライバと圧縮機を連結するフレキシブルディスクカップリング。",
            description_en="Flexible disc coupling connecting driver to compressor.",
            category="カップリング", compatible_devices=json.dumps(["CC-004"]),
            unit_price_jpy=380000, unit_price_usd=2530, unit="個",
            lead_time_weeks=10, stock_status="in_stock", image_url=None, is_recommended_for_next_maintenance=False,
        ),
        SparePart(
            part_number="GK-021", name_ja="スパイラルワウンドガスケットセット",
            name_en="Spiral Wound Gasket Set",
            description_ja="フランジ接続部用スパイラルワウンドガスケット一式（各サイズ含む）。",
            description_en="Spiral wound gasket set for flange connections (includes various sizes).",
            category="ガスケット・Oリング", compatible_devices=json.dumps(["CC-001", "CC-002", "CC-003", "CC-004"]),
            unit_price_jpy=65000, unit_price_usd=433, unit="セット",
            lead_time_weeks=4, stock_status="in_stock", image_url=None, is_recommended_for_next_maintenance=True,
        ),
        SparePart(
            part_number="OR-022", name_ja="Oリングセット（各部位用）",
            name_en="O-Ring Set (All Locations)",
            description_ja="圧縮機全Oリング交換用セット。材質：FKM（フッ素ゴム）。",
            description_en="Complete O-ring replacement set for compressor. Material: FKM (Fluoroelastomer).",
            category="ガスケット・Oリング", compatible_devices=json.dumps(["CC-001", "CC-002", "CC-003", "CC-004"]),
            unit_price_jpy=38000, unit_price_usd=253, unit="セット",
            lead_time_weeks=3, stock_status="in_stock", image_url=None, is_recommended_for_next_maintenance=True,
        ),
        SparePart(
            part_number="VT-031", name_ja="振動センサー（エディカレント型）",
            name_en="Vibration Sensor (Eddy Current Type)",
            description_ja="非接触式渦電流型変位センサー。ロータ振動計測用。感度8mV/μm。",
            description_en="Non-contact eddy current displacement sensor for rotor vibration measurement. Sensitivity: 8mV/μm.",
            category="計測機器", compatible_devices=json.dumps(["CC-001", "CC-002", "CC-003", "CC-004"]),
            unit_price_jpy=125000, unit_price_usd=833, unit="個",
            lead_time_weeks=6, stock_status="in_stock", image_url=None, is_recommended_for_next_maintenance=False,
        ),
        SparePart(
            part_number="TS-032", name_ja="温度センサー（RTD型）",
            name_en="Temperature Sensor (RTD Type)",
            description_ja="白金抵抗温度計（Pt100）。軸受温度監視用。",
            description_en="Platinum resistance thermometer (Pt100). For bearing temperature monitoring.",
            category="計測機器", compatible_devices=json.dumps(["CC-001", "CC-002", "CC-003", "CC-004"]),
            unit_price_jpy=18500, unit_price_usd=123, unit="個",
            lead_time_weeks=4, stock_status="in_stock", image_url=None, is_recommended_for_next_maintenance=False,
        ),
        SparePart(
            part_number="LO-041", name_ja="タービン油 VG46 (200L缶)",
            name_en="Turbine Oil VG46 (200L drum)",
            description_ja="圧縮機・タービン用高性能潤滑油。粘度グレードISO VG46。酸化安定性に優れる。",
            description_en="High-performance lubricating oil for compressors and turbines. Viscosity grade ISO VG46. Excellent oxidation stability.",
            category="潤滑油", compatible_devices=json.dumps(["CC-001", "CC-002", "CC-003", "CC-004"]),
            unit_price_jpy=52000, unit_price_usd=347, unit="缶",
            lead_time_weeks=2, stock_status="in_stock", image_url=None, is_recommended_for_next_maintenance=True,
        ),
        SparePart(
            part_number="IM-051", name_ja="インペラ（1段目）",
            name_en="Impeller (1st Stage)",
            description_ja="鍛造ステンレス製1段目インペラ。後退翼形状。動バランス取得済み。",
            description_en="Forged stainless steel 1st stage impeller. Backward-curved blade design. Dynamic balance completed.",
            category="回転体", compatible_devices=json.dumps(["CC-001"]),
            unit_price_jpy=3850000, unit_price_usd=25667, unit="個",
            lead_time_weeks=24, stock_status="out_of_stock", image_url=None, is_recommended_for_next_maintenance=False,
        ),
        SparePart(
            part_number="SH-061", name_ja="ロータシャフト",
            name_en="Rotor Shaft",
            description_ja="鍛造合金鋼製ロータシャフト。超音波探傷検査済み。",
            description_en="Forged alloy steel rotor shaft. Ultrasonic testing completed.",
            category="回転体", compatible_devices=json.dumps(["CC-002", "CC-003"]),
            unit_price_jpy=5200000, unit_price_usd=34667, unit="本",
            lead_time_weeks=32, stock_status="out_of_stock", image_url=None, is_recommended_for_next_maintenance=False,
        ),
        SparePart(
            part_number="CV-071", name_ja="チェックバルブ（逆止弁）",
            name_en="Check Valve (Non-return valve)",
            description_ja="吐出配管用スイング式逆止弁。フランジ接続。圧力クラス：Class 300。",
            description_en="Swing check valve for discharge piping. Flange connection. Pressure class: Class 300.",
            category="バルブ", compatible_devices=json.dumps(["CC-001", "CC-002", "CC-003", "CC-004"]),
            unit_price_jpy=285000, unit_price_usd=1900, unit="個",
            lead_time_weeks=8, stock_status="low_stock", image_url=None, is_recommended_for_next_maintenance=False,
        ),
    ]
    for p in parts:
        db.add(p)
    await db.commit()
    print("Spare parts seeded.")
