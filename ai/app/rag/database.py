from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# SQLite DB 파일 경로 설정 (예: fastapi-rag-server/rag.db)
SQLALCHEMY_DATABASE_URL = "sqlite:///./rag.db"

# SQLite 엔진 생성
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# SQLite용 세션 생성기
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# RAG 모델(ChatSession, ChatMessage)을 위한 기본 클래스
Base = declarative_base()


def get_rag_db():
    """
    FastAPI 의존성(Dependency) 함수.
    RAG API 요청마다 SQLite DB 세션을 생성하고, 요청이 끝나면 닫습니다.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
