from __future__ import annotations
from fastapi import APIRouter, Depends
from app.security.auth import get_current_user
from app.security.models import User # User 스키마를 응답 모델로 사용

router = APIRouter(
    prefix="/users",  # 이 라우터의 모든 경로는 /users로 시작
    tags=["Users"]     # Swagger UI에서 "Users" 그룹으로 묶임
)

@router.get("/me", response_model=User)
async def read_users_me(
    # --- (핵심) ---
    # 이 부분이 바로 AT 검증 로직을 적용하는 코드입니다.
    # 이 API를 호출하려면 반드시 get_current_user 의존성을 통과해야 합니다.
    # 통과하면 current_user 변수에 인증된 사용자의 User 객체가 담깁니다.
    current_user: User = Depends(get_current_user)
):
    """
    현재 인증된 사용자의 정보를 반환합니다.

    요청 헤더의 `Authorization: Bearer {Access-Token}`을 검증합니다.
    """
    
    # get_current_user 의존성이 이미 토큰 검증, DB 조회를 모두 완료했으므로,
    # 이 함수에서는 그냥 반환하기만 하면 됩니다.
    return current_user

# --- 여기에 다른 사용자 관련 API를 추가할 수 있습니다. ---
# 예: @router.get("/{user_id}", response_model=User) ...
