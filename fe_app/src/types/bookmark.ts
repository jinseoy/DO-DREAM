export interface Bookmark {
  id: number;
  studentId: number;  // 학생 고유 ID (학번으로 변경해서 보여줘야 함)
  materialId: string;
  chapterId: number;
  sectionId: number;
  sectionIndex: number;
  sectionText: string; // 섹션 텍스트 일부 저장 (표시용, 최대 100자)
  sectionType: 'paragraph' | 'heading' | 'formula' | 'image_description';
  voiceMemo?: string; // 음성 메모
  createdAt: string; // ISO string
  repeatCount?: number; // 이 북마크를 몇 번 재생했는지
}

export interface BookmarkCreateInput {
  materialId: string;
  chapterId: number;
  sectionId: number;
  sectionIndex: number;
  sectionText: string;
  sectionType: 'paragraph' | 'heading' | 'formula' | 'image_description';
}