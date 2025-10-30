import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Book } from '../data/dummyBooks';
import { Quiz } from '../data/dummyQuizzes';

export type RootStackParamList = {
  Library: undefined;
  PlaybackChoice: {
    book: Book;
  };
  Player: {
    book: Book;
    chapterId: string;
    fromStart: boolean;
  };
  Question: undefined;
  QuizList: {
    book: Book;
    chapterId: string;
  };
  Quiz: {
    quiz: Quiz;
  };
  QuizResult: {
    quiz: Quiz;
    score: number;
    totalQuestions: number;
    answers: {
      questionId: string;
      selectedOptionId: string;
      isCorrect: boolean;
    }[];
  };
};

// Navigation prop 타입
export type LibraryScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Library'
>;

export type PlaybackChoiceScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PlaybackChoice'
>;

export type PlayerScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Player'
>;

export type QuestionScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Question'
>;

export type QuizListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'QuizList'
>;

export type QuizScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Quiz'
>;

export type QuizResultScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'QuizResult'
>;

// Route prop 타입
export type PlaybackChoiceScreenRouteProp = RouteProp<
  RootStackParamList,
  'PlaybackChoice'
>;

export type PlayerScreenRouteProp = RouteProp<
  RootStackParamList,
  'Player'
>;

export type QuizListScreenRouteProp = RouteProp<
  RootStackParamList,
  'QuizList'
>;

export type QuizScreenRouteProp = RouteProp<
  RootStackParamList,
  'Quiz'
>;

export type QuizResultScreenRouteProp = RouteProp<
  RootStackParamList,
  'QuizResult'
>;