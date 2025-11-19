from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import Field
from datetime import datetime
import uuid

# --- RAG 모듈 임포트 ---
# ✅ Celery 태스크 임포트
from app.rag.tasks import create_embedding_task, create_initial_embedding_task

from app.rag.service import get_rag_chain


# RAG DB(SQLite) 세션 의존성
from app.rag.database import get_rag_db

# RAG DB(SQLite) 모델 (ChatSession, ChatMessage)
from app.rag import models as rag_models

# --- 인증 모듈 임포트 ---
from app.security.auth import get_current_user
from app.security.models import User

# --- Pydantic 스키마 ---
from pydantic import BaseModel, HttpUrl

# --- LCEL용 Message 객체 임포트 ---
from langchain_core.messages import HumanMessage, AIMessage

# --- (신규) 퀴즈 서비스 임포트 ---
from app.rag.quiz_service import generate_quiz_with_rag, grade_quiz_answers

from app.rag.models import ChatSessionDetailDto, ChatSessionDto
from app.common.models import Material
from app.common.db_session import get_db


# 🆕 초기 임베딩 요청 스키마 (S3 URL 받음)
class InitialEmbeddingRequest(BaseModel):
    pdf_id: int = Field(..., description="PDF ID (텍스트 추출 직후)")
    s3_url: HttpUrl = Field(..., description="S3/CloudFront JSON URL")


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


# 퀴즈 생성 요청 스키마
class GenerateQuizRequest(BaseModel):
    document_id: str = Field(..., description="문서 ID")
    num_questions: int = Field(
        default=10, ge=5, le=20, description="생성할 문제 수 (5~20)"
    )


# 퀴즈 문제 응답 스키마
class QuizQuestionResponse(BaseModel):
    question_type: str
    question_number: int
    title: str
    content: str
    correct_answer: str
    chapter_reference: Optional[str] = None


# 퀴즈 생성 응답 스키마
class GenerateQuizResponse(BaseModel):
    questions: List[QuizQuestionResponse]
    generated_at: datetime


# --- (신규) 채점 요청/응답 스키마 (Spring 연동용) ---


class GradeQuestionItem(BaseModel):
    id: int
    content: str
    correct_answer: str


class GradeStudentAnswerItem(BaseModel):
    question_id: int
    student_answer: str


class BatchGradingRequest(BaseModel):
    questions: List[GradeQuestionItem]
    student_answers: List[GradeStudentAnswerItem]


class GradingResultResponse(BaseModel):
    question_id: int
    student_answer: str
    is_correct: bool
    ai_feedback: str


# ---------------------------------


# --- 라우터 생성 ---
router = APIRouter(prefix="/rag", tags=["RAG"])


@router.post("/embeddings/create-initial", status_code=202)  # ✅ 202 Accepted
async def api_create_initial_embedding(
    request: InitialEmbeddingRequest, current_user: User = Depends(get_current_user)
):
    """
    텍스트 추출 직후 초기 임베딩을 생성합니다.

    **용도**:
    - Spring에서 PDF 텍스트 추출 완료 후 즉시 호출
    - Material 객체 생성 이전에 실행
    - 퀴즈 생성을 위한 임시 임베딩

    **처리 방식**: Celery 백그라운드 비동기 처리
    **권한**: TEACHER만 호출 가능
    """

    if current_user.role != "TEACHER":
        raise HTTPException(
            status_code=403, detail="교사만 임베딩을 생성할 수 있습니다."
        )

    try:
        print(
            f"🔵 초기 임베딩 생성 요청: PDF ID={request.pdf_id}, URL={request.s3_url}"
        )

        # ✅ Celery 태스크 비동기 실행
        task = create_initial_embedding_task.delay(
            pdf_id=str(request.pdf_id), s3_url=str(request.s3_url)
        )

        print(f"✅ 초기 임베딩 Celery 태스크 시작됨. Task ID: {task.id}")

        return {
            "status": "processing",
            "message": "초기 임베딩 생성 작업이 시작되었습니다.",
            "pdf_id": request.pdf_id,
            "collection_name": f"pdf_{request.pdf_id}",
            "task_id": task.id,
            "check_status_url": f"/rag/embeddings/status/{task.id}",
        }

    except Exception as e:
        print(f"❌ 초기 임베딩 태스크 시작 실패: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"초기 임베딩 작업 시작 실패: {str(e)}"
        )


# --- 워크플로우 1: 임베딩 생성 API (TEACHER 권한 필요) ---
# ✅ Celery를 사용하여 비동기 처리
@router.post("/embeddings/create", status_code=202)  # ✅ 202 Accepted로 변경
async def api_create_embedding(
    request: EmbeddingRequest, current_user: User = Depends(get_current_user)
):
    """
    (Spring 서버가 호출) S3/CloudFront URL의 JSON을 기반으로 임베딩을 생성합니다.
    **TEACHER** 역할 사용자만 이 API를 호출할 수 있습니다.

    ✅ 비동기 처리: Celery를 사용하여 백그라운드에서 임베딩을 생성합니다.
    즉시 task_id를 반환하며, 실제 처리는 백그라운드에서 진행됩니다.
    """

    if current_user.role != "TEACHER":
        raise HTTPException(status_code=403, detail="임베딩을 생성할 권한이 없습니다.")

    try:
        print(
            f"📤 '{request.document_id}' 임베딩 생성 요청 (CloudFront URL: {request.s3_url})"
        )

        # ✅ Celery 태스크 비동기 실행
        task = create_embedding_task.delay(
            document_id=request.document_id, s3_url=str(request.s3_url)
        )

        print(f"✅ Celery 태스크 시작됨. Task ID: {task.id}")

        return {
            "status": "processing",
            "message": "임베딩 생성 작업이 시작되었습니다.",
            "document_id": request.document_id,
            "task_id": task.id,
            "check_status_url": f"/rag/embeddings/status/{task.id}",
        }

    except Exception as e:
        print(f"❌ 임베딩 태스크 시작 실패: {e}")
        raise HTTPException(status_code=500, detail=f"임베딩 작업 시작 실패: {str(e)}")


# --- (신규) 임베딩 작업 상태 확인 API ---
@router.get("/embeddings/status/{task_id}")
async def check_embedding_status(
    task_id: str, current_user: User = Depends(get_current_user)
):
    """
    Celery 임베딩 작업의 진행 상태를 확인합니다.

    상태 종류:
    - PENDING: 대기 중
    - STARTED: 실행 중
    - SUCCESS: 성공
    - FAILURE: 실패
    - RETRY: 재시도 중
    """
    from celery.result import AsyncResult

    task_result = AsyncResult(task_id, app=create_embedding_task.app)

    response = {
        "task_id": task_id,
        "status": task_result.state,
    }

    if task_result.state == "PENDING":
        response["message"] = "작업이 대기 중이거나 시작되지 않았습니다."

    elif task_result.state == "STARTED":
        response["message"] = "임베딩 생성 작업이 진행 중입니다."

    elif task_result.state == "SUCCESS":
        response["message"] = "임베딩 생성이 완료되었습니다."
        response["result"] = task_result.result

    elif task_result.state == "FAILURE":
        response["message"] = "임베딩 생성 작업이 실패했습니다."
        response["error"] = str(task_result.info)

    elif task_result.state == "RETRY":
        response["message"] = "임베딩 생성 작업을 재시도 중입니다."

    else:
        response["message"] = f"알 수 없는 상태: {task_result.state}"

    return response


# --- 워크플로우 2: RAG 질의응답 API (인증 필요) ---
@router.post("/chat", response_model=ChatResponse)
async def api_chat_with_rag(
    request: ChatRequest,
    rag_db: Session = Depends(get_rag_db),
    current_user: User = Depends(get_current_user),
):
    """
    (클라이언트가 호출) RAG 질의응답 API.
    LCEL 체인을 사용하여 대화 기록을 명시적으로 전달합니다.
    """
    session_id = request.session_id
    user_id = current_user.id
    document_id = request.document_id

    # 1. 세션 로드 또는 생성
    chat_history_tuples = []
    if session_id:
        # (기존 세션) DB에서 메시지 조회
        session = (
            rag_db.query(rag_models.ChatSession)
            .filter(
                rag_models.ChatSession.id == session_id,
                rag_models.ChatSession.user_id == user_id,
            )
            .first()
        )

        if not session:
            raise HTTPException(
                status_code=404, detail="채팅 세션을 찾을 수 없거나 권한이 없습니다."
            )

        # (role, content) 튜플 리스트로 변환
        messages = (
            rag_db.query(rag_models.ChatMessage)
            .filter(rag_models.ChatMessage.session_id == session_id)
            .order_by(rag_models.ChatMessage.created_at)
            .all()
        )

        chat_history_tuples = [(msg.role, msg.content) for msg in messages]

    else:
        # (새 세션) DB에 세션 생성
        session = rag_models.ChatSession(
            id=str(uuid.uuid4()), user_id=user_id, document_id=document_id
        )
        rag_db.add(session)
        rag_db.commit()
        rag_db.refresh(session)
        session_id = session.id

    # 2. 사용자 질문 DB에 저장
    user_message = rag_models.ChatMessage(
        session_id=session_id, role="user", content=request.question
    )
    rag_db.add(user_message)
    rag_db.commit()

    # 3. LCEL용 대화 기록 변환
    lcel_chat_history = []
    for role, content in chat_history_tuples:
        if role == "user":
            lcel_chat_history.append(HumanMessage(content=content))
        elif role == "ai":
            lcel_chat_history.append(AIMessage(content=content))

    # 4. RAG 체인 생성 및 실행
    try:
        chain = get_rag_chain(document_id)

        result = await chain.ainvoke(
            {"input": request.question, "chat_history": lcel_chat_history}
        )

        answer = result["answer"]

        # 5. AI 답변 DB에 저장
        ai_message = rag_models.ChatMessage(
            session_id=session_id, role="ai", content=answer
        )
        rag_db.add(ai_message)
        rag_db.commit()

        # 6. 클라이언트에 응답
        return ChatResponse(answer=answer, session_id=session_id)

    except Exception as e:
        print(f"RAG 처리 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail=f"RAG 처리 중 오류 발생: {str(e)}")


# --- 워크플로우 3: 퀴즈 생성 API (TEACHER 권한 필요) ---
@router.post("/quiz/generate", response_model=GenerateQuizResponse)
async def api_generate_quiz(
    request: GenerateQuizRequest, current_user: User = Depends(get_current_user)
):
    """
    RAG를 사용하여 퀴즈를 자동 생성합니다.
    ⚠️ DB에 저장하지 않고 바로 반환합니다.

    **TEACHER** 역할 사용자만 이 API를 호출할 수 있습니다.

    생성된 퀴즈는 교사가 검토 및 편집 후,
    Spring API를 통해 최종 발행해야 합니다.
    """

    # 권한 확인
    if current_user.role != "TEACHER":
        raise HTTPException(status_code=403, detail="교사만 퀴즈를 생성할 수 있습니다.")

    try:
        print(
            f"📝 퀴즈 생성 요청: document_id={request.document_id}, num={request.num_questions}"
        )

        # quiz_service.py의 RAG 퀴즈 생성 함수 호출
        from app.rag.quiz_service import generate_quiz_with_rag

        questions = await generate_quiz_with_rag(
            document_id=request.document_id, num_questions=request.num_questions
        )

        # 문제 번호 및 제목 추가
        for idx, q in enumerate(questions, start=1):
            q["question_number"] = idx
            q["title"] = f"{idx}번 문제"

        # 응답 생성
        response = GenerateQuizResponse(
            questions=[QuizQuestionResponse(**q) for q in questions],
            generated_at=datetime.utcnow(),
        )

        print(f"✅ 퀴즈 생성 성공: {len(questions)}개 문제")

        return response

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 퀴즈 생성 API 오류: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"퀴즈 생성 중 오류 발생: {str(e)}")

    # --- (신규) 워크플로우 4: 퀴즈 일괄 채점 API ---


@router.post("/quiz/grade-batch", response_model=List[GradingResultResponse])
async def api_grade_quiz_batch(
    request: BatchGradingRequest, current_user: User = Depends(get_current_user)
):
    """
    Spring Server에서 전달받은 문제 정보와 학생 답안을 일괄 채점합니다.
    (학생/교사 모두 호출 가능 - Spring에서 권한 제어)
    """
    try:
        # Pydantic 모델을 dict 리스트로 변환하여 서비스 함수로 전달
        questions_dict = [q.dict() for q in request.questions]
        answers_dict = [a.dict() for a in request.student_answers]

        results = await grade_quiz_answers(questions_dict, answers_dict)

        return [GradingResultResponse(**res) for res in results]

    except Exception as e:
        print(f"❌ 채점 API 오류: {e}")
        raise HTTPException(status_code=500, detail=f"채점 실패: {str(e)}")

# -------------------------------------------------------
# 🏫 선생님용 학생 채팅 기록 조회 API (수정됨)
# -------------------------------------------------------

@router.get("/chat/sessions", response_model=List[ChatSessionDto])
async def get_student_chat_sessions(
    student_id: int = Query(..., description="조회할 학생의 ID"),
    current_user: User = Depends(get_current_user),
    rag_db: Session = Depends(get_rag_db),
    common_db: Session = Depends(get_db)  # ✅ db_session.py의 get_db 주입
):
    # 1. 권한 체크
    if current_user.role != "TEACHER":
        raise HTTPException(status_code=403, detail="권한이 없습니다.")

    # 2. RAG 세션 조회
    sessions = (
        rag_db.query(rag_models.ChatSession)
        .filter(rag_models.ChatSession.user_id == student_id)
        .order_by(rag_models.ChatSession.created_at.desc())
        .all()
    )

    if not sessions:
        return []

    # 3. Material 제목 조회 (Batch Query)
    doc_ids = set()
    for s in sessions:
        # document_id가 숫자인지 확인 (혹시 모를 에러 방지)
        if s.document_id and s.document_id.isdigit():
            doc_ids.add(int(s.document_id))
    
    material_map = {}
    if doc_ids:
        materials = (
            common_db.query(Material.id, Material.title)
            .filter(Material.id.in_(doc_ids))
            .all()
        )
        material_map = {str(m.id): m.title for m in materials}

    # 4. 매핑 및 응답 반환
    result = []
    for session in sessions:
        last_msg = (
            rag_db.query(rag_models.ChatMessage)
            .filter(rag_models.ChatMessage.session_id == session.id)
            .order_by(rag_models.ChatMessage.created_at.desc())
            .first()
        )
        
        title = material_map.get(str(session.document_id), "삭제된 자료")

        result.append(ChatSessionDto(
            id=session.id,
            document_id=session.document_id,
            material_title=title,
            session_title=session.session_title,
            created_at=session.created_at,
            last_message_preview=last_msg.content[:50] + "..." if last_msg else "대화 없음"
        ))

    return result


@router.get("/chat/sessions/{session_id}/messages", response_model=ChatSessionDetailDto) # ✅ 반환 타입 변경
async def get_student_chat_session_history(
    session_id: str,
    student_id: int = Query(..., description="해당 세션을 소유한 학생의 ID (검증용)"),
    current_user: User = Depends(get_current_user),
    rag_db: Session = Depends(get_rag_db),
    common_db: Session = Depends(get_db)   # ✅ MySQL DB 주입
):
    """
    [선생님용] 특정 학생의 특정 세션 상세 대화 내용을 조회합니다. (자료 제목 포함)
    """
    # 1. 교사 권한 검증
    if current_user.role != "TEACHER":
        raise HTTPException(
            status_code=403, 
            detail="학생의 상세 대화 내용을 조회할 권한이 없습니다."
        )

    # 2. 세션 조회 및 소유권 확인
    session = (
        rag_db.query(rag_models.ChatSession)
        .filter(
            rag_models.ChatSession.id == session_id,
            rag_models.ChatSession.user_id == student_id
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=404, 
            detail="해당 학생의 채팅 세션을 찾을 수 없습니다."
        )

    # 3. 자료 제목 조회 (MySQL) ✅ 추가된 로직
    material_title = "삭제된 자료" # 기본값
    if session.document_id and session.document_id.isdigit():
        material = (
            common_db.query(Material)
            .filter(Material.id == int(session.document_id))
            .first()
        )
        if material:
            material_title = material.title

    # 4. 메시지 조회
    messages = (
        rag_db.query(rag_models.ChatMessage)
        .filter(rag_models.ChatMessage.session_id == session_id)
        .order_by(rag_models.ChatMessage.created_at.asc())
        .all()
    )

    # 5. 결과 반환 (Wrapper 객체 사용)
    return ChatSessionDetailDto(
        session_id=session.id,
        material_title=material_title,  # 조회한 제목
        messages=messages               # 메시지 리스트
    )