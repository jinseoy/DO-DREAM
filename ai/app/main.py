import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.rag import models as rag_models
from app.rag.database import engine as rag_engine

rag_models.Base.metadata.create_all(bind=rag_engine)

# (수정) /api 같은 하위 경로에서 실행할 경우를 대비해 root_path를 설정합니다.
# 서버의 실제 하위 경로에 맞춰 "/api" 부분을 수정하거나, 하위 경로가 없다면 이 줄을 제거하세요.
app = FastAPI(
    title="dodream 파이썬 서버",
    description="Spring 서버 JWT와 연동된 FastAPI 서버입니다.",
    version="1.0.0",
    root_path="/ai",  # 예: http://<도메인>/ai/docs 로 접속 시
)

# CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8080",  # Spring Boot 서버
        "http://127.0.0.1:8080",
        # 필요시 프론트엔드 origin도 추가
    ],
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)

# --- 라우터 임포트 ---
# 각 기능별 라우터 파일을 임포트합니다.
from app.user import router as user_router
from app.document_processor.router import router as document_router
from app.rag.router import router as rag_router

# --- 라우터 포함 ---
# 각 라우터에 prefix를 지정하여 URL 경로를 분리합니다.
app.include_router(user_router.router, prefix="/users", tags=["Users"])
app.include_router(document_router)
app.include_router(rag_router)


# --- 루트 엔드포인트 ---
# 서버가 살아있는지 확인하는 헬스 체크용 엔드포인트
@app.get("/")
def read_root():
    return {"message": "FastAPI RAG 서버가 실행 중입니다."}


# --- 서버 실행 (참고용) ---
# 이 파일(main.py)을 직접 python app/main.py로 실행할 경우 uvicorn을 구동합니다.
# (운영 환경에서는 'python -m uvicorn app.main:app --host 0.0.0.0 --port 8000' 명령어를 권장합니다)
if __name__ == "__main__":
    # (수정) reload=True 옵션은 서버(운영) 환경에서는 제거합니다.
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000)
