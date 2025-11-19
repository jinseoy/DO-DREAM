"""
퀴즈 생성 및 채점을 위한 RAG 서비스
"""
import json
from typing import List, Dict
from fastapi import HTTPException
from langchain_core.prompts import ChatPromptTemplate
from langchain_chroma import Chroma

from app.rag.service import (
    embedding_model,
    llm,
    CHROMA_PERSIST_DIRECTORY,
    _get_collection_name
)


async def generate_quiz_with_rag(
    document_id: str,
    num_questions: int = 10
) -> List[Dict]:
    """
    RAG를 사용하여 문서에서 퀴즈를 자동 생성합니다.
    
    Args:
        document_id: 문서 ID (Chroma 컬렉션 식별용)
        num_questions: 생성할 문제 수 (기본 10개)
    
    Returns:
        List[Dict]: 생성된 퀴즈 문제 리스트
        [
            {
                "question_type": "TERM_DEFINITION",
                "content": "문제 내용 (50자 이내)",
                "correct_answer": "정답 (10자 이내)",
                "chapter_reference": "출처 챕터"
            },
            ...
        ]
    """
    
    # 모델 초기화 확인
    if not embedding_model or not llm:
        raise ValueError("임베딩 모델 또는 LLM이 초기화되지 않았습니다.")
    
    try:
        # 1. Chroma에서 문서 검색
        collection_name = _get_collection_name(document_id)
        
        vectorstore = Chroma(
            persist_directory=CHROMA_PERSIST_DIRECTORY,
            embedding_function=embedding_model,
            collection_name=collection_name
        )
        
        # 2. 다양한 챕터에서 문서 샘플링 (MMR로 다양성 확보)
        docs = vectorstore.similarity_search(
            "중요한 개념, 정의, 특징, 법칙",
            k=num_questions * 3,  # 여유있게 검색
        )
        
        if not docs:
            raise ValueError(f"'{document_id}' 문서에서 콘텐츠를 찾을 수 없습니다.")
        
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

[출제 가이드]
- 핵심 개념, 정의, 특징에 집중하세요.
- 중복되지 않도록 다양한 챕터에서 출제하세요.
- 너무 어렵거나 모호한 문제는 피하세요.
- 문제는 명확하고 답은 하나로 특정되어야 합니다.

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

**중요**: JSON 외에 다른 텍스트는 절대 포함하지 마세요. 마크다운 코드 블록(```)도 사용하지 마세요.
             """),
            ("user", """
다음 학습 자료를 바탕으로 **{num_questions}개의 퀴즈**를 생성하세요.

[학습 자료]
{documents}

위 규칙을 엄격히 따라 JSON 배열로만 응답하세요.
             """)
        ])
        
        # 5. LLM 호출
        chain = quiz_generation_prompt | llm
        
        print(f"🤖 LLM에게 {num_questions}개 퀴즈 생성 요청 중...")
        
        result = await chain.ainvoke({
            "num_questions": num_questions,
            "documents": doc_context
        })
        
        # 6. JSON 파싱
        content = result.content.strip()
        
        # 마크다운 코드 블록 제거 (혹시 모를 경우 대비)
        content = content.replace("```json", "").replace("```", "").strip()
        
        # JSON 파싱
        try:
            questions = json.loads(content)
        except json.JSONDecodeError as e:
            print(f"❌ JSON 파싱 실패. LLM 응답:\n{content}")
            raise HTTPException(
                status_code=500,
                detail=f"퀴즈 생성 실패: LLM 응답을 JSON으로 파싱할 수 없습니다. ({str(e)})"
            )
        
        # 7. 검증
        if not isinstance(questions, list):
            raise HTTPException(
                status_code=500,
                detail="퀴즈 생성 실패: LLM 응답이 리스트 형식이 아닙니다."
            )
        
        # 8. 각 문제 검증 및 정제
        validated_questions = []
        required_fields = ["question_type", "content", "correct_answer"]
        
        for idx, q in enumerate(questions, start=1):
            # 필수 필드 확인
            if not all(field in q for field in required_fields):
                print(f"⚠️ 문제 {idx} 스킵: 필수 필드 누락")
                continue
            
            # 문제 유형 검증
            valid_types = ["TERM_DEFINITION", "FILL_BLANK", "SHORT_ANSWER"]
            if q["question_type"] not in valid_types:
                print(f"⚠️ 문제 {idx} 스킵: 유효하지 않은 문제 유형")
                continue
            
            # 길이 제한 강제
            q["content"] = q["content"][:200]  # 최대 200자
            q["correct_answer"] = q["correct_answer"][:100]  # 최대 100자
            
            # chapter_reference 기본값 설정
            if "chapter_reference" not in q or not q["chapter_reference"]:
                q["chapter_reference"] = "출처 미상"
            
            validated_questions.append(q)
        
        # 9. 최소 문제 수 확인
        if len(validated_questions) < num_questions // 2:
            raise HTTPException(
                status_code=500,
                detail=f"퀴즈 생성 실패: 유효한 문제가 너무 적습니다. (생성됨: {len(validated_questions)}개, 요청: {num_questions}개)"
            )
        
        # 10. 요청한 문제 수만큼만 반환
        final_questions = validated_questions[:num_questions]
        
        print(f"✅ 퀴즈 생성 완료: {len(final_questions)}개")
        
        return final_questions
    
    except ValueError as e:
        print(f"❌ ValueError: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 퀴즈 생성 중 예상치 못한 오류: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"퀴즈 생성 중 오류 발생: {str(e)}"
        )


async def grade_quiz_answers(
    questions: List[Dict],
    student_answers: List[Dict]
) -> List[Dict]:
    """
    RAG를 사용하여 학생 답안을 자동 채점합니다.
    
    Args:
        questions: 문제 정보 리스트
            [{"id": 1, "content": "...", "correct_answer": "..."}, ...]
        student_answers: 학생 답안 리스트
            [{"question_id": 1, "student_answer": "답"}, ...]
    
    Returns:
        List[Dict]: 채점 결과
        [
            {
                "question_id": 1,
                "question_content": "문제 내용",
                "correct_answer": "정답",
                "student_answer": "학생 답안",
                "is_correct": True/False,
                "ai_feedback": "피드백"
            },
            ...
        ]
    """
    
    if not llm:
        raise ValueError("LLM이 초기화되지 않았습니다.")
    
    # 문제 ID → 문제 정보 매핑
    question_map = {q["id"]: q for q in questions}
    
    # 채점 프롬프트
    grading_prompt = ChatPromptTemplate.from_messages([
        ("system", """
당신은 공정하고 정확한 채점자입니다.

[채점 규칙]
1. 정답과 학생 답안을 비교하여 정오를 판단하세요.
2. 다음 경우는 **정답 처리**:
   - 띄어쓰기 차이만 있는 경우 (예: "사회문화 현상" vs "사회문화현상")
   - 조사(은/는/이/가/을/를) 차이만 있는 경우
   - 동의어인 경우 (예: "몰가치성" vs "가치중립성")
   - 오타가 1~2글자인 경우 (예: "개연성" vs "개열성")
3. 다음 경우는 **오답 처리**:
   - 의미가 완전히 다른 경우
   - 핵심 단어가 누락된 경우
   - 반대 개념을 쓴 경우

[응답 형식]
JSON 형식으로만 응답하세요:
{{
  "is_correct": true,
  "feedback": "정답입니다! (또는 오답 설명)"
}}

**중요**: JSON 외에 다른 텍스트는 포함하지 마세요.
         """),
        ("user", """
문제: {question_content}
정답: {correct_answer}
학생 답안: {student_answer}

위 답안을 채점하세요.
         """)
    ])
    
    # 각 답안 채점
    results = []
    chain = grading_prompt | llm
    
    print(f"📝 {len(student_answers)}개 답안 채점 시작...")
    
    for ans in student_answers:
        question = question_map.get(ans["question_id"])
        
        if not question:
            print(f"⚠️ 문제 ID {ans['question_id']}를 찾을 수 없음")
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
                "question_id": question["id"],
                "question_content": question["content"],
                "correct_answer": question["correct_answer"],
                "student_answer": ans["student_answer"],
                "is_correct": grading_result["is_correct"],
                "ai_feedback": grading_result["feedback"]
            })
            
            print(f"  ✓ 문제 {question['id']}: {'정답' if grading_result['is_correct'] else '오답'}")
        
        except Exception as e:
            print(f"❌ 채점 오류 (문제 ID: {question['id']}): {e}")
            
            # 폴백: 단순 문자열 비교
            student_ans_normalized = ans["student_answer"].replace(" ", "").lower()
            correct_ans_normalized = question["correct_answer"].replace(" ", "").lower()
            
            is_correct = student_ans_normalized == correct_ans_normalized
            
            results.append({
                "question_id": question["id"],
                "question_content": question["content"],
                "correct_answer": question["correct_answer"],
                "student_answer": ans["student_answer"],
                "is_correct": is_correct,
                "ai_feedback": "정답입니다!" if is_correct else f"오답입니다. 정답은 '{question['correct_answer']}'입니다."
            })
    
    print(f"✅ 채점 완료: {len(results)}개")
    
    return results