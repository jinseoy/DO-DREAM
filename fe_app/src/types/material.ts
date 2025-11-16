import type {
  MaterialJson,
  MaterialJsonChapter,
  MaterialJsonQA,
} from "./api/materialApiTypes";

/**
 * 교재 메타데이터
 */
export interface Material {
  id: number;
  teacherId: string;
  title: string;
  subject: string;
  createdAt: Date;
  updatedAt: Date;
  currentChapter?: number;    // 현재 학습 중인 챕터
  totalChapters?: number;     // 전체 챕터 수
  hasProgress: boolean;       // 학습 진도가 있는지 여부
  lastPosition?: number;      // 마지막 재생 위치(초)

  /** 백엔드에서 내려주는 전체 JSON (본문 + 퀴즈) */
  json?: MaterialJson;
}

export type { MaterialJson, MaterialJsonChapter, MaterialJsonQA };
