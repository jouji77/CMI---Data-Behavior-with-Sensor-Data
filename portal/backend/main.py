from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from database import init_db
from routers import sensors, documents, chat, chatbot

app = FastAPI(
    title="遠心圧縮機ポータル API",
    description="Centrifugal Compressor Portal - Sensor Diagnostics, Documents, Chat, AI Chatbot",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.include_router(sensors.router, prefix="/api/sensors", tags=["Sensors"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(chatbot.router, prefix="/api/chatbot", tags=["Chatbot"])


@app.on_event("startup")
async def startup_event():
    await init_db()
    print("Database initialized successfully.")


@app.get("/")
async def root():
    return {
        "message": "遠心圧縮機ポータル API",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
