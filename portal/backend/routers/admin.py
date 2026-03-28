from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import random
import string

from database import (
    get_db, User, Company, Compressor, SparePart, Article,
    Document, MaintenanceRecord
)
from routers.auth import get_current_user, hash_password

router = APIRouter()


# ─── Admin guard ─────────────────────────────────────────────────────────────

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ─── Schemas ─────────────────────────────────────────────────────────────────

class CompanyCreate(BaseModel):
    name: str
    name_en: Optional[str] = None
    country: Optional[str] = None
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    industry: Optional[str] = None
    notes: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    name_en: Optional[str] = None
    country: Optional[str] = None
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    industry: Optional[str] = None
    notes: Optional[str] = None


class CompressorCreate(BaseModel):
    company_id: Optional[int] = None
    serial_number: str
    model: str
    installation_date: Optional[datetime] = None
    location: Optional[str] = None
    status: str = "active"
    design_pressure: Optional[float] = None
    design_flow: Optional[float] = None
    rated_power: Optional[float] = None
    notes: Optional[str] = None


class CompressorUpdate(BaseModel):
    company_id: Optional[int] = None
    serial_number: Optional[str] = None
    model: Optional[str] = None
    installation_date: Optional[datetime] = None
    location: Optional[str] = None
    status: Optional[str] = None
    design_pressure: Optional[float] = None
    design_flow: Optional[float] = None
    rated_power: Optional[float] = None
    notes: Optional[str] = None


class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    company: str
    role: str = "customer"
    language: str = "ja"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    language: Optional[str] = None
    is_verified: Optional[bool] = None


class SparePartCreate(BaseModel):
    part_number: str
    name_ja: str
    name_en: str
    description_ja: Optional[str] = None
    description_en: Optional[str] = None
    category: str
    compatible_devices: Optional[str] = "[]"
    unit_price_jpy: float
    unit_price_usd: float
    unit: str = "個"
    lead_time_weeks: int = 4
    stock_status: str = "in_stock"
    is_recommended_for_next_maintenance: bool = False


class SparePartUpdate(BaseModel):
    part_number: Optional[str] = None
    name_ja: Optional[str] = None
    name_en: Optional[str] = None
    description_ja: Optional[str] = None
    description_en: Optional[str] = None
    category: Optional[str] = None
    compatible_devices: Optional[str] = None
    unit_price_jpy: Optional[float] = None
    unit_price_usd: Optional[float] = None
    unit: Optional[str] = None
    lead_time_weeks: Optional[int] = None
    stock_status: Optional[str] = None
    is_recommended_for_next_maintenance: Optional[bool] = None


class ArticleCreate(BaseModel):
    title_ja: str
    title_en: str
    content_ja: str
    content_en: str
    category: str
    tags: Optional[str] = ""
    author: str
    thumbnail_url: Optional[str] = None


class ArticleUpdate(BaseModel):
    title_ja: Optional[str] = None
    title_en: Optional[str] = None
    content_ja: Optional[str] = None
    content_en: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    author: Optional[str] = None
    thumbnail_url: Optional[str] = None


# ─── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    users_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    companies_count = (await db.execute(select(func.count(Company.id)))).scalar() or 0
    compressors_count = (await db.execute(select(func.count(Compressor.id)))).scalar() or 0
    spare_parts_count = (await db.execute(select(func.count(SparePart.id)))).scalar() or 0
    articles_count = (await db.execute(select(func.count(Article.id)))).scalar() or 0
    documents_count = (await db.execute(select(func.count(Document.id)))).scalar() or 0
    maintenance_count = (await db.execute(select(func.count(MaintenanceRecord.id)))).scalar() or 0

    recent_users_result = await db.execute(
        select(User).order_by(User.created_at.desc()).limit(5)
    )
    recent_users = recent_users_result.scalars().all()

    return {
        "counts": {
            "users": users_count,
            "companies": companies_count,
            "compressors": compressors_count,
            "spare_parts": spare_parts_count,
            "articles": articles_count,
            "documents": documents_count,
            "maintenance_records": maintenance_count,
        },
        "recent_users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "company": u.company,
                "role": u.role,
                "created_at": u.created_at,
            }
            for u in recent_users
        ],
    }


# ─── Companies ────────────────────────────────────────────────────────────────

@router.get("/companies")
async def list_companies(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Company).order_by(Company.created_at.desc()))
    companies = result.scalars().all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "name_en": c.name_en,
            "country": c.country,
            "contact_email": c.contact_email,
            "phone": c.phone,
            "address": c.address,
            "industry": c.industry,
            "notes": c.notes,
            "created_at": c.created_at,
        }
        for c in companies
    ]


@router.post("/companies")
async def create_company(
    req: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    company = Company(
        name=req.name,
        name_en=req.name_en,
        country=req.country,
        contact_email=req.contact_email,
        phone=req.phone,
        address=req.address,
        industry=req.industry,
        notes=req.notes,
        created_at=datetime.utcnow(),
    )
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return {"id": company.id, "name": company.name, "message": "Company created"}


@router.put("/companies/{company_id}")
async def update_company(
    company_id: int,
    req: CompanyUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(company, field, value)

    await db.commit()
    await db.refresh(company)
    return {"id": company.id, "name": company.name, "message": "Company updated"}


@router.delete("/companies/{company_id}")
async def delete_company(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    await db.delete(company)
    await db.commit()
    return {"message": "Company deleted"}


# ─── Compressors ──────────────────────────────────────────────────────────────

@router.get("/compressors")
async def list_compressors(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Compressor).order_by(Compressor.created_at.desc()))
    compressors = result.scalars().all()

    # Collect company names
    company_ids = list({c.company_id for c in compressors if c.company_id})
    company_map: dict[int, str] = {}
    if company_ids:
        c_result = await db.execute(select(Company).where(Company.id.in_(company_ids)))
        for co in c_result.scalars().all():
            company_map[co.id] = co.name

    return [
        {
            "id": c.id,
            "company_id": c.company_id,
            "company_name": company_map.get(c.company_id, "") if c.company_id else "",
            "serial_number": c.serial_number,
            "model": c.model,
            "installation_date": c.installation_date,
            "location": c.location,
            "status": c.status,
            "design_pressure": c.design_pressure,
            "design_flow": c.design_flow,
            "rated_power": c.rated_power,
            "notes": c.notes,
            "created_at": c.created_at,
        }
        for c in compressors
    ]


@router.post("/compressors")
async def create_compressor(
    req: CompressorCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    compressor = Compressor(
        company_id=req.company_id,
        serial_number=req.serial_number,
        model=req.model,
        installation_date=req.installation_date,
        location=req.location,
        status=req.status,
        design_pressure=req.design_pressure,
        design_flow=req.design_flow,
        rated_power=req.rated_power,
        notes=req.notes,
        created_at=datetime.utcnow(),
    )
    db.add(compressor)
    await db.commit()
    await db.refresh(compressor)
    return {"id": compressor.id, "serial_number": compressor.serial_number, "message": "Compressor created"}


@router.put("/compressors/{compressor_id}")
async def update_compressor(
    compressor_id: int,
    req: CompressorUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Compressor).where(Compressor.id == compressor_id))
    compressor = result.scalar_one_or_none()
    if not compressor:
        raise HTTPException(status_code=404, detail="Compressor not found")

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(compressor, field, value)

    await db.commit()
    await db.refresh(compressor)
    return {"id": compressor.id, "message": "Compressor updated"}


@router.delete("/compressors/{compressor_id}")
async def delete_compressor(
    compressor_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Compressor).where(Compressor.id == compressor_id))
    compressor = result.scalar_one_or_none()
    if not compressor:
        raise HTTPException(status_code=404, detail="Compressor not found")

    await db.delete(compressor)
    await db.commit()
    return {"message": "Compressor deleted"}


# ─── Users ────────────────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "company": u.company,
            "role": u.role,
            "language": u.language,
            "is_verified": u.is_verified,
            "created_at": u.created_at,
        }
        for u in users
    ]


@router.post("/users")
async def create_user(
    req: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=req.email,
        name=req.name,
        company=req.company,
        role=req.role,
        language=req.language,
        password_hash=hash_password(req.password),
        is_verified=True,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"id": user.id, "email": user.email, "message": "User created"}


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    req: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return {"id": user.id, "email": user.email, "message": "User updated"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.commit()
    return {"message": "User deleted"}


@router.put("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    temp_password = "".join(random.choices(string.ascii_letters + string.digits, k=12))
    user.password_hash = hash_password(temp_password)
    await db.commit()
    return {"temporary_password": temp_password, "message": "Password reset successfully"}


# ─── Spare Parts ──────────────────────────────────────────────────────────────

@router.get("/spare-parts")
async def list_spare_parts(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(SparePart).order_by(SparePart.id.asc()))
    parts = result.scalars().all()
    return [
        {
            "id": p.id,
            "part_number": p.part_number,
            "name_ja": p.name_ja,
            "name_en": p.name_en,
            "description_ja": p.description_ja,
            "description_en": p.description_en,
            "category": p.category,
            "compatible_devices": p.compatible_devices,
            "unit_price_jpy": p.unit_price_jpy,
            "unit_price_usd": p.unit_price_usd,
            "unit": p.unit,
            "lead_time_weeks": p.lead_time_weeks,
            "stock_status": p.stock_status,
            "is_recommended_for_next_maintenance": p.is_recommended_for_next_maintenance,
        }
        for p in parts
    ]


@router.post("/spare-parts")
async def create_spare_part(
    req: SparePartCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = await db.execute(select(SparePart).where(SparePart.part_number == req.part_number))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Part number already exists")

    part = SparePart(**req.model_dump())
    db.add(part)
    await db.commit()
    await db.refresh(part)
    return {"id": part.id, "part_number": part.part_number, "message": "Spare part created"}


@router.put("/spare-parts/{part_id}")
async def update_spare_part(
    part_id: int,
    req: SparePartUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(SparePart).where(SparePart.id == part_id))
    part = result.scalar_one_or_none()
    if not part:
        raise HTTPException(status_code=404, detail="Spare part not found")

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(part, field, value)

    await db.commit()
    await db.refresh(part)
    return {"id": part.id, "message": "Spare part updated"}


@router.delete("/spare-parts/{part_id}")
async def delete_spare_part(
    part_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(SparePart).where(SparePart.id == part_id))
    part = result.scalar_one_or_none()
    if not part:
        raise HTTPException(status_code=404, detail="Spare part not found")

    await db.delete(part)
    await db.commit()
    return {"message": "Spare part deleted"}


# ─── Articles ─────────────────────────────────────────────────────────────────

@router.get("/articles")
async def list_articles(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Article).order_by(Article.published_at.desc()))
    articles = result.scalars().all()
    return [
        {
            "id": a.id,
            "title_ja": a.title_ja,
            "title_en": a.title_en,
            "content_ja": a.content_ja,
            "content_en": a.content_en,
            "category": a.category,
            "tags": a.tags,
            "author": a.author,
            "published_at": a.published_at,
            "thumbnail_url": a.thumbnail_url,
        }
        for a in articles
    ]


@router.post("/articles")
async def create_article(
    req: ArticleCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    article = Article(
        title_ja=req.title_ja,
        title_en=req.title_en,
        content_ja=req.content_ja,
        content_en=req.content_en,
        category=req.category,
        tags=req.tags or "",
        author=req.author,
        thumbnail_url=req.thumbnail_url,
        published_at=datetime.utcnow(),
    )
    db.add(article)
    await db.commit()
    await db.refresh(article)
    return {"id": article.id, "title_ja": article.title_ja, "message": "Article created"}


@router.put("/articles/{article_id}")
async def update_article(
    article_id: int,
    req: ArticleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(article, field, value)

    await db.commit()
    await db.refresh(article)
    return {"id": article.id, "message": "Article updated"}


@router.delete("/articles/{article_id}")
async def delete_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    await db.delete(article)
    await db.commit()
    return {"message": "Article deleted"}


# ─── Seed function ───────────────────────────────────────────────────────────

async def seed_admin_data(db: AsyncSession):
    """Seed admin user, sample companies and compressors."""
    from routers.auth import hash_password as hp

    # Admin user
    existing_admin = await db.execute(select(User).where(User.email == "admin@example.com"))
    if not existing_admin.scalar_one_or_none():
        admin = User(
            email="admin@example.com",
            name="システム管理者",
            company="HI**** Compressor",
            role="admin",
            language="ja",
            password_hash=hp("admin123"),
            is_verified=True,
            created_at=datetime.utcnow(),
        )
        db.add(admin)
        print("[Seed] Admin user created: admin@example.com / admin123")

    # Sample companies
    existing_companies = await db.execute(select(Company))
    if not existing_companies.scalars().all():
        companies = [
            Company(
                name="東洋化学工業株式会社",
                name_en="Toyo Chemical Industry Co., Ltd.",
                country="日本",
                contact_email="contact@toyo-chem.co.jp",
                phone="03-1234-5678",
                address="東京都千代田区丸の内1-1-1",
                industry="化学工業",
                notes="主要顧客。圧縮機5台稼働中。",
                created_at=datetime.utcnow(),
            ),
            Company(
                name="中部石油精製株式会社",
                name_en="Chubu Oil Refining Co., Ltd.",
                country="日本",
                contact_email="info@chubu-oil.co.jp",
                phone="052-987-6543",
                address="愛知県名古屋市中区本町2-3-4",
                industry="石油精製",
                notes="圧縮機2台設置済み。",
                created_at=datetime.utcnow(),
            ),
            Company(
                name="Singapore Petrochemicals Pte Ltd",
                name_en="Singapore Petrochemicals Pte Ltd",
                country="シンガポール",
                contact_email="ops@sppl.sg",
                phone="+65-6123-4567",
                address="1 Jurong Island Highway, Singapore 627689",
                industry="石油化学",
                notes="海外顧客。英語対応。",
                created_at=datetime.utcnow(),
            ),
        ]
        for c in companies:
            db.add(c)
        await db.flush()

        # Sample compressors
        result = await db.execute(select(Company))
        all_companies = result.scalars().all()
        co_map = {co.name: co.id for co in all_companies}

        compressors = [
            Compressor(
                company_id=co_map.get("東洋化学工業株式会社"),
                serial_number="CMI-2021-001",
                model="HV-300C",
                installation_date=datetime(2021, 4, 1),
                location="第1プラント 圧縮棟A",
                status="active",
                design_pressure=3.5,
                design_flow=12000.0,
                rated_power=2200.0,
                notes="定期点検: 毎年4月",
                created_at=datetime.utcnow(),
            ),
            Compressor(
                company_id=co_map.get("東洋化学工業株式会社"),
                serial_number="CMI-2021-002",
                model="HV-300C",
                installation_date=datetime(2021, 4, 1),
                location="第1プラント 圧縮棟B",
                status="maintenance",
                design_pressure=3.5,
                design_flow=12000.0,
                rated_power=2200.0,
                notes="現在点検中",
                created_at=datetime.utcnow(),
            ),
            Compressor(
                company_id=co_map.get("中部石油精製株式会社"),
                serial_number="CMI-2022-001",
                model="HV-500A",
                installation_date=datetime(2022, 10, 15),
                location="精製棟 第3ライン",
                status="active",
                design_pressure=5.0,
                design_flow=20000.0,
                rated_power=3500.0,
                notes="",
                created_at=datetime.utcnow(),
            ),
            Compressor(
                company_id=co_map.get("Singapore Petrochemicals Pte Ltd"),
                serial_number="CMI-2023-SG01",
                model="HV-200B",
                installation_date=datetime(2023, 3, 20),
                location="Train 2 Compression Unit",
                status="active",
                design_pressure=2.8,
                design_flow=8500.0,
                rated_power=1500.0,
                notes="Overseas unit",
                created_at=datetime.utcnow(),
            ),
        ]
        for c in compressors:
            db.add(c)

        print("[Seed] Sample companies and compressors created.")

    await db.commit()
