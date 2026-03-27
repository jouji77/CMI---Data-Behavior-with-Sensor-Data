from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime
from typing import Dict, List, Set
import json
import uuid

from database import get_db, ChatMessage, ChatRoom

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[dict]] = {}

    async def connect(self, websocket: WebSocket, room_id: str, user_name: str, user_role: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append({
            "websocket": websocket,
            "user_name": user_name,
            "user_role": user_role,
        })

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id] = [
                conn for conn in self.active_connections[room_id]
                if conn["websocket"] != websocket
            ]
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast_to_room(self, room_id: str, message: dict):
        if room_id in self.active_connections:
            disconnected = []
            for conn in self.active_connections[room_id]:
                try:
                    await conn["websocket"].send_text(json.dumps(message, ensure_ascii=False))
                except Exception:
                    disconnected.append(conn)
            for conn in disconnected:
                self.active_connections[room_id].remove(conn)

    def get_room_users(self, room_id: str) -> List[dict]:
        if room_id not in self.active_connections:
            return []
        return [
            {"user_name": conn["user_name"], "user_role": conn["user_role"]}
            for conn in self.active_connections[room_id]
        ]

    def get_active_rooms(self) -> List[str]:
        return list(self.active_connections.keys())


manager = ConnectionManager()


class CreateRoomRequest(BaseModel):
    room_name: str
    created_by: str


@router.post("/rooms")
async def create_room(request: CreateRoomRequest, db: AsyncSession = Depends(get_db)):
    room_id = str(uuid.uuid4())[:8].upper()

    room = ChatRoom(
        room_id=room_id,
        room_name=request.room_name,
        created_at=datetime.utcnow(),
        created_by=request.created_by,
    )
    db.add(room)
    await db.commit()
    await db.refresh(room)

    return {
        "room_id": room.room_id,
        "room_name": room.room_name,
        "created_at": room.created_at.isoformat(),
        "created_by": room.created_by,
    }


@router.get("/rooms")
async def list_rooms(db: AsyncSession = Depends(get_db)):
    stmt = select(ChatRoom).order_by(ChatRoom.created_at.desc())
    result = await db.execute(stmt)
    rooms = result.scalars().all()

    room_list = []
    for room in rooms:
        active_users = manager.get_room_users(room.room_id)
        room_list.append({
            "room_id": room.room_id,
            "room_name": room.room_name,
            "created_at": room.created_at.isoformat(),
            "created_by": room.created_by,
            "active_users": active_users,
            "is_active": len(active_users) > 0,
        })

    return {"rooms": room_list}


@router.get("/messages/{room_id}")
async def get_messages(room_id: str, limit: int = 50, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.room_id == room_id)
        .order_by(ChatMessage.timestamp.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()
    messages = list(reversed(messages))

    return {
        "room_id": room_id,
        "messages": [
            {
                "id": m.id,
                "room_id": m.room_id,
                "sender_name": m.sender_name,
                "sender_role": m.sender_role,
                "message": m.message,
                "timestamp": m.timestamp.isoformat(),
            }
            for m in messages
        ],
    }


@router.websocket("/ws/{room_id}/{user_name}/{user_role}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    user_name: str,
    user_role: str,
):
    await manager.connect(websocket, room_id, user_name, user_role)

    join_message = {
        "type": "system",
        "message": f"{user_name} ({user_role}) が参加しました",
        "timestamp": datetime.utcnow().isoformat(),
        "users": manager.get_room_users(room_id),
    }
    await manager.broadcast_to_room(room_id, join_message)

    try:
        from database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            while True:
                data = await websocket.receive_text()
                try:
                    msg_data = json.loads(data)
                    message_text = msg_data.get("message", "").strip()
                    if not message_text:
                        continue

                    chat_msg = ChatMessage(
                        room_id=room_id,
                        sender_name=user_name,
                        sender_role=user_role,
                        message=message_text,
                        timestamp=datetime.utcnow(),
                    )
                    db.add(chat_msg)
                    await db.commit()
                    await db.refresh(chat_msg)

                    broadcast_msg = {
                        "type": "message",
                        "id": chat_msg.id,
                        "room_id": room_id,
                        "sender_name": user_name,
                        "sender_role": user_role,
                        "message": message_text,
                        "timestamp": chat_msg.timestamp.isoformat(),
                    }
                    await manager.broadcast_to_room(room_id, broadcast_msg)

                except json.JSONDecodeError:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Invalid JSON"}))

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        leave_message = {
            "type": "system",
            "message": f"{user_name} が退室しました",
            "timestamp": datetime.utcnow().isoformat(),
            "users": manager.get_room_users(room_id),
        }
        await manager.broadcast_to_room(room_id, leave_message)
