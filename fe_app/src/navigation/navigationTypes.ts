import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Book } from '../data/dummyBooks';

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

// Route prop 타입
export type PlaybackChoiceScreenRouteProp = RouteProp<
  RootStackParamList,
  'PlaybackChoice'
>;

export type PlayerScreenRouteProp = RouteProp<
  RootStackParamList,
  'Player'
>;