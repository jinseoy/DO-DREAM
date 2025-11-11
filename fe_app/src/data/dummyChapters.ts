import { Chapter } from "../types/chapter";

export const dummyChapters: Chapter[] = [
  {
    chapterId: 1,
    materialId: '1',
    chapterNumber: 1,
    title: 'Unit 1: Greetings',
    content: '인사 표현 배우기',
    sections: [
      {
        id: 1,
        text: '1단원: 인사 표현',
        type: 'heading',
      },
      {
        id: 2,
        text: '오늘은 영어로 인사하는 방법을 배워봅시다. 아침에 만났을 때는 "Good morning"이라고 인사합니다.',
        type: 'paragraph',
      },
      {
        id: 3,
        text: '점심 시간 이후에는 "Good afternoon"을 사용하고, 저녁에는 "Good evening"이라고 말합니다.',
        type: 'paragraph',
      },
      {
        id: 4,
        text: '친구를 만났을 때는 간단하게 "Hi" 또는 "Hello"라고 인사할 수 있습니다.',
        type: 'paragraph',
      },
    ],
  },
  {
    chapterId: 2,
    materialId: '1',
    chapterNumber: 2,
    title: 'Unit 2: Introducing Yourself',
    content: '자기소개하기',
    sections: [
      {
        id: 1,
        text: '2단원: 자기소개하기',
        type: 'heading',
      },
      {
        id: 2,
        text: '자기소개를 할 때는 "My name is..." 또는 "I am..."을 사용합니다.',
        type: 'paragraph',
      },
      {
        id: 3,
        text: '예를 들어, "My name is Minseo. I am a student."라고 말할 수 있습니다.',
        type: 'paragraph',
      },
    ],
  },
  {
    chapterId: 3,
    materialId: '1',
    chapterNumber: 3,
    title: 'Unit 3: Daily Routines',
    content: '일상 생활 표현하기',
    sections: [
      {
        id: 1,
        text: '3단원: 일상 생활 표현하기',
        type: 'heading',
      },
      {
        id: 2,
        text: '아침에 일어나는 것은 "wake up"이라고 합니다.',
        type: 'paragraph',
      },
      {
        id: 3,
        text: '학교에 가는 것은 "go to school"이라고 표현합니다.',
        type: 'paragraph',
      },
    ],
  },
  {
    chapterId: 4,
    materialId: '1',
    chapterNumber: 4,
    title: 'Unit 4: Family Members',
    content: '가족 구성원 표현하기',
    sections: [
      {
        id: 1,
        text: '4단원: 가족 구성원',
        type: 'heading',
      },
      {
        id: 2,
        text: '가족 구성원을 영어로 표현하는 방법을 배워봅시다.',
        type: 'paragraph',
      },
      {
        id: 3,
        text: 'Father는 아버지, Mother는 어머니를 의미합니다.',
        type: 'paragraph',
      },
    ],
  },
  {
    chapterId: 5,
    materialId: '2',
    chapterNumber: 1,
    title: '1장: 식물의 구조',
    content: '식물의 뿌리, 줄기, 잎의 역할',
    sections: [
      {
        id: 1,
        text: '1장: 식물의 구조',
        type: 'heading',
      },
      {
        id: 2,
        text: '식물은 크게 뿌리, 줄기, 잎으로 구성되어 있습니다.',
        type: 'paragraph',
      },
      {
        id: 3,
        text: '뿌리는 땅속에서 물과 양분을 흡수하는 역할을 합니다.',
        type: 'paragraph',
      },
      {
        id: 4,
        text: '줄기는 뿌리에서 흡수한 물과 양분을 잎으로 운반합니다.',
        type: 'paragraph',
      },
      {
        id: 5,
        text: '잎은 광합성을 통해 식물이 필요한 에너지를 만듭니다.',
        type: 'paragraph',
      },
    ],
  },
  {
    chapterId: 6,
    materialId: '2',
    chapterNumber: 2,
    title: '2장: 광합성',
    content: '식물의 광합성 과정',
    sections: [
      {
        id: 1,
        text: '2장: 광합성',
        type: 'heading',
      },
      {
        id: 2,
        text: '광합성은 식물이 빛 에너지를 이용하여 양분을 만드는 과정입니다.',
        type: 'paragraph',
      },
      {
        id: 3,
        text: '엽록체에서 일어나며, 이산화탄소와 물을 이용합니다.',
        type: 'paragraph',
      },
    ],
  },
];

// 특정 교재의 챕터 목록 가져오기
export function getChaptersByMaterialId(materialId: string): Chapter[] {
  return dummyChapters.filter(chapter => chapter.materialId === materialId);
}

// 특정 챕터 가져오기
export function getChapterById(chapterId: number): Chapter | undefined {
  return dummyChapters.find(chapter => chapter.chapterId === chapterId);
}