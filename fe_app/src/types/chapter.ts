export interface Chapter {
  chapterId: number;
  materialId: string;
  chapterNumber: number;
  title: string;
  content: string;
  sections: Section[];
}

export interface Section {
  id: number;
  text: string;
  type: 'paragraph' | 'heading' | 'formula' | 'image_description';
}