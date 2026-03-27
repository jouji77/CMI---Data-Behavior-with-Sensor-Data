from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
import os
import json

from database import get_db, Document

router = APIRouter()

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# In-memory store for indexed document chunks (for demo without persistent ChromaDB)
indexed_documents: dict = {}


class ChatRequest(BaseModel):
    message: str
    document_ids: List[int] = []
    conversation_history: List[dict] = []


class IndexRequest(BaseModel):
    document_id: int


def extract_text_from_file(file_path: str, file_type: str) -> str:
    """Extract text content from uploaded files."""
    try:
        if file_type in ("txt",):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        elif file_type == "pdf":
            try:
                import PyPDF2
                text = ""
                with open(file_path, "rb") as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        text += page.extract_text() + "\n"
                return text
            except Exception as e:
                return f"[PDF extraction error: {e}]"
        elif file_type in ("docx",):
            try:
                from docx import Document as DocxDocument
                doc = DocxDocument(file_path)
                return "\n".join([para.text for para in doc.paragraphs])
            except Exception as e:
                return f"[DOCX extraction error: {e}]"
        else:
            return f"[Unsupported file type: {file_type}]"
    except Exception as e:
        return f"[Error reading file: {e}]"


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
    """Split text into overlapping chunks."""
    if len(text) <= chunk_size:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk)
        start = end - overlap
    return chunks


def simple_similarity(query: str, text: str) -> float:
    """Simple keyword-based similarity scoring."""
    query_words = set(query.lower().split())
    text_lower = text.lower()
    matches = sum(1 for word in query_words if word in text_lower and len(word) > 2)
    return matches / max(len(query_words), 1)


def retrieve_relevant_chunks(query: str, document_ids: List[int], top_k: int = 3) -> List[dict]:
    """Retrieve most relevant text chunks from indexed documents."""
    all_chunks = []
    for doc_id in document_ids:
        if doc_id in indexed_documents:
            doc_info = indexed_documents[doc_id]
            for i, chunk in enumerate(doc_info["chunks"]):
                score = simple_similarity(query, chunk)
                all_chunks.append({
                    "doc_id": doc_id,
                    "doc_name": doc_info["name"],
                    "chunk_index": i,
                    "text": chunk,
                    "score": score,
                })

    all_chunks.sort(key=lambda x: x["score"], reverse=True)
    return all_chunks[:top_k]


def build_mock_response(message: str, context_chunks: List[dict]) -> str:
    """Generate a mock response when no API key is set."""
    if context_chunks and any(c["score"] > 0 for c in context_chunks):
        sources = list(set(c["doc_name"] for c in context_chunks))
        return (
            f"[デモモード - ANTHROPIC_API_KEY未設定]\n\n"
            f"ご質問「{message}」について、以下のドキュメントから関連情報を見つけました：\n"
            + "\n".join(f"- {s}" for s in sources)
            + "\n\n実際の回答を得るには、ANTHROPIC_API_KEYを設定してください。"
        )
    return (
        f"[デモモード - ANTHROPIC_API_KEY未設定]\n\n"
        f"ご質問「{message}」を受け取りました。\n"
        "実際のAI回答を得るには、環境変数ANTHROPIC_API_KEYを設定してください。\n"
        "また、AIチャットボットで使用するドキュメントをインデックスしてから選択してください。"
    )


@router.post("/chat")
async def chatbot_chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    context_chunks = []
    context_text = ""

    if request.document_ids:
        context_chunks = retrieve_relevant_chunks(request.message, request.document_ids, top_k=4)
        if context_chunks:
            context_text = "\n\n".join(
                f"[{c['doc_name']} - 抜粋{c['chunk_index'] + 1}]:\n{c['text']}"
                for c in context_chunks
                if c["score"] > 0
            )

    sources_used = list(set(c["doc_name"] for c in context_chunks if c["score"] > 0))

    if not ANTHROPIC_API_KEY:
        mock_response = build_mock_response(request.message, context_chunks)
        return {
            "response": mock_response,
            "sources": sources_used,
            "model": "mock",
        }

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        system_prompt = (
            "あなたは遠心圧縮機の専門的なサービスエンジニアです。"
            "顧客からの技術的な質問に丁寧かつ正確に日本語で回答してください。"
            "提供されたドキュメントの内容を優先して回答し、"
            "不明な点は「この情報はドキュメントには含まれていません」と明示してください。"
        )

        if context_text:
            system_prompt += f"\n\n以下は関連するドキュメントの内容です：\n\n{context_text}"

        messages = []
        for hist in request.conversation_history[-6:]:
            role = hist.get("role", "user")
            content = hist.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": request.message})

        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
        )

        answer = response.content[0].text

        return {
            "response": answer,
            "sources": sources_used,
            "model": "claude-3-haiku-20240307",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI API error: {str(e)}")


@router.post("/index/{document_id}")
async def index_document(document_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Document).where(Document.id == document_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    file_path = os.path.join(uploads_dir, doc.filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    text = extract_text_from_file(file_path, doc.file_type)
    chunks = chunk_text(text)

    indexed_documents[document_id] = {
        "doc_id": document_id,
        "name": doc.original_name,
        "category": doc.category,
        "chunks": chunks,
        "chunk_count": len(chunks),
    }

    doc.is_indexed = True
    await db.commit()

    return {
        "message": f"Document '{doc.original_name}' indexed successfully",
        "document_id": document_id,
        "chunk_count": len(chunks),
    }


@router.get("/indexed")
async def list_indexed_documents(db: AsyncSession = Depends(get_db)):
    indexed_ids = list(indexed_documents.keys())

    if not indexed_ids:
        return {"indexed_documents": []}

    stmt = select(Document).where(Document.id.in_(indexed_ids))
    result = await db.execute(stmt)
    docs = result.scalars().all()

    return {
        "indexed_documents": [
            {
                "id": d.id,
                "original_name": d.original_name,
                "category": d.category,
                "chunk_count": indexed_documents.get(d.id, {}).get("chunk_count", 0),
            }
            for d in docs
        ]
    }
