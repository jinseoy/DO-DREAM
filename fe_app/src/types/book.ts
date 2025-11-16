export interface Book {
  id: string;
  subject: string; // 과목 이름
  currentChapter: number;
  totalChapters: number;
  hasProgress: boolean; // 기록이 있는지
  lastPosition?: number; // 마지막 위치 (초 단위)
}