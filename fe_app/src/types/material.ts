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
}

export interface MaterialContent {
  id: number;
  materialId: string;
  pageNumber: number; // 페이지 번호
  content: string;  // 텍스트 내용
  createdAt: Date;
}