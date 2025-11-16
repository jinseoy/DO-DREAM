/**
 * GET /api/materials/shared
 * 공유받은 자료 목록 조회 (학생/앱)
 */

/**
 * 학생이 공유받은 개별 학습 자료 요약 정보
 */
export interface SharedMaterialSummary {
  shareId: number;
  materialId: number;
  materialTitle: string;
  teacherId: number;
  teacherName: string;
  sharedAt: string; // ISO 날짜 문자열
  accessedAt: string | null; // 아직 안 열어봤으면 null 또는 빈 값일 수 있음
  accessed: boolean;
}

/**
 * /api/materials/shared 전체 응답
 */
export interface SharedMaterialsResponse {
  studentId: number;
  studentName: string;
  totalCount: number;
  materials: SharedMaterialSummary[];
}

/**
 * GET /api/materials/shared/{materialId}/json
 *
 * 나중에 실제 JSON의 형식에 따라 타입 구체화 예정.
 */
export type MaterialJsonData = Record<string, unknown>;
