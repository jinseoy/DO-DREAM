/**
 * 학생 사전 인증 요청 (1단계: 학번/이름 확인)
 * POST /api/auth/student/verify
 */
export interface StudentVerifyRequest {
  name: string;
  studentNumber: string;
}

/**
 * 학생 회원가입 요청 (2단계: 기기 정보 등록)
 * POST /api/auth/student/register
 */
export interface StudentRegisterRequest {
  name: string;
  studentNumber: string;
  deviceId: string;              // 기기 고유 ID (UUID)
  platform: 'ios' | 'android';   // 플랫폼
  deviceSecret: string;          // 생체인증 시크릿 (해시값)
}

/**
 * 학생 로그인 요청
 * POST /api/auth/student/login
 */
export interface StudentLoginRequest {
  deviceId: string;
  deviceSecret: string;
}

/**
 * 사전 인증 응답 (verify 성공 시)
 */
export interface VerifyResponse {
  message: string;
  studentInfo?: {
    name: string;
    studentNumber: string;
  };
}

/**
 * 인증 응답 (로그인/회원가입 성공 시)
 */
export interface AuthResponse {
  accessToken: string;
  // refreshToken은 HttpOnly 쿠키로 전달됨
}