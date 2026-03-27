from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os
import uuid
import aiofiles
from datetime import datetime

from database import get_db, Document

router = APIRouter()

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

CATEGORIES = [
    "顧客提出図書",
    "サービス報告書",
    "仕様書",
    "取扱説明書",
    "その他",
]

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".xlsx", ".xls", ".txt", ".png", ".jpg", ".jpeg"}


@router.get("/categories")
async def get_categories():
    return {"categories": CATEGORIES}


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    uploaded_by: str = Form(default="Unknown"),
    description: str = Form(default=""),
    category: str = Form(default="その他"),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type {ext} not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    if category not in CATEGORIES:
        category = "その他"

    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOADS_DIR, unique_filename)

    content = await file.read()
    file_size = len(content)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    doc = Document(
        filename=unique_filename,
        original_name=file.filename,
        file_type=ext.lstrip("."),
        file_size=file_size,
        uploaded_by=uploaded_by,
        uploaded_at=datetime.utcnow(),
        description=description,
        category=category,
        is_indexed=False,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return {
        "id": doc.id,
        "filename": doc.filename,
        "original_name": doc.original_name,
        "file_type": doc.file_type,
        "file_size": doc.file_size,
        "uploaded_by": doc.uploaded_by,
        "uploaded_at": doc.uploaded_at.isoformat(),
        "description": doc.description,
        "category": doc.category,
        "is_indexed": doc.is_indexed,
    }


@router.get("")
async def list_documents(
    category: str = None,
    search: str = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Document).order_by(Document.uploaded_at.desc())
    result = await db.execute(stmt)
    docs = result.scalars().all()

    if category:
        docs = [d for d in docs if d.category == category]
    if search:
        search_lower = search.lower()
        docs = [d for d in docs if search_lower in d.original_name.lower() or search_lower in (d.description or "").lower()]

    return {
        "documents": [
            {
                "id": d.id,
                "filename": d.filename,
                "original_name": d.original_name,
                "file_type": d.file_type,
                "file_size": d.file_size,
                "uploaded_by": d.uploaded_by,
                "uploaded_at": d.uploaded_at.isoformat(),
                "description": d.description,
                "category": d.category,
                "is_indexed": d.is_indexed,
            }
            for d in docs
        ]
    }


@router.get("/{doc_id}/download")
async def download_document(doc_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Document).where(Document.id == doc_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = os.path.join(UPLOADS_DIR, doc.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=file_path,
        filename=doc.original_name,
        media_type="application/octet-stream",
    )


@router.delete("/{doc_id}")
async def delete_document(doc_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Document).where(Document.id == doc_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = os.path.join(UPLOADS_DIR, doc.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    await db.delete(doc)
    await db.commit()

    return {"message": f"Document '{doc.original_name}' deleted successfully"}
