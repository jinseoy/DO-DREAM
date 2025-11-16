export interface QuizOption {
  id: number;
  quizId: number;
  optionText: string;
  optionOrder: number;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: number;
  quizId: number;
  questionText: string;
  questionOrder: number;
  createdAt: Date;
  options: QuizOption[];
}

export interface Quiz {
  id: number;
  materialId: string;
  chapterId: string;
  title: string;
  quizType: 'AI_GENERATED' | 'TEACHER_CREATED';
  createdAt: Date;
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  id: number;
  quizId: number;
  studentId: number;  // 학생 고유 ID (학번으로 변경해서 보여줘야 함)
  score: number;
  totalQuestions: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface StudentAnswer {
  id: number;
  attemptId: number;
  quizId: number;
  optionId: number;
  isCorrect: boolean;
  answeredAt: Date;
  reviewedAt?: Date;
}