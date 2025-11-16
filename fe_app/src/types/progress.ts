import { PlayMode } from './playMode';

export interface MaterialProgress {
  progressId?: string;
  studentId: number;
  materialId: string;
  chapterId: number;
  currentPage: number;
  totalPage: number;
  progressPercentage: number; // 진행률 (%)
  lastAccessedAt: Date;
  completedAt?: Date;
}

// 로컬 저장용 간소화된 타입
export interface LocalProgress {
  materialId: string;
  chapterId: number;
  currentSectionIndex: number;
  lastAccessedAt: string; // ISO string
  isCompleted: boolean;
  playMode?: PlayMode; // 사용자가 마지막으로 선택한 재생 모드
}