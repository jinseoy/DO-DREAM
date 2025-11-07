/**
 * 학생 사용자 정보
 */
export interface Student {
  id: number;
  studentNumber: string;       // 학번
  name: string;                // 이름
  isVisuallyImpaired?: boolean; // 시각장애 여부
  classroomId?: number | null; // 소속 반 (선택)
  createdAt: string;           // 등록일 (ISO string)
}

/**
 * 인증 응답 데이터 (로그인/회원가입 성공 시)
 */
export interface AuthResponseData {
  accessToken: string;
  refreshToken?: string;
  student: Student;
}