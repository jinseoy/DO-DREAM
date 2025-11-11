from typing import Optional
from sqlalchemy.orm import Session # SQLAlchemy 세션 임포트

# Pydantic 모델 (API 응답용)
from app.security.models import User as PydanticUser 
# SQLAlchemy 모델 (DB 매핑용)
from app.common.models import User as SQLAlchemyUser

def get_user_from_db(db: Session, user_id: int) -> Optional[PydanticUser]:
    """
    Spring의 userRepository.findById(userId)와 동일한 역할을 수행합니다.
    SQLAlchemy 세션을 받아 DB에서 사용자를 조회합니다.
    """
    
    # SQLAlchemy를 사용한 DB 조회
    # db.query(모델).filter(조건).first()
    db_user = db.query(SQLAlchemyUser).filter(SQLAlchemyUser.id == user_id).first()
    
    if db_user:
        # SQLAlchemy 모델(db_user)을 Pydantic 모델(PydanticUser)로 변환하여 반환
        return PydanticUser(
            id=db_user.id, 
            name=db_user.name, 
            role=db_user.role.name # Enum 객체에서 문자열 이름(.name)을 가져옵니다.
        )
    
    # 사용자가 없으면 None 반환
    return None

