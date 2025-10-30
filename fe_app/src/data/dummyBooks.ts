import { Book } from "../types/book";

export const studentName = "김민서";

export const dummyBooks: Book[] = [
  {
    id: '1',
    subject: '영어 1',
    currentChapter: 4,
    totalChapters: 10,
    hasProgress: true,
    lastPosition: 125,
  },
  {
    id: '2',
    subject: '생물 1',
    currentChapter: 5,
    totalChapters: 8,
    hasProgress: true,
    lastPosition: 88,
  },
  {
    id: '3',
    subject: '문학',
    currentChapter: 1,
    totalChapters: 5,
    hasProgress: false,
  },
  {
    id: '4',
    subject: '화법과 작문',
    currentChapter: 10,
    totalChapters: 12,
    hasProgress: true,
    lastPosition: 203,
  },
  {
    id: '5',
    subject: '윤리와 사상',
    currentChapter: 2,
    totalChapters: 6,
    hasProgress: false,
  },
];