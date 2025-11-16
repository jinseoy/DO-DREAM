import { Quiz } from "../types/quiz";

export const dummyQuizzes: Quiz[] = [
  {
    id: 1,
    materialId: '1', // 영어 1
    chapterId: '1',
    title: 'Unit 1: Greetings 퀴즈',
    quizType: 'AI_GENERATED',
    createdAt: new Date('2025-01-15'),
    questions: [
      {
        id: 1,
        quizId: 1,
        questionText: '아침에 만났을 때 사용하는 인사말은 무엇인가요?',
        questionOrder: 1,
        createdAt: new Date('2025-01-15'),
        options: [
          {
            id: 1,
            quizId: 1,
            optionText: 'Good morning',
            optionOrder: 1,
            isCorrect: true,
          },
          {
            id: 2,
            quizId: 1,
            optionText: 'Good afternoon',
            optionOrder: 2,
            isCorrect: false,
          },
          {
            id: 3,
            quizId: 1,
            optionText: 'Good evening',
            optionOrder: 3,
            isCorrect: false,
          },
          {
            id: 4,
            quizId: 1,
            optionText: 'Good night',
            optionOrder: 4,
            isCorrect: false,
          },
        ],
      },
      {
        id: 2,
        quizId: 1,
        questionText: '저녁에 사용하는 인사말은 무엇인가요?',
        questionOrder: 2,
        createdAt: new Date('2025-01-15'),
        options: [
          {
            id: 5,
            quizId: 1,
            optionText: 'Good morning',
            optionOrder: 1,
            isCorrect: false,
          },
          {
            id: 6,
            quizId: 1,
            optionText: 'Good afternoon',
            optionOrder: 2,
            isCorrect: false,
          },
          {
            id: 7,
            quizId: 1,
            optionText: 'Good evening',
            optionOrder: 3,
            isCorrect: true,
          },
          {
            id: 8,
            quizId: 1,
            optionText: 'Hi',
            optionOrder: 4,
            isCorrect: false,
          },
        ],
      },
      {
        id: 3,
        quizId: 1,
        questionText: '친구를 만났을 때 간단하게 사용할 수 있는 인사말은?',
        questionOrder: 3,
        createdAt: new Date('2025-01-15'),
        options: [
          {
            id: 9,
            quizId: 1,
            optionText: 'Good morning',
            optionOrder: 1,
            isCorrect: false,
          },
          {
            id: 10,
            quizId: 1,
            optionText: 'Hi',
            optionOrder: 2,
            isCorrect: true,
          },
          {
            id: 11,
            quizId: 1,
            optionText: 'Good night',
            optionOrder: 3,
            isCorrect: false,
          },
          {
            id: 12,
            quizId: 1,
            optionText: 'Thank you',
            optionOrder: 4,
            isCorrect: false,
          },
        ],
      },
    ],
  },
  {
    id: 2,
    materialId: '1', // 영어 1
    chapterId: '2',
    title: 'Unit 2: Introducing Yourself 퀴즈',
    quizType: 'TEACHER_CREATED',
    createdAt: new Date('2025-01-20'),
    questions: [
      {
        id: 4,
        quizId: 2,
        questionText: '자기소개를 할 때 사용하는 표현은?',
        questionOrder: 1,
        createdAt: new Date('2025-01-20'),
        options: [
          {
            id: 13,
            quizId: 2,
            optionText: 'My name is...',
            optionOrder: 1,
            isCorrect: true,
          },
          {
            id: 14,
            quizId: 2,
            optionText: 'Good morning',
            optionOrder: 2,
            isCorrect: false,
          },
          {
            id: 15,
            quizId: 2,
            optionText: 'Thank you',
            optionOrder: 3,
            isCorrect: false,
          },
          {
            id: 16,
            quizId: 2,
            optionText: 'See you',
            optionOrder: 4,
            isCorrect: false,
          },
        ],
      },
      {
        id: 5,
        quizId: 2,
        questionText: '"I am a student."에서 "student"의 의미는?',
        questionOrder: 2,
        createdAt: new Date('2025-01-20'),
        options: [
          {
            id: 17,
            quizId: 2,
            optionText: '선생님',
            optionOrder: 1,
            isCorrect: false,
          },
          {
            id: 18,
            quizId: 2,
            optionText: '학생',
            optionOrder: 2,
            isCorrect: true,
          },
          {
            id: 19,
            quizId: 2,
            optionText: '친구',
            optionOrder: 3,
            isCorrect: false,
          },
          {
            id: 20,
            quizId: 2,
            optionText: '의사',
            optionOrder: 4,
            isCorrect: false,
          },
        ],
      },
    ],
  },
  {
    id: 3,
    materialId: '2', // 생물 1
    chapterId: '5',
    title: '1장: 식물의 구조 퀴즈',
    quizType: 'AI_GENERATED',
    createdAt: new Date('2025-01-18'),
    questions: [
      {
        id: 6,
        quizId: 3,
        questionText: '식물의 구성 요소가 아닌 것은?',
        questionOrder: 1,
        createdAt: new Date('2025-01-18'),
        options: [
          {
            id: 21,
            quizId: 3,
            optionText: '뿌리',
            optionOrder: 1,
            isCorrect: false,
          },
          {
            id: 22,
            quizId: 3,
            optionText: '줄기',
            optionOrder: 2,
            isCorrect: false,
          },
          {
            id: 23,
            quizId: 3,
            optionText: '잎',
            optionOrder: 3,
            isCorrect: false,
          },
          {
            id: 24,
            quizId: 3,
            optionText: '날개',
            optionOrder: 4,
            isCorrect: true,
          },
        ],
      },
      {
        id: 7,
        quizId: 3,
        questionText: '뿌리의 역할은 무엇인가요?',
        questionOrder: 2,
        createdAt: new Date('2025-01-18'),
        options: [
          {
            id: 25,
            quizId: 3,
            optionText: '물과 양분을 흡수한다',
            optionOrder: 1,
            isCorrect: true,
          },
          {
            id: 26,
            quizId: 3,
            optionText: '광합성을 한다',
            optionOrder: 2,
            isCorrect: false,
          },
          {
            id: 27,
            quizId: 3,
            optionText: '양분을 운반한다',
            optionOrder: 3,
            isCorrect: false,
          },
          {
            id: 28,
            quizId: 3,
            optionText: '꽃을 피운다',
            optionOrder: 4,
            isCorrect: false,
          },
        ],
      },
      {
        id: 8,
        quizId: 3,
        questionText: '광합성을 하는 식물의 부분은?',
        questionOrder: 3,
        createdAt: new Date('2025-01-18'),
        options: [
          {
            id: 29,
            quizId: 3,
            optionText: '뿌리',
            optionOrder: 1,
            isCorrect: false,
          },
          {
            id: 30,
            quizId: 3,
            optionText: '줄기',
            optionOrder: 2,
            isCorrect: false,
          },
          {
            id: 31,
            quizId: 3,
            optionText: '잎',
            optionOrder: 3,
            isCorrect: true,
          },
          {
            id: 32,
            quizId: 3,
            optionText: '꽃',
            optionOrder: 4,
            isCorrect: false,
          },
        ],
      },
      {
        id: 9,
        quizId: 3,
        questionText: '줄기의 역할은 무엇인가요?',
        questionOrder: 4,
        createdAt: new Date('2025-01-18'),
        options: [
          {
            id: 33,
            quizId: 3,
            optionText: '물과 양분을 흡수한다',
            optionOrder: 1,
            isCorrect: false,
          },
          {
            id: 34,
            quizId: 3,
            optionText: '물과 양분을 운반한다',
            optionOrder: 2,
            isCorrect: true,
          },
          {
            id: 35,
            quizId: 3,
            optionText: '광합성을 한다',
            optionOrder: 3,
            isCorrect: false,
          },
          {
            id: 36,
            quizId: 3,
            optionText: '땅속에 고정시킨다',
            optionOrder: 4,
            isCorrect: false,
          },
        ],
      },
    ],
  },
];

// 특정 챕터의 퀴즈 가져오기
export function getQuizzesByChapterId(chapterId: string): Quiz[] {
  return dummyQuizzes.filter((quiz) => quiz.chapterId === chapterId);
}

// 특정 퀴즈 가져오기
export function getQuizById(quizId: number): Quiz | undefined {
  return dummyQuizzes.find((quiz) => quiz.id === quizId);
}

// 특정 교재의 모든 퀴즈 가져오기
export function getQuizzesByMaterialId(materialId: string): Quiz[] {
  return dummyQuizzes.filter((quiz) => quiz.materialId === materialId);
}