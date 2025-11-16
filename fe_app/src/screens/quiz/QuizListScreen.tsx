import React, { useEffect, useContext, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  AccessibilityInfo,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  QuizListScreenNavigationProp,
  QuizListScreenRouteProp,
} from "../../navigation/navigationTypes";
import { getQuizzesByChapterId } from "../../data/dummyQuizzes";
import { getChapterById } from "../../data/dummyChapters";
import { Quiz } from "../../types/quiz";
import { TriggerContext } from "../../triggers/TriggerContext";
import VoiceCommandButton from "../../components/VoiceCommandButton";

export default function QuizListScreen() {
  const navigation = useNavigation<QuizListScreenNavigationProp>();
  const route = useRoute<QuizListScreenRouteProp>();
  const { material, chapterId } = route.params;

  const quizzes = getQuizzesByChapterId(chapterId.toString());
  const chapter = getChapterById(chapterId);

  const { setCurrentScreenId, registerVoiceHandlers } =
    useContext(TriggerContext);

  useEffect(() => {
    const announcement = `${material.title}, ${chapter?.title} 퀴즈 목록. ${quizzes.length}개의 퀴즈가 있습니다. 상단의 음성 명령 버튼을 두 번 탭한 후, 첫 번째 퀴즈, 두 번째 퀴즈, 1번 퀴즈, 2번 퀴즈, 마지막 퀴즈, 뒤로 가기와 같이 말할 수 있습니다.`;
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [material.title, chapter?.title, quizzes.length]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleQuizPress = useCallback(
    (quiz: Quiz) => {
      AccessibilityInfo.announceForAccessibility(`${quiz.title} 시작합니다.`);
      navigation.navigate("Quiz", { quiz });
    },
    [navigation]
  );

  // 🎙 퀴즈 목록 전용 음성 명령(rawText) 처리
  const handleQuizListVoiceRaw = useCallback(
    (spoken: string) => {
      const raw = spoken.trim().toLowerCase();
      if (!raw) return;

      const normalized = raw.replace(/\s+/g, "");

      if (quizzes.length === 0) {
        if (
          normalized.includes("뒤로") ||
          normalized.includes("이전화면") ||
          normalized.includes("이전화면으로")
        ) {
          handleGoBack();
        } else {
          AccessibilityInfo.announceForAccessibility(
            "아직 퀴즈가 없습니다. 뒤로 가기라고 말씀하시면 이전 화면으로 돌아갑니다."
          );
        }
        return;
      }

      if (
        normalized.includes("마지막퀴즈") ||
        normalized.includes("마지막문제")
      ) {
        const lastIndex = quizzes.length - 1;
        handleQuizPress(quizzes[lastIndex]);
        return;
      }

      if (
        normalized.includes("첫번째퀴즈") ||
        normalized.includes("첫퀴즈") ||
        normalized.includes("처음퀴즈") ||
        normalized.includes("첫번째문제") ||
        normalized.includes("첫문제") ||
        normalized.includes("처음문제")
      ) {
        handleQuizPress(quizzes[0]);
        return;
      }

      const hanToNum: Record<string, number> = {
        일: 1,
        한: 1,
        이: 2,
        삼: 3,
        사: 4,
        오: 5,
        육: 6,
        칠: 7,
        팔: 8,
        구: 9,
      };

      let targetIndex: number | null = null;

      const numMatch = normalized.match(/([0-9]+)/);
      if (numMatch) {
        const n = parseInt(numMatch[1], 10);
        if (!isNaN(n) && n >= 1 && n <= quizzes.length) {
          targetIndex = n - 1;
        }
      }

      if (targetIndex === null) {
        (Object.keys(hanToNum) as (keyof typeof hanToNum)[]).forEach((ch) => {
          if (targetIndex !== null) return;
          if (
            normalized.includes(ch + "번째퀴즈") ||
            normalized.includes(ch + "번째문제") ||
            normalized.includes(ch + "번퀴즈") ||
            normalized.includes(ch + "번문제") ||
            normalized.startsWith(ch + "번") ||
            normalized.startsWith(ch + "번째")
          ) {
            const n = hanToNum[ch];
            if (n >= 1 && n <= quizzes.length) {
              targetIndex = n - 1;
            }
          }
        });
      }

      if (targetIndex !== null) {
        handleQuizPress(quizzes[targetIndex]);
        return;
      }

      if (
        normalized.includes("뒤로가기") ||
        normalized.includes("뒤로가") ||
        normalized.includes("이전화면") ||
        normalized.includes("이전화면으로")
      ) {
        handleGoBack();
        return;
      }

      console.log("[VoiceCommands][QuizList] 처리할 수 없는 rawText:", spoken);
      AccessibilityInfo.announceForAccessibility(
        "이 화면에서 사용할 수 없는 음성 명령입니다. 첫 번째 퀴즈, 두 번째 퀴즈, 1번 퀴즈, 2번 퀴즈, 마지막 퀴즈, 뒤로 가기처럼 말해 주세요."
      );
    },
    [quizzes, handleGoBack, handleQuizPress]
  );

  useEffect(() => {
    setCurrentScreenId("QuizList");

    registerVoiceHandlers("QuizList", {
      goBack: handleGoBack,
      rawText: handleQuizListVoiceRaw,
    });

    return () => {
      registerVoiceHandlers("QuizList", {});
    };
  }, [
    setCurrentScreenId,
    registerVoiceHandlers,
    handleGoBack,
    handleQuizListVoiceRaw,
  ]);

  const renderQuizItem = ({ item, index }: { item: Quiz; index: number }) => {
    const quizTypeLabel =
      item.quizType === "AI_GENERATED" ? "AI 생성" : "선생님 제작";
    const accessibilityLabel = `${index + 1}번. ${
      item.title
    }. ${quizTypeLabel}. 문제 ${item.questions.length}개.`;

    return (
      <TouchableOpacity
        style={styles.quizButton}
        onPress={() => handleQuizPress(item)}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityHint="두 번 탭하여 퀴즈를 시작하세요"
      >
        <View style={styles.quizContent}>
          <View style={styles.quizHeader}>
            <Text style={styles.quizTitle}>{item.title}</Text>
            <View
              style={[
                styles.typeBadge,
                item.quizType === "AI_GENERATED"
                  ? styles.aiBadge
                  : styles.teacherBadge,
              ]}
            >
              <Text style={styles.typeBadgeText}>{quizTypeLabel}</Text>
            </View>
          </View>
          <Text style={styles.questionCount}>
            문제 {item.questions.length}개
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const Header = (
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          accessible={true}
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
          accessibilityHint="이전 화면으로 돌아갑니다"
        >
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>

        <VoiceCommandButton accessibilityHint="두 번 탭한 후, 첫 번째 퀴즈, 두 번째 퀴즈, 1번 퀴즈, 2번 퀴즈, 마지막 퀴즈, 뒤로 가기와 같은 명령을 말씀하세요" />
      </View>

      {quizzes.length > 0 && (
        <View style={styles.headerInfo}>
          <Text
            style={styles.subjectText}
            accessible={true}
            accessibilityRole="header"
          >
            {material.title}
          </Text>
          <Text style={styles.chapterTitle}>{chapter?.title}</Text>
        </View>
      )}
    </View>
  );

  if (quizzes.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {Header}
        <View style={styles.emptyContainer}>
          <Text
            style={styles.emptyText}
            accessible={true}
            accessibilityRole="text"
          >
            아직 퀴즈가 없습니다.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {Header}
      <FlatList
        data={quizzes}
        renderItem={renderQuizItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        accessible={false}
      />
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
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
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
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  quizButton: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    minHeight: 100,
  },
  quizContent: {
    gap: 12,
  },
  quizHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333333",
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  aiBadge: {
    backgroundColor: "#9C27B0",
  },
  teacherBadge: {
    backgroundColor: "#FF9800",
  },
  typeBadgeText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
  },
  questionCount: {
    fontSize: 18,
    color: "#666666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 24,
    color: "#999999",
    textAlign: "center",
  },
});