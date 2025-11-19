from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.rag.database import Base
from typing import List, Optional# 방금 만든 SQLite용 Base 임포트
from pydantic import BaseModel
from datetime import datetime


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, index=True)  # Spring DB의 User ID
    document_id = Column(String, index=True)  # Spring DB의 Document ID
    session_title = Column(String, default="New Chat")
    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship(
        "ChatMessage", back_populates="session", cascade="all, delete-orphan"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"))
    role = Column(String)  # "user" or "ai"
    content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")
    
    # --- (신규) 채팅 기록 조회용 응답 스키마 ---

class ChatMessageDto(BaseModel):
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionDetailDto(BaseModel):
    session_id: str
    material_title: str             # ✅ 추가된 자료 제목
    messages: List[ChatMessageDto]  # 기존 메시지 리스트 포함

    class Config:
        from_attributes = True

class ChatSessionDto(BaseModel):
    id: str
    document_id: str
    material_title: Optional[str] = None  # ✅ [추가] 자료 제목
    session_title: str
    created_at: datetime
    last_message_preview: Optional[str] = None

    class Config:
        from_attributes = True