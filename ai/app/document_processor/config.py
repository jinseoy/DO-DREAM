import os
import base64
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# .env 파일에서 설정 값 읽기
SECRET_KEY_BASE64 = os.getenv("JWT_SECRET_BASE64")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ISSUER = os.getenv("JWT_ISSUER", "dodream")

# DB 설정
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("경고: DATABASE_URL이 .env 파일에 설정되지 않았습니다.")

# Gemini API 설정 (새로 추가)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("경고: GEMINI_API_KEY가 .env 파일에 설정되지 않았습니다.")

# --- JWT Secret Key 디코딩 ---
try:
    if SECRET_KEY_BASE64 is None:
        raise ValueError("JWT_SECRET_BASE64가 .env 파일에 설정되지 않았습니다.")
    
    SECRET_KEY_BYTES = base64.b64decode(SECRET_KEY_BASE64)
    
except Exception as e:
    print(f"JWT_SECRET_BASE64 값 디코딩 오류! .env 파일을 확인하세요. 오류: {e}")
    SECRET_KEY_BYTES = b""