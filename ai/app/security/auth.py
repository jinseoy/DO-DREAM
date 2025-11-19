from __future__ import annotations
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import sys # print 문을 위해 임포트

from app.config import SECRET_KEY_BYTES, ALGORITHM, JWT_ISSUER
from app.common.database import get_user_from_db
from app.common.db_session import get_db

bearer_scheme = HTTPBearer()

async def get_current_user(
    auth: HTTPAuthorizationCredentials = Depends(bearer_scheme), 
    db: Session = Depends(get_db)
) -> User:
    
    from app.security.models import TokenPayload

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = auth.credentials
        # --- 디버깅 로그 1 ---
        print(f"전달받은 토큰: {token[:10]}...", file=sys.stderr)

        payload = jwt.decode(
            token, 
            SECRET_KEY_BYTES, 
            algorithms=[ALGORITHM], 
            issuer=JWT_ISSUER
        )
        
        # --- 디버깅 로그 2 ---
        print(f"JWT 디코딩 성공. 페이로드: {payload}", file=sys.stderr)
        
        token_payload = TokenPayload(**payload)
        
        try:
            user_id = int(token_payload.sub)
        except ValueError:
            # --- 디버깅 로그 3 ---
            print(f"오류: 'sub' 클레임({token_payload.sub})을 int로 변환 실패", file=sys.stderr)
            raise credentials_exception

    except JWTError as e:
        # --- 디버깅 로그 4 ---
        print(f"JWT 디코딩 또는 검증 실패. 오류: {e}", file=sys.stderr)
        raise credentials_exception
    except AttributeError:
        # --- 디버깅 로그 5 ---
        print("오류: 토큰 형식이 아니거나 auth 객체가 비정상", file=sys.stderr)
        raise credentials_exception
    except Exception as e:
        # --- 디버깅 로그 6 ---
        print(f"알 수 없는 오류 발생: {e}", file=sys.stderr)
        raise credentials_exception

    # --- 디버깅 로그 7 ---
    print(f"DB에서 user_id {user_id} 조회 시도...", file=sys.stderr)
    user = get_user_from_db(db=db, user_id=user_id)
    
    if user is None:
        # --- 디버깅 로그 8 ---
        print(f"오류: DB에서 user_id {user_id}를 찾을 수 없음", file=sys.stderr)
        raise credentials_exception
    
    # --- 디버깅 로그 9 ---
    print(f"인증 성공: {user.name} (ID: {user.id})", file=sys.stderr)
    return user

