import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Material } from '../types/material';
import { Quiz } from '../types/quiz';

export type RootStackParamList = {
  Splash: undefined;
  AuthStart: undefined;
  Login: undefined;
  Signup: undefined;
  Library: undefined;
  PlaybackChoice: {
    material: Material;
  };
  Player: {
    material: Material;
    chapterId: number;
    fromStart: boolean;
    initialSectionIndex?: number;
  };
  Question: {
    material: Material;
    chapterId: number;
    sectionIndex: number;
  };
  QuizList: {
    material: Material;
    chapterId: number;
  };
  Quiz: {
    quiz: Quiz;
  };
  QuizResult: {
    quiz: Quiz;
    score: number;
    totalQuestions: number;
    answers: {
      questionId: number;
      selectedOptionId: number;
      isCorrect: boolean;
    }[];
  };
  BookmarkList: {
    material?: Material;
    chapterId?: number;
  };
  Settings: undefined;
};

// Navigation prop 타입
export type SplashScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Splash'
>;

export type AuthStartScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AuthStart'
>;

export type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

export type SignupScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Signup'
>;

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

export type BookmarkListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'BookmarkList'
>;

export type SettingsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Settings'
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

export type QuestionScreenRouteProp = RouteProp<
  RootStackParamList,
  'Question'
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

export type BookmarkListScreenRouteProp = RouteProp<
  RootStackParamList,
  'BookmarkList'
>;

export type SettingsScreenRouteProp = RouteProp<
  RootStackParamList,
  'Settings'
>;