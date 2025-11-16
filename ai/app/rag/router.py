from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Optional
import uuid # 세션 ID 생성을 위해 추가

# --- RAG 모듈 임포트 ---
# RAG 서비스 로직 (임베딩 생성, RAG 체인)
from app.rag.service import (
    download_json_from_cloudfront, # (수정) httpx 다운로드 함수 임포트
    extract_data_from_json, 
    create_and_store_embeddings,
    get_rag_chain
)
# RAG DB(SQLite) 세션 의존성
from app.rag.database import get_rag_db
# RAG DB(SQLite) 모델 (ChatSession, ChatMessage)
from app.rag import models as rag_models

# --- 인증 모듈 임포트 (사용자 예시와 동일) ---
# JWT 검증 및 사용자 정보 로드 의존성
from app.security.auth import get_current_user
# Pydantic User 스키마 (인증된 사용자 정보)
from app.security.models import User 

# --- (삭제) S3 버킷 이름 임포트 불필요 ---
# from app.config import S3_BUCKET_NAME

# --- Pydantic 스키마 (Request/Response Body용) ---
from pydantic import BaseModel, HttpUrl # (수정) HttpUrl 임포트

class EmbeddingRequest(BaseModel):
    document_id: str
    s3_url: HttpUrl # (수정) Boto3 Key가 아닌 CloudFront URL을 받음

class ChatRequest(BaseModel):
    document_id: str
    question: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    session_id: str

# --- 라우터 생성 ---
router = APIRouter(
    prefix="/rag", # /rag로 시작
    tags=["RAG"]   # API 문서에서 "RAG" 그룹
)

# --- 워크플로우 1: 임베딩 생성 API (TEACHER 권한 필요) ---
@router.post("/embeddings/create", status_code=201)
async def api_create_embedding( # (수정) 'async' 추가
    request: EmbeddingRequest,
    # (핵심) JWT 인증 및 사용자 정보 로드
    current_user: User = Depends(get_current_user) 
):
    """
    (Spring 서버가 호출) S3/CloudFront URL의 JSON을 기반으로 임베딩을 생성합니다.
    **TEACHER** 역할 사용자만 이 API를 호출할 수 있습니다.
    """
    
    # (핵심) 권한 검증
    # User 모델에 'role'이 있고, 그 값이 'TEACHER'라고 가정합니다.
    if current_user.role != "TEACHER":
        raise HTTPException(status_code=403, detail="임베딩을 생성할 권한이 없습니다.")

    try:
        print(f"'{request.document_id}' 임베딩 생성 요청 (CloudFront URL: {request.s3_url})")

        # 1. (수정) CloudFront에서 실제 JSON 다운로드 (service.py 호출)
        # request.s3_url이 Spring이 서명한 CloudFront URL이라고 가정
        json_data = await download_json_from_cloudfront(str(request.s3_url))
        
        # 2. (수정) 실제 JSON 파서 호출 (service.py 호출)
        documents = extract_data_from_json(json_data)
        
        # 3. 임베딩 생성 및 ChromaDB 저장 (service.py 호출)
        create_and_store_embeddings(request.document_id, documents)
        
        return {"status": "success", "document_id": request.document_id}
    
    except HTTPException as e:
        # (download_json_from_cloudfront에서 발생한 HTTPException)
        print(f"임베딩 생성 중 오류 발생: {e.detail}")
        raise e # FastAPI가 처리하도록 그대로 전달
    except Exception as e:
        # (JSON 파싱 오류, 임베딩 API 오류 등)
        print(f"임베딩 생성 중 예상치 못한 오류 발생: {e}")
        raise HTTPException(status_code=500, detail=f"임베딩 생성 실패: {str(e)}")


# --- 워크플로우 2: RAG 질의응답 API (인증 필요) ---
# (이하 /chat API는 수정 없이 동일하게 유지)
@router.post("/chat", response_model=ChatResponse)
async def api_chat_with_rag(
    request: ChatRequest,
    # RAG(SQLite) DB 세션 주입
    rag_db: Session = Depends(get_rag_db), 
    # (핵심) JWT 인증 및 사용자 정보 로드
    current_user: User = Depends(get_current_user) 
):
    """
    (클라이언트가 호출) RAG 질의응답 API. 
    인증된 사용자만 호출 가능하며, 세션 관리를 포함합니다.
    """
    session_id = request.session_id
    user_id = current_user.id # 인증된 사용자의 ID
    document_id = request.document_id

    # 1. 세션 로드 또는 생성
    chat_history = []
    if session_id:
        # (기존 세션) DB에서 메시지 조회
        # (보안) 현재 사용자의 세션이 맞는지 확인 (user_id == current_user.id)
        session = rag_db.query(rag_models.ChatSession).filter(
            rag_models.ChatSession.id == session_id,
            rag_models.ChatSession.user_id == user_id 
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="채팅 세션을 찾을 수 없거나 권한이 없습니다.")
        
        # (role, content) 튜플 리스트로 변환
        messages = rag_db.query(rag_models.ChatMessage).filter(
            rag_models.ChatMessage.session_id == session_id
        ).order_by(rag_models.ChatMessage.created_at).all()
        
        chat_history = [(msg.role, msg.content) for msg in messages]

    else:
        # (새 세션) DB에 세션 생성
        session = rag_models.ChatSession(
            id=str(uuid.uuid4()), # 새 UUID 생성
            user_id=user_id,
            document_id=document_id
        )
        rag_db.add(session)
        rag_db.commit()
        rag_db.refresh(session)
        session_id = session.id # 새로 생성된 세션 ID
    
    # 2. 사용자 질문 DB에 저장
    user_message = rag_models.ChatMessage(
        session_id=session_id,
        role="user",
        content=request.question
    )
    rag_db.add(user_message)
    rag_db.commit() # (중요) 질문을 먼저 커밋

    # 3. RAG 체인 생성 및 실행 (service.py 호출)
    try:
        # (service.py) 메모리 생성, Retriever 로드, 체인 생성
        chain = get_rag_chain(document_id, chat_history) 
        
        # 비동기 호출로 LLM 응답 대기
        result = await chain.ainvoke({"question": request.question}) 
        answer = result["answer"]
        
        # 4. AI 답변 DB에 저장
        ai_message = rag_models.ChatMessage(
            session_id=session_id,
            role="ai",
            content=answer
        )
        rag_db.add(ai_message)
        rag_db.commit() # (중요) 답변을 커밋

        # 5. 클라이언트에 응답
        return ChatResponse(answer=answer, session_id=session_id)
    
    except Exception as e:
        # (ChromaDB에 document_id 컬렉션이 없는 경우, LLM API 오류 등)
        print(f"RAG 처리 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail=f"RAG 처리 중 오류 발생: {str(e)}")