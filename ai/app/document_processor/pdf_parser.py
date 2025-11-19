import json
from typing import Dict, Any, List

from openai import OpenAI
from app.config import OPENAI_API_KEY


class PDFParser:
    """PDF를 OpenAI로 파싱하는 클래스"""

    def __init__(
        self,
        api_key: str | None = None,
        model: str = "gpt-5-mini",  # 필요시 gpt-4.1 / gpt-4o 등으로 변경
    ) -> None:
        self.client = OpenAI(api_key=api_key or OPENAI_API_KEY)
        self.model = model

    def _extract_text_from_response(self, response) -> str:
        """
        openai-python 버전 차이를 흡수하기 위한 헬퍼:
        - 최신 버전은 response.output_text 제공
        - 구버전은 response.output[0].content[0].text 형태
        """
        # 1) 최신 방식
        if hasattr(response, "output_text"):
            return response.output_text

        # 2) 구버전 fallback
        try:
            return response.output[0].content[0].text
        except Exception:
            # 3) 최후의 fallback (디버깅 용)
            return str(response)

    def parse_pdf(self, pdf_path: str, output_format: str) -> Dict[str, Any]:
        """PDF를 파싱하여 지정된 형식으로 반환"""

        print(f"PDF 파일 업로드 중: {pdf_path}")
        uploaded_file = None

        prompt = f"""
다음 PDF 문서를 분석하여 아래의 JSON 형식으로 정확하게 변환해주세요.

**최우선 규칙 - 개념 Check 추출 (매우 중요!):**

1. **'개념 Check'는 한 페이지당 무조건 한 개씩 존재합니다.**
2. **본문 왼쪽 외곽과 오른쪽 외곽 모두**에서 '개념 Check'를 찾아 **빠짐없이 추출**해주세요.

3. **중요: concept_checks는 최상위 레벨이 아니라 각 data 배열의 항목 내부에 위치해야 합니다!**
   - ❌ 잘못된 위치: 최상위 레벨 (indexes, data와 같은 레벨)
   - ✅ 올바른 위치: 각 data 배열 항목의 내부 (index, index_title, titles와 같은 레벨)

4. **각 index(챕터)별로 해당 페이지의 개념 Check를 추출하여 그 index 항목 안에 포함시켜야 합니다.**

5. **개념 Check의 올바른 출력 형식:**

{{
    "data": [
        {{
            "index": "01",
            "index_title": "사회·문화 현상의 이해",
            "titles": [ ... ],
            "concept_checks": [
                {{
                    "title": "개념 Check",
                    "questions": [
                        {{
                            "question": "1. 다양한 학문 간의 교류를 통해 사회·문화 현상을 총체적으로 연구하는 경향을 (  ) 연구 경향이라고 한다.\\n2. 기능론과(  )은 거시적 관점, (  )은 미시적 관점이다.",
                            "answer": "1. 간학문적\\n2. 갈등론, 상징적 상호 작용론"
                        }}
                    ]
                }}
            ]
        }},
        {{
            "index": "02",
            "index_title": "사회·문화 현상의 연구 방법",
            "titles": [ ... ],
            "concept_checks": [
                {{
                    "title": "개념 Check",
                    "questions": [
                        {{
                            "question": "1. (  )은 사회 전체의 합의를 바탕으로 사회 규범이 성립된다고 본다.",
                            "answer": "1. 기능론"
                        }}
                    ]
                }}
            ]
        }}
    ]
}}

6. **중요: questions 배열의 각 항목은 반드시 객체(object) 형태여야 합니다.**
   - ✅ 올바른 형태: {{"question": "...", "answer": "..."}}
   - ❌ 잘못된 형태: ["질문1", "질문2", "질문3"] (문자열 배열 금지)

7. **개념 Check의 각 question 객체는:**
   - "question" 필드: 여러 문제를 줄바꿈(\\n)으로 구분하여 하나의 문자열로 결합
   - "answer" 필드: 각 문제의 답변을 줄바꿈(\\n)으로 구분하여 하나의 문자열로 결합
   - 각 문제와 답변은 번호(1., 2., 3. 등)로 매칭됨

8. **개념 Check의 괄호 처리:**
   - question 필드에는 빈칸 표시 괄호 "(  )"를 **그대로 유지**해주세요.

9. **다시 한 번 강조: concept_checks는 절대로 최상위 레벨에 위치하면 안 되고, 반드시 해당 index의 data 배열 항목 내부에 포함되어야 합니다!**

**일반 추출 규칙:**
10. 응답은 반드시 유효한 JSON 형식이어야 합니다.
11. JSON 외의 다른 텍스트는 절대 포함하지 마세요.
12. 마크다운 코드 블록(```)을 사용하지 마세요.
13. 문서의 구조를 정확하게 파악하여 계층적으로 표현해주세요.
14. **'사회적 희소가치', '상징', '상황 정의'** 등 본문 외곽에 위치한 **용어 정의** 박스는 추출 대상에서 제외해주세요.
15. **'개념 플러스'는 반드시 추출에 포함**하며, 이를 **s_title** 또는 **ss_title** 중 적절한 계층에 넣어주세요.
16. **'contents' 필드에 여러 항목이 나열될 경우, 슬래시(/)를 구분자로 사용하지 마세요.**
17. **'contents' 필드의 여러 문장이나 목록 항목은 텍스트 내에서 반드시 불릿 포인트(•)와 줄 바꿈(\\n)을 사용하여 원본 문서와 같이 목록 형태로 표현해주세요. 각 항목은 독립된 줄에 위치해야 합니다.** (예: "• 첫 번째 항목\\n• 두 번째 항목")
18. 모든 텍스트 내용을 빠짐없이 포함해주세요.
19. s_title, ss_title 계층이 분리되는게 누락되지 않도록 해주세요.
20. ss_title 계층을 인식하지 못하고 s_title의 contents가 두텁게 텍스트를 추출하는 것에 주의해줘. ① 몰가치성, ② 존재 법칙 같은 숫자기호는 ss_title 계층으로 분리해야 하는 것을 누락되지 않게 신경써줘.

**출력 형식:**
{output_format}

**⚠️ 최종 확인 사항:**
- concept_checks는 **절대로** 최상위 레벨(indexes, data와 같은 레벨)에 있으면 안 됩니다!
- concept_checks는 **반드시** 각 data 배열 항목의 내부(titles와 같은 레벨)에 위치해야 합니다!
- 각 페이지의 개념 Check는 해당 페이지가 속한 index의 data 항목 안에 포함되어야 합니다!
- questions 배열 안의 각 항목은 {{"question": "...", "answer": "..."}} 형태의 객체여야 하며, 문자열 배열이 아닙니다!

위 형식을 정확히 따라 JSON만 출력해주세요.
"""

        try:
            # 1) PDF 파일 업로드
            with open(pdf_path, "rb") as f:
                uploaded_file = self.client.files.create(
                    file=f,
                    purpose="user_data",
                )
            print(f"업로드 완료: {uploaded_file.id}")

            print("OpenAI로 PDF 분석 중...")

            # ✅ 여기서 더 이상 response_format 사용하지 않음
            response = self.client.responses.create(
                model=self.model,
                input=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "input_file", "file_id": uploaded_file.id},
                            {"type": "input_text", "text": prompt},
                        ],
                    }
                ],
            )

            # 버전 호환 헬퍼로 텍스트 추출
            response_text = self._extract_text_from_response(response).strip()

            # 혹시 모를 ``` 제거
            response_text = (
                response_text.replace("```json", "").replace("```", "").strip()
            )

            # 4) JSON 파싱
            parsed_data = json.loads(response_text)
            print("JSON 파싱 성공!")
            return parsed_data

        except json.JSONDecodeError as e:
            print(f"JSON 파싱 실패: {e}")
            print(f"응답 내용:\n{response_text[:500]}...")
            raise ValueError(
                f"JSON 파싱 실패: {e}\n응답: {response_text[:500]}..."
            )
        except Exception as e:
            raise ValueError(f"PDF 파싱 중 오류 발생: {e}")
        finally:
            if uploaded_file is not None:
                try:
                    self.client.files.delete(uploaded_file.id)
                    print("임시 파일 삭제 완료")
                except Exception:
                    pass

    def process_concept_checks(
        self, concept_checks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        개념 Check 항목을 OpenAI로 가공하여 정제된 형태로 반환
        """

        concept_checks_json = json.dumps(concept_checks, ensure_ascii=False, indent=2)

        prompt = f"""
다음은 교과서에서 추출한 "개념 Check" 항목들입니다. 각 항목을 분석하여 정제된 형태로 변환해주세요.

**입력 데이터:**
{concept_checks_json}

**처리 규칙:**
1. 각 개념 Check 항목의 `contents` 필드에는 빈칸 문제들이 포함되어 있습니다
2. `contents`의 각 문제에서 괄호 "(  )"를 제거하고, 완전한 문장 형태의 질문으로 변환하세요
3. `answer` 필드의 답변과 매칭하여 각 질문에 대한 정답을 연결하세요
4. 번호를 기준으로 질문과 답변을 매칭하세요 (예: "1. ..." -> "1. ...")
5. 출력 형식은 아래 JSON 구조를 정확히 따라주세요
6. JSON 외의 다른 텍스트는 포함하지 마세요
7. 마크다운 코드 블록(```)을 사용하지 마세요

**출력 형식:**
{{
    "concept_checks": [
        {{
            "title": "개념 Check",
            "questions": [
                {{
                    "number": 1,
                    "question": "완전한 문장 형태의 질문 (괄호 제거됨)",
                    "answer": "정답"
                }},
                {{
                    "number": 2,
                    "question": "완전한 문장 형태의 질문",
                    "answer": "정답"
                }}
            ]
        }}
    ]
}}

**예시:**
입력:
- contents: "1. 다양한 학문 간의 교류를 통해 사회·문화 현상을 총 체적으로 연구하는 경향을 (  ) 연구 경향이라고 한다."
- answer: "1. 간학문적"

출력:
{{
    "question": "다양한 학문 간의 교류를 통해 사회·문화 현상을 총 체적으로 연구하는 경향을 무엇이라고 하는가?",
    "answer": "간학문적 연구 경향"
}}

위 형식을 정확히 따라 JSON만 출력해주세요.
"""

        try:
            print("OpenAI로 개념 Check 가공 중...")

            # 여기서도 response_format 제거
            response = self.client.responses.create(
                model=self.model,
                input=prompt,
            )

            response_text = self._extract_text_from_response(response).strip()
            response_text = (
                response_text.replace("```json", "").replace("```", "").strip()
            )

            processed_data = json.loads(response_text)
            print("개념 Check 가공 성공!")
            return processed_data

        except json.JSONDecodeError as e:
            print(f"JSON 파싱 실패: {e}")
            print(f"응답 내용:\n{response_text[:500]}...")
            raise ValueError(
                f"JSON 파싱 실패: {e}\n응답: {response_text[:500]}..."
            )
        except Exception as e:
            raise ValueError(f"개념 Check 가공 중 오류 발생: {e}")
