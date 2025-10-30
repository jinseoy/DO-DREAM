import { Chapter } from "../types/chapter";

export const dummyChapters: Chapter[] = [
  {
    id: 'ch-1-1',
    bookId: '1',
    chapterNumber: 1,
    title: 'Unit 1: Greetings',
    content: '인사 표현 배우기',
    sections: [
      {
        id: 'sec-1',
        text: '1단원: 인사 표현',
        type: 'heading',
      },
      {
        id: 'sec-2',
        text: '오늘은 영어로 인사하는 방법을 배워봅시다. 아침에 만났을 때는 "Good morning"이라고 인사합니다.',
        type: 'paragraph',
      },
      {
        id: 'sec-3',
        text: '점심 시간 이후에는 "Good afternoon"을 사용하고, 저녁에는 "Good evening"이라고 말합니다.',
        type: 'paragraph',
      },
      {
        id: 'sec-4',
        text: '친구를 만났을 때는 간단하게 "Hi" 또는 "Hello"라고 인사할 수 있습니다.',
        type: 'paragraph',
      },
    ],
  },
  {
    id: 'ch-1-2',
    bookId: '1',
    chapterNumber: 2,
    title: 'Unit 2: Introducing Yourself',
    content: '자기소개하기',
    sections: [
      {
        id: 'sec-5',
        text: '2단원: 자기소개하기',
        type: 'heading',
      },
      {
        id: 'sec-6',
        text: '자기소개를 할 때는 "My name is..." 또는 "I am..."을 사용합니다.',
        type: 'paragraph',
      },
      {
        id: 'sec-7',
        text: '예를 들어, "My name is Minseo. I am a student."라고 말할 수 있습니다.',
        type: 'paragraph',
      },
    ],
  },
  {
    id: 'ch-2-1',
    bookId: '2',
    chapterNumber: 1,
    title: '1장: 식물의 구조',
    content: '식물의 뿌리, 줄기, 잎의 역할',
    sections: [
      {
        id: 'sec-8',
        text: '1장: 식물의 구조',
        type: 'heading',
      },
      {
        id: 'sec-9',
        text: '식물은 크게 뿌리, 줄기, 잎으로 구성되어 있습니다.',
        type: 'paragraph',
      },
      {
        id: 'sec-10',
        text: '뿌리는 땅속에서 물과 양분을 흡수하는 역할을 합니다.',
        type: 'paragraph',
      },
      {
        id: 'sec-11',
        text: '줄기는 뿌리에서 흡수한 물과 양분을 잎으로 운반합니다.',
        type: 'paragraph',
      },
      {
        id: 'sec-12',
        text: '잎은 광합성을 통해 식물이 필요한 에너지를 만듭니다.',
        type: 'paragraph',
      },
    ],
  },
];

// 특정 교재의 챕터 목록 가져오기
export function getChaptersByBookId(bookId: string): Chapter[] {
  return dummyChapters.filter(chapter => chapter.bookId === bookId);
}

// 특정 챕터 가져오기
export function getChapterById(chapterId: string): Chapter | undefined {
  return dummyChapters.find(chapter => chapter.id === chapterId);
}