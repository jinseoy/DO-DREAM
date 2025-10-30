import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  PlayerScreenNavigationProp,
  PlayerScreenRouteProp,
} from "../navigation/navigationTypes";
import { getChapterById } from "../data/dummyChapters";
import { getQuizzesByChapterId } from "../data/dummyQuizzes";
import * as Haptics from "expo-haptics";
import { TriggerContext } from "../triggers/TriggerContext";

export default function PlayerScreen() {
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const route = useRoute<PlayerScreenRouteProp>();
  const { book, chapterId, fromStart } = route.params;

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isChapterCompleted, setIsChapterCompleted] = useState(false);
  const { setMode, registerPlayPause } = useContext(TriggerContext);

  const chapter = getChapterById(chapterId);
  const quizzes = getQuizzesByChapterId(chapterId);
  const hasQuiz = quizzes.length > 0;

  // 화면 진입/이탈 시 전역 트리거 모드 설정
  useEffect(() => {
    // 이 화면에서는 Magic Tap / Android 볼륨 다운 더블 = 재생/정지
    setMode("playpause");

    // 전역에서 호출될 재생/정지 핸들러 등록
    registerPlayPause(() => handlePlayPause());

    return () => {
      // 화면 떠날 때 원복
      registerPlayPause(null);
      setMode("voice");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chapter) {
      const announcement = `${book.subject}, ${chapter.title}. ${
        fromStart ? "처음부터 시작합니다" : "이어서 듣기를 시작합니다"
      }`;
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, []);

  // 챕터 완료 체크
  useEffect(() => {
    if (chapter && currentSectionIndex === chapter.sections.length - 1) {
      setIsChapterCompleted(true);
    } else {
      setIsChapterCompleted(false);
    }
  }, [currentSectionIndex, chapter]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handlePlayPause = () => {
    setIsPlaying((prev) => {
      const next = !prev;
      AccessibilityInfo.announceForAccessibility(next ? "재생" : "일시정지");
      Haptics.selectionAsync();
      return next;
    });
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex((i) => i - 1);
      AccessibilityInfo.announceForAccessibility("이전 문단");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNext = () => {
    if (chapter && currentSectionIndex < chapter.sections.length - 1) {
      setCurrentSectionIndex((i) => i + 1);
      AccessibilityInfo.announceForAccessibility("다음 문단");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (chapter && currentSectionIndex === chapter.sections.length - 1) {
      // 마지막 섹션일 때
      AccessibilityInfo.announceForAccessibility("챕터를 완료했습니다. 퀴즈를 풀어보세요.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleQuestionPress = () => {
    AccessibilityInfo.announceForAccessibility("질문하기 화면으로 이동합니다");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate("Question");
  };

  const handleQuizPress = () => {
    if (quizzes.length === 1) {
      // 퀴즈가 1개면 바로 퀴즈 화면으로
      AccessibilityInfo.announceForAccessibility("퀴즈를 시작합니다");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate("Quiz", { quiz: quizzes[0] });
    } else {
      // 퀴즈가 여러 개면 퀴즈 목록으로
      AccessibilityInfo.announceForAccessibility("퀴즈 목록으로 이동합니다");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate("QuizList", { book, chapterId });
    }
  };

  if (!chapter) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>챕터를 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const currentSection = chapter.sections[currentSectionIndex];

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleGoBack}
          accessible={true}
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.subjectText}>{book.subject}</Text>
          <Text style={styles.chapterTitle}>{chapter.title}</Text>
        </View>
      </View>

      {/* 내용 영역 (저시력자를 위한 텍스트 표시) */}
      <ScrollView
        style={styles.contentArea}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.contentText} accessible={true} accessibilityRole="text">
          {currentSection.text}
        </Text>
        <Text style={styles.progressText}>
          {currentSectionIndex + 1} / {chapter.sections.length}
        </Text>

        {/* 챕터 완료 시 퀴즈 안내 메시지 */}
        {isChapterCompleted && hasQuiz && (
          <View style={styles.completionSection}>
            <Text
              style={styles.completionText}
              accessible={true}
              accessibilityRole="text"
            >
              🎉 챕터 학습을 완료했습니다!
            </Text>
            <Text
              style={styles.completionSubtext}
              accessible={true}
              accessibilityRole="text"
            >
              아래 퀴즈 버튼을 눌러 학습 내용을 확인해보세요.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 컨트롤 버튼 */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            currentSectionIndex === 0 && styles.disabledButton,
          ]}
          onPress={handlePrevious}
          disabled={currentSectionIndex === 0}
          accessible={true}
          accessibilityLabel="이전 문단"
          accessibilityRole="button"
          accessibilityHint="이전 문단으로 이동합니다"
        >
          <Text style={styles.controlButtonText}>◀ 이전</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.playButton]}
          onPress={handlePlayPause}
          onLongPress={handleQuestionPress}
          accessible={true}
          accessibilityLabel={isPlaying ? "일시정지" : "재생"}
          accessibilityRole="button"
          accessibilityHint="두 손가락 두 번 탭으로도 제어할 수 있습니다"
        >
          <Text style={styles.playButtonText}>{isPlaying ? "⏸" : "▶"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            currentSectionIndex === chapter.sections.length - 1 &&
              styles.disabledButton,
          ]}
          onPress={handleNext}
          disabled={currentSectionIndex === chapter.sections.length - 1}
          accessible={true}
          accessibilityLabel="다음 문단"
          accessibilityRole="button"
          accessibilityHint="다음 문단으로 이동합니다"
        >
          <Text style={styles.controlButtonText}>다음 ▶</Text>
        </TouchableOpacity>
      </View>

      {/* 하단 버튼들 */}
      <View style={styles.bottomButtons}>
        {/* 퀴즈 버튼 - 챕터 완료 시에만 표시 */}
        {isChapterCompleted && hasQuiz && (
          <TouchableOpacity
            style={styles.quizButton}
            onPress={handleQuizPress}
            accessible={true}
            accessibilityLabel="퀴즈 풀기"
            accessibilityRole="button"
            accessibilityHint="학습한 내용을 확인하는 퀴즈를 풉니다"
          >
            <Text style={styles.quizButtonText}>📝 퀴즈 풀기</Text>
          </TouchableOpacity>
        )}

        {/* 질문하기 버튼 */}
        <TouchableOpacity
          style={styles.voiceQueryButton}
          onPress={handleQuestionPress}
          accessible={true}
          accessibilityLabel="질문하기"
          accessibilityRole="button"
          accessibilityHint="음성으로 질문할 수 있는 화면으로 이동합니다"
        >
          <Text style={styles.voiceQueryText}>🎤 질문하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 20,
    color: "#2196F3",
    fontWeight: "600",
  },
  headerInfo: {
    marginTop: 16,
  },
  subjectText: {
    fontSize: 20,
    color: "#666666",
    marginBottom: 4,
  },
  chapterTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333333",
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentContainer: {
    paddingTop: 40,
    paddingBottom: 40,
  },
  contentText: {
    fontSize: 24,
    lineHeight: 40,
    color: "#333333",
    marginBottom: 24,
  },
  progressText: {
    fontSize: 18,
    color: "#999999",
    textAlign: "center",
  },
  completionSection: {
    marginTop: 32,
    padding: 20,
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#4CAF50",
    alignItems: "center",
  },
  completionText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 8,
    textAlign: "center",
  },
  completionSubtext: {
    fontSize: 18,
    color: "#388E3C",
    textAlign: "center",
    lineHeight: 26,
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderTopWidth: 2,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  controlButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#2196F3",
    minWidth: 100,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#cccccc",
    opacity: 0.5,
  },
  controlButtonText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
  },
  playButton: {
    backgroundColor: "#4CAF50",
    minWidth: 120,
    minHeight: 88,
    justifyContent: "center",
  },
  playButtonText: {
    fontSize: 36,
    color: "#ffffff",
  },
  bottomButtons: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    gap: 12,
  },
  quizButton: {
    backgroundColor: "#9C27B0",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    minHeight: 88,
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#7B1FA2",
  },
  voiceQueryButton: {
    backgroundColor: "#FF9800",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    minHeight: 88,
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#F57C00",
  },
  quizButtonText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  voiceQueryText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
});