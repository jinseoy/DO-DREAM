from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Optional
import uuid 

# --- RAG 모듈 임포트 ---
# (수정) tasks.py 임포트 (1순위 고도화 - Celery)
# from app.rag.tasks import create_embedding_task
# (수정) 1순위 고도화를 아직 적용하지 않았으므로, service.py에서 직접 임포트
from app.rag.service import (
    download_json_from_cloudfront, 
    extract_data_from_json, 
    create_and_store_embeddings,
    get_rag_chain
)
# RAG DB(SQLite) 세션 의존성
from app.rag.database import get_rag_db
# RAG DB(SQLite) 모델 (ChatSession, ChatMessage)
from app.rag import models as rag_models

# --- 인증 모듈 임포트 ---
from app.security.auth import get_current_user
from app.security.models import User 

# --- Pydantic 스키마 ---
from pydantic import BaseModel, HttpUrl

# --- (신규) 2순위 고도화: LCEL용 Message 객체 임포트 ---
from langchain_core.messages import HumanMessage, AIMessage

class EmbeddingRequest(BaseModel):
    document_id: str
    s3_url: HttpUrl 

class ChatRequest(BaseModel):
    document_id: str
    question: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    session_id: str

# --- 라우터 생성 ---
router = APIRouter(
    prefix="/rag", 
    tags=["RAG"]   
)

# --- 워크플로우 1: 임베딩 생성 API (TEACHER 권한 필요) ---
# (이 API는 Celery를 적용하지 않았으므로, 이전과 동일하게 유지)
@router.post("/embeddings/create", status_code=201)
async def api_create_embedding( 
    request: EmbeddingRequest,
    current_user: User = Depends(get_current_user) 
):
    """
    (Spring 서버가 호출) S3/CloudFront URL의 JSON을 기반으로 임베딩을 생성합니다.
    **TEACHER** 역할 사용자만 이 API를 호출할 수 있습니다.
    """
    
    if current_user.role != "TEACHER":
        raise HTTPException(status_code=403, detail="임베딩을 생성할 권한이 없습니다.")

    try:
        print(f"'{request.document_id}' 임베딩 생성 요청 (CloudFront URL: {request.s3_url})")

        json_data = await download_json_from_cloudfront(str(request.s3_url))
        documents = extract_data_from_json(json_data)
        create_and_store_embeddings(request.document_id, documents)
        
        return {"status": "success", "document_id": request.document_id}
    
    except HTTPException as e:
        print(f"임베딩 생성 중 오류 발생: {e.detail}")
        raise e 
    except Exception as e:
        print(f"임베딩 생성 중 예상치 못한 오류 발생: {e}")
        raise HTTPException(status_code=500, detail=f"임베딩 생성 실패: {str(e)}")


# --- 워크플로우 2: RAG 질의응답 API (인증 필요) ---
# (수정) LCEL 체인을 호출하도록 로직 변경
@router.post("/chat", response_model=ChatResponse)
async def api_chat_with_rag(
    request: ChatRequest,
    rag_db: Session = Depends(get_rag_db), 
    current_user: User = Depends(get_current_user) 
):
    """
    (클라이언트가 호출) RAG 질의응답 API. 
    (수정) LCEL 체인을 사용하여 대화 기록을 명시적으로 전달합니다.
    """
    session_id = request.session_id
    user_id = current_user.id 
    document_id = request.document_id

    # 1. 세션 로드 또는 생성
    chat_history_tuples = [] # (수정) 변수 이름 변경
    if session_id:
        # (기존 세션) DB에서 메시지 조회
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
        
        chat_history_tuples = [(msg.role, msg.content) for msg in messages]

    else:
        # (새 세션) DB에 세션 생성
        session = rag_models.ChatSession(
            id=str(uuid.uuid4()), 
            user_id=user_id,
            document_id=document_id
        )
        rag_db.add(session)
        rag_db.commit()
        rag_db.refresh(session)
        session_id = session.id 
    
    # 2. 사용자 질문 DB에 저장
    user_message = rag_models.ChatMessage(
        session_id=session_id,
        role="user",
        content=request.question
    )
    rag_db.add(user_message)
    rag_db.commit() 

    # --- (신규) 2순위 고도화: LCEL용 대화 기록 변환 ---
    # [(role, content)] 튜플 리스트를 [HumanMessage, AIMessage] 객체 리스트로 변환
    lcel_chat_history = []
    for role, content in chat_history_tuples:
        if role == "user":
            lcel_chat_history.append(HumanMessage(content=content))
        elif role == "ai":
            lcel_chat_history.append(AIMessage(content=content))
    # --------------------------------------------------

    # 3. RAG 체인 생성 및 실행 (service.py 호출)
    try:
        # (수정) service.py의 새 LCEL 체인을 가져옴 (메모리 내장 X)
        chain = get_rag_chain(document_id) 
        
        # (수정) LCEL 체인 호출: 'input'과 'chat_history'를 명시적으로 전달
        result = await chain.ainvoke({
            "input": request.question,
            "chat_history": lcel_chat_history
        }) 
        
        # (유지) LCEL 체인도 'answer' 키로 답변을 반환
        answer = result["answer"]
        
        # 4. AI 답변 DB에 저장
        ai_message = rag_models.ChatMessage(
            session_id=session_id,
            role="ai",
            content=answer
        )
        rag_db.add(ai_message)
        rag_db.commit() 

        # 5. 클라이언트에 응답
        return ChatResponse(answer=answer, session_id=session_id)
    
    except Exception as e:
        print(f"RAG 처리 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail=f"RAG 처리 중 오류 발생: {str(e)}")