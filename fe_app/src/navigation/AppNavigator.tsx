import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './navigationTypes';

import LibraryScreen from '../screens/LibraryScreen';
import PlaybackChoiceScreen from '../screens/PlaybackChoiceScreen';
import PlayerScreen from '../screens/PlayerScreen';
import QuestionScreen from '../screens/QuestionScreen';
import QuizListScreen from '../screens/QuizListScreen';
import QuizScreen from '../screens/QuizScreen';
import QuizResultScreen from '../screens/QuizResultScreen';

import { navigationRef } from './RootNavigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Library"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="Library"
          component={LibraryScreen}
          options={{
            title: '나의 서재',
          }}
        />
        <Stack.Screen
          name="PlaybackChoice"
          component={PlaybackChoiceScreen}
          options={{
            title: '재생 방법 선택',
          }}
        />
        <Stack.Screen
          name="Player"
          component={PlayerScreen}
          options={{
            title: '교재 듣기',
          }}
        />
        <Stack.Screen
          name="Question"
          component={QuestionScreen}
          options={{
            title: '질문하기',
          }}
        />
        <Stack.Screen
          name="QuizList"
          component={QuizListScreen}
          options={{
            title: '퀴즈 목록',
          }}
        />
        <Stack.Screen
          name="Quiz"
          component={QuizScreen}
          options={{
            title: '퀴즈',
          }}
        />
        <Stack.Screen
          name="QuizResult"
          component={QuizResultScreen}
          options={{
            title: '퀴즈 결과',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}