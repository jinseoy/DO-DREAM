export interface QuizOption {
  id: string;
  quizId: string;
  optionText: string;
  optionOrder: number;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  questionText: string;
  questionOrder: number;
  createdAt: Date;
  options: QuizOption[];
}

export interface Quiz {
  id: string;
  materialId: string;
  chapterId: string;
  title: string;
  quizType: 'AI_GENERATED' | 'TEACHER_CREATED';
  createdAt: Date;
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  totalQuestions: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface StudentAnswer {
  id: string;
  attemptId: string;
  quizId: string;
  optionId: string;
  isCorrect: boolean;
  answeredAt: Date;
  reviewedAt?: Date;
}