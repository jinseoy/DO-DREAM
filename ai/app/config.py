import os
import base64
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# .env 파일에서 설정 값 읽기
SECRET_KEY_BASE64 = os.getenv("JWT_SECRET_BASE64")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ISSUER = os.getenv("JWT_ISSUER", "dodream")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GMS_KEY = os.getenv("GMS_KEY")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

# DB 설정
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("경고: DATABASE_URL이 .env 파일에 설정되지 않았습니다.")
    # 여기서 e 변수를 사용하던 오류를 수정했습니다.

# --- JWT Secret Key 디코딩 ---
# Spring의 Keys.hmacShaKeyFor(Decoders.BASE64.decode(secretBase64))와 동일합니다.
try:
    if SECRET_KEY_BASE64 is None:
        raise ValueError("JWT_SECRET_BASE64가 .env 파일에 설정되지 않았습니다.")
    
    SECRET_KEY_BYTES = base64.b64decode(SECRET_KEY_BASE64)
    
except Exception as e: # 'e' 변수가 여기서 정의됩니다.
    print(f"JWT_SECRET_BASE64 값 디코딩 오류! .env 파일을 확인하세요. 오류: {e}")
    # 실제 운영 환경에서는 서버가 시작되지 않도록 처리해야 합니다.
    SECRET_KEY_BYTES = b"" # 오류 발생 시 임시 바이트

