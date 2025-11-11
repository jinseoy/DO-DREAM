import google.generativeai as genai
from typing import Dict, Any
import json
import os

class PDFParser:
    """PDF를 Gemini로 파싱하는 클래스"""
    
    def __init__(self):
        """Gemini API 초기화"""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY가 설정되지 않았습니다.")
        genai.configure(api_key=api_key)
        
        # Gemini 2.5 Flash 사용
        self.model = genai.GenerativeModel('models/gemini-2.5-flash')
    
    def parse_pdf(self, pdf_path: str, output_format: str) -> Dict[str, Any]:
        """PDF를 파싱하여 지정된 형식으로 반환"""
        
        # PDF 파일 업로드
        print(f"PDF 파일 업로드 중: {pdf_path}")
        uploaded_file = genai.upload_file(pdf_path)
        print(f"업로드 완료: {uploaded_file.name}")
        
        prompt = f"""
다음 PDF 문서를 분석하여 아래의 JSON 형식으로 정확하게 변환해주세요.

**중요한 규칙:**
1. 응답은 반드시 유효한 JSON 형식이어야 합니다.
2. JSON 외의 다른 텍스트는 절대 포함하지 마세요.
3. 마크다운 코드 블록(```)을 사용하지 마세요.
4. 문서의 구조를 정확하게 파악하여 계층적으로 표현해주세요.
5. 모든 텍스트 내용을 빠짐없이 포함해주세요.

**출력 형식:**
{output_format}

위 형식을 정확히 따라 JSON만 출력해주세요.
"""
        
        try:
            print("Gemini로 PDF 분석 중...")
            response = self.model.generate_content([uploaded_file, prompt])
            
            # 업로드된 파일 삭제
            genai.delete_file(uploaded_file.name)
            print("임시 파일 삭제 완료")
            
            response_text = response.text.strip()
            
            # 마크다운 코드 블록 제거
            response_text = response_text.replace('```json', '').replace('```', '').strip()
            
            # JSON 파싱
            parsed_data = json.loads(response_text)
            print("JSON 파싱 성공!")
            return parsed_data
            
        except json.JSONDecodeError as e:
            print(f"JSON 파싱 실패: {e}")
            print(f"응답 내용:\n{response_text[:500]}...")
            raise ValueError(f"JSON 파싱 실패: {e}\n응답: {response_text[:500]}...")
        except Exception as e:
            try:
                genai.delete_file(uploaded_file.name)
            except:
                pass
            raise ValueError(f"PDF 파싱 중 오류 발생: {e}")