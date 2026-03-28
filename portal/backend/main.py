from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from database import init_db
from routers import sensors, documents, chat, chatbot
from routers import auth, maintenance, articles, spare_parts, inspection, solution
from routers import admin as admin_module

app = FastAPI(
    title="遠心圧縮機ポータル API",
    description="Centrifugal Compressor Portal - Sensor Diagnostics, Documents, Chat, AI Chatbot, Maintenance, Parts, Inspection, Solution",
    version="2.0.0",
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

# Existing routers
app.include_router(sensors.router, prefix="/api/sensors", tags=["Sensors"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(chatbot.router, prefix="/api/chatbot", tags=["Chatbot"])

# New routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(maintenance.router, prefix="/api/maintenance", tags=["Maintenance"])
app.include_router(articles.router, prefix="/api/articles", tags=["Articles"])
app.include_router(spare_parts.router, prefix="/api/spare-parts", tags=["Spare Parts"])
app.include_router(inspection.router, prefix="/api/inspection", tags=["Inspection"])
app.include_router(solution.router, prefix="/api/solution", tags=["Solution"])
app.include_router(admin_module.router, prefix="/api/admin", tags=["Admin"])


@app.on_event("startup")
async def startup_event():
    await init_db()
    print("Database initialized successfully.")

    # Seed data
    from database import AsyncSessionLocal
    from routers.maintenance import seed_maintenance
    from routers.articles import seed_articles
    from routers.spare_parts import seed_spare_parts
    from routers.inspection import seed_inspection_items

    from routers.admin import seed_admin_data

    async with AsyncSessionLocal() as db:
        await seed_maintenance(db)
        await seed_articles(db)
        await seed_spare_parts(db)
        await seed_inspection_items(db)
        await seed_admin_data(db)

    print("Seed data initialized.")


@app.get("/")
async def root():
    return {
        "message": "遠心圧縮機ポータル API",
        "docs": "/docs",
        "version": "2.0.0",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
