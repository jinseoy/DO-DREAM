from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import DATABASE_URL

# DB 엔진 생성
engine = create_engine(DATABASE_URL)

# 세션 생성기
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# SQLAlchemy 모델을 위한 기본 클래스
Base = declarative_base()

def get_db():
    """
    FastAPI 의존성(Dependency) 함수.
    API 요청마다 DB 세션을 생성하고, 요청이 끝나면 닫습니다.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
