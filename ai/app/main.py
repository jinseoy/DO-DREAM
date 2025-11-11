import uvicorn
from fastapi import FastAPI
from app.user import router as user_router
# 2. FastAPI 앱 인스턴스 생성
app = FastAPI(
    title="dodream 파이썬 서버",
    description="Spring 서버 JWT와 연동된 FastAPI 서버입니다.",
    version="1.0.0"
)

# 3. 라우터 포함
# /extract로 시작하는 모든 경로는 extraction_router가 처리
#app.include_router(extraction_router.router) - 예시
# /rag로 시작하는 모든 경로는 rag_router가 처리
#app.include_router(rag_router.router) - 예시
app.include_router(user_router.router)

# 4. 루트 엔드포인트 (헬스 체크용)
@app.get("/")
def read_root():
    return {"message": "FastAPI RAG 서버가 실행 중입니다."}

# 5. 서버 실행 (uvicorn 사용)
# 터미널에서: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
