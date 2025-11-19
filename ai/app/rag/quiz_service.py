"""
퀴즈 생성 및 채점을 위한 RAG 서비스
"""
import json
import asyncio
from typing import List, Dict, Any
from fastapi import HTTPException
from langchain_core.prompts import ChatPromptTemplate
from langchain_chroma import Chroma
from langchain_openai import ChatOpenAI # 직접 초기화를 위해 임포트

from app.rag.service import (
    embedding_model,
    CHROMA_PERSIST_DIRECTORY,
    _get_collection_name,
    GMS_BASE_URL,
    GMS_KEY
)

# --- (신규) 퀴즈/채점 전용 고속 LLM 초기화 ---
try:
    quiz_llm = ChatOpenAI(
        temperature=0.0, # 채점은 일관성이 중요하므로 0.0으로 설정
        model_name="gpt-5-mini", # 속도/비용 최적화 모델
        api_key=GMS_KEY,
        base_url=GMS_BASE_URL
    )
    print("✅ 퀴즈/채점용 Fast LLM (gpt-5-mini) 초기화 성공")
except Exception as e:
    print(f"❌ 퀴즈용 LLM 초기화 실패: {e}")
    quiz_llm = None
# ---------------------------------------


async def generate_quiz_with_rag(
    document_id: str,
    num_questions: int = 10
) -> List[Dict]:
    """
    RAG를 사용하여 문서에서 퀴즈를 자동 생성합니다.
    """
    
    # 모델 초기화 확인
    if not embedding_model or not quiz_llm:
        raise ValueError("임베딩 모델 또는 퀴즈용 LLM이 초기화되지 않았습니다.")
    
    try:
        # 1. Chroma에서 문서 검색
        collection_name = _get_collection_name(document_id)
        
        vectorstore = Chroma(
            persist_directory=CHROMA_PERSIST_DIRECTORY,
            embedding_function=embedding_model,
            collection_name=collection_name
        )
        
        # 2. 문서 검색 + 재시도(Retry) 로직
        docs = []
        max_retries = 5
        retry_delay = 2.0
        
        print(f"🔍 문서 검색 시작 (Collection: {collection_name})...")
        
        for i in range(max_retries):
            try:
                docs = vectorstore.similarity_search(
                    "중요한 개념, 정의, 특징, 법칙",
                    k=num_questions * 3,  
                )
            except Exception:
                docs = []

            if docs:
                break
            
            print(f"⏳ 문서가 아직 준비되지 않음. {retry_delay}초 후 재시도... ({i+1}/{max_retries})")
            await asyncio.sleep(retry_delay)
        
        if not docs:
            raise ValueError(f"'{document_id}' 문서가 아직 처리되지 않았거나 콘텐츠를 찾을 수 없습니다.")
        
        print(f"📚 {len(docs)}개의 문서 청크를 검색했습니다.")
        
        # 3. 문서 컨텍스트 구성
        doc_context = "\n\n---\n\n".join([
            f"[출처: {doc.metadata.get('title', '제목 없음')}]\n{doc.page_content[:500]}"
            for doc in docs[:num_questions * 2]
        ])
        
        # 4. 퀴즈 생성 프롬프트
        quiz_generation_prompt = ChatPromptTemplate.from_messages([
            ("system", """
당신은 시각장애 학생을 위한 퀴즈 출제 전문가입니다.

[!!중요 규칙!!]
1. 모바일 TTS로 읽히므로 문제는 **50자 이내**로 간결하게 작성하세요.
2. 정답은 **단어 또는 짧은 구문** (10자 이내)으로 제한하세요.
3. 다음 3가지 유형의 문제만 출제하세요:
   - TERM_DEFINITION: 정의를 주고 용어를 맞추기
     예) "사회생활을 하는 인간에 의해 인위적으로 발생하는 현상은?"
   - FILL_BLANK: 빈칸 채우기
     예) "사회문화 현상은 ( )의 특징을 가진다."
   - SHORT_ANSWER: 단답형
     예) "자연 현상의 첫 번째 특징은?"

[응답 형식]
반드시 다음 JSON 배열 형식으로만 응답하세요:
[
  {{
    "question_type": "TERM_DEFINITION",
    "content": "문제 내용 (50자 이내)",
    "correct_answer": "정답 (10자 이내)",
    "chapter_reference": "출처 챕터명"
  }},
  ...
]

**중요**: JSON 외에 다른 텍스트는 절대 포함하지 마세요.
             """),
            ("user", """
다음 학습 자료를 바탕으로 **{num_questions}개의 퀴즈**를 생성하세요.

[학습 자료]
{documents}
             """)
        ])
        
        # 5. LLM 호출 (gpt-4o-mini 사용)
        chain = quiz_generation_prompt | quiz_llm
        
        print(f"🤖 LLM에게 {num_questions}개 퀴즈 생성 요청 중...")
        
        result = await chain.ainvoke({
            "num_questions": num_questions,
            "documents": doc_context
        })
        
        # 6. JSON 파싱
        content = result.content.strip()
        content = content.replace("```json", "").replace("```", "").strip()
        
        try:
            questions = json.loads(content)
        except json.JSONDecodeError as e:
            print(f"❌ JSON 파싱 실패. LLM 응답:\n{content}")
            raise HTTPException(status_code=500, detail="퀴즈 생성 실패: LLM 응답 파싱 오류")
        
        # 7. 결과 반환
        if not isinstance(questions, list):
             raise HTTPException(status_code=500, detail="퀴즈 생성 실패: 리스트 형식이 아님")
             
        # (간단한 검증 로직은 유지)
        final_questions = questions[:num_questions]
        return final_questions
    
    except Exception as e:
        print(f"❌ 퀴즈 생성 중 오류: {e}")
        raise HTTPException(status_code=500, detail=f"퀴즈 생성 오류: {str(e)}")


async def grade_quiz_answers(
    questions: List[Dict],
    student_answers: List[Dict]
) -> List[Dict]:
    """
    RAG를 사용하여 학생 답안을 자동 채점합니다.
    (Spring Server에서 요청받은 questions와 student_answers 리스트를 처리)
    """
    
    if not quiz_llm:
        raise ValueError("채점용 LLM이 초기화되지 않았습니다.")
    
    # 문제 ID → 문제 정보 매핑 (빠른 조회를 위해)
    question_map = {str(q["id"]): q for q in questions}
    
    # 채점 프롬프트
    grading_prompt = ChatPromptTemplate.from_messages([
        ("system", """
당신은 공정하고 정확한 채점자입니다.

[채점 규칙]
1. 정답과 학생 답안을 비교하여 정오를 판단하세요.
2. **정답 처리** 기준:
   - 띄어쓰기나 조사 차이만 있는 경우
   - 동의어/유의어인 경우
   - 명백한 오타(1~2글자)이지만 의미가 통하는 경우
3. **오답 처리** 기준:
   - 의미가 완전히 다른 경우
   - 핵심 키워드가 누락된 경우

[응답 형식]
JSON 형식으로만 응답하세요:
{{
  "is_correct": true,
  "feedback": "정답입니다! (또는 오답 이유 1문장 설명)"
}}
         """),
        ("user", """
문제: {question_content}
정답: {correct_answer}
학생 답안: {student_answer}

위 답안을 채점하세요.
         """)
    ])
    
    results = []
    chain = grading_prompt | quiz_llm
    
    print(f"📝 {len(student_answers)}개 답안 일괄 채점 시작...")
    
    # (성능 최적화) asyncio.gather를 사용하여 병렬 처리 가능하지만, 
    # 안정성을 위해 일단 순차 처리 (Spring 타임아웃 고려 시 병렬 추천)
    for ans in student_answers:
        # Spring에서 보내주는 ID가 int일 수도 있고 str일 수도 있으므로 str로 통일해서 찾음
        qid = str(ans["question_id"])
        question = question_map.get(qid)
        
        if not question:
            print(f"⚠️ 문제 ID {qid}에 해당하는 문제 정보를 찾을 수 없음")
            continue
        
        try:
            # LLM 채점
            result = await chain.ainvoke({
                "question_content": question["content"],
                "correct_answer": question["correct_answer"],
                "student_answer": ans["student_answer"]
            })
            
            # JSON 파싱
            content = result.content.strip()
            content = content.replace("```json", "").replace("```", "").strip()
            grading_result = json.loads(content)
            
            results.append({
                "question_id": int(qid), # Spring은 Long을 기대하므로 int로 반환
                "student_answer": ans["student_answer"],
                "is_correct": grading_result.get("is_correct", False),
                "ai_feedback": grading_result.get("feedback", "피드백 없음")
            })
            
        except Exception as e:
            print(f"❌ 채점 오류 (문제 ID: {qid}): {e}")
            # 오류 시 오답 처리 (안전장치)
            results.append({
                "question_id": int(qid),
                "student_answer": ans["student_answer"],
                "is_correct": False,
                "ai_feedback": "채점 중 오류가 발생했습니다."
            })
    
    print(f"✅ 채점 완료: {len(results)}개")
    return results