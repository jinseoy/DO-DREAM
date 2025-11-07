import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./navigationTypes";
import { useAuthStore } from "../stores/authStore";

import SplashScreen from "../screens/auth/SplashScreen";
import AuthStartScreen from "../screens/auth/AuthStartScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import SignupScreen from "../screens/auth/SignupScreen";

import LibraryScreen from "../screens/library/LibraryScreen";
import PlaybackChoiceScreen from "../screens/player/PlaybackChoiceScreen";
import PlayerScreen from "../screens/player/PlayerScreen";
import QuestionScreen from "../screens/player/QuestionScreen";
import QuizListScreen from "../screens/quiz/QuizListScreen";
import QuizScreen from "../screens/quiz/QuizScreen";
import QuizResultScreen from "../screens/quiz/QuizResultScreen";
import BookmarkListScreen from "../screens/library/BookmarkListScreen";

import { navigationRef } from "./RootNavigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { hydrate, isHydrated, accessToken } = useAuthStore();
  const [initialRouteName, setInitialRouteName] =
    useState<keyof RootStackParamList>("Splash");

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (isHydrated) {
      setInitialRouteName(accessToken ? "Library" : "Splash");
    }
  }, [isHydrated, accessToken]);

  if (!isHydrated) {
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        {/* Auth */}
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ title: "스플래시" }}
        />
        <Stack.Screen
          name="AuthStart"
          component={AuthStartScreen}
          options={{ title: "시작" }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: "로그인" }}
        />
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
          options={{ title: "회원가입" }}
        />

        {/* Main */}
        <Stack.Screen
          name="Library"
          component={LibraryScreen}
          options={{ title: "나의 서재" }}
        />
        <Stack.Screen
          name="PlaybackChoice"
          component={PlaybackChoiceScreen}
          options={{ title: "재생 방법 선택" }}
        />
        <Stack.Screen
          name="Player"
          component={PlayerScreen}
          options={{ title: "교재 듣기" }}
        />
        <Stack.Screen
          name="Question"
          component={QuestionScreen}
          options={{ title: "질문하기" }}
        />
        <Stack.Screen
          name="QuizList"
          component={QuizListScreen}
          options={{ title: "퀴즈 목록" }}
        />
        <Stack.Screen
          name="Quiz"
          component={QuizScreen}
          options={{ title: "퀴즈" }}
        />
        <Stack.Screen
          name="QuizResult"
          component={QuizResultScreen}
          options={{ title: "퀴즈 결과" }}
        />
        <Stack.Screen
          name="BookmarkList"
          component={BookmarkListScreen}
          options={{ title: "북마크 목록" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
