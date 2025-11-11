from pydantic import BaseModel
from typing import Optional

class TokenPayload(BaseModel):
    """Spring JWT Payload(Claims)"""
    sub: str  # 사용자 ID
    name: Optional[str] = None
    role: Optional[str] = None

class User(BaseModel):
    """DB에서 조회한 사용자 모델 (Python 서버용)"""
    id: int
    name: str
    role: str
