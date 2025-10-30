export interface Chapter {
  id: string;
  bookId: string;
  chapterNumber: number;
  title: string;
  content: string;
  sections: Section[];
}

export interface Section {
  id: string;
  text: string;
  type: 'paragraph' | 'heading' | 'formula' | 'image_description';
}