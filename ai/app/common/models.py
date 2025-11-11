from sqlalchemy import Column, Integer, String, Enum
from app.common.db_session import Base # Base 클래스 임포트
import enum

# Spring Role Enum과 동일하게 정의
class RoleEnum(enum.Enum):
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"

class User(Base):
    """
    Spring User 엔티티에 매핑되는 SQLAlchemy 모델
    """
    
    # Spring의 @Table(name = "users")
    __tablename__ = "users"

    # Spring의 @Id @GeneratedValue
    id = Column(Integer, primary_key=True, index=True) # GenerationType.IDENTITY는 자동 처리
    
    # Spring의 private String name;
    name = Column(String, index=True)
    
    # Spring의 @Enumerated(EnumType.STRING)
    role = Column(Enum(RoleEnum))

    # Spring의 BaseTimeEntity (created_at, updated_at)는
    # 필요하다면 여기에 Column(DateTime, ...) 등으로 추가할 수 있습니다.

