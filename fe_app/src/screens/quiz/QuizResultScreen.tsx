import React, { useEffect, useState, useContext, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  AccessibilityInfo,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  QuizResultScreenNavigationProp,
  QuizResultScreenRouteProp,
} from "../../navigation/navigationTypes";
import * as Haptics from "expo-haptics";
import { TriggerContext } from "../../triggers/TriggerContext";
import VoiceCommandButton from "../../components/VoiceCommandButton";

export default function QuizResultScreen() {
  const navigation = useNavigation<QuizResultScreenNavigationProp>();
  const route = useRoute<QuizResultScreenRouteProp>();
  const { quiz, score, totalQuestions, answers } = route.params;

  const [showAllQuestions, setShowAllQuestions] = useState(false);

  const { setCurrentScreenId, registerVoiceHandlers } =
    useContext(TriggerContext);

  const percentage = Math.round((score / totalQuestions) * 100);
  const wrongAnswers = answers.filter((a) => a.isCorrect === false);
  const correctAnswers = answers.filter((a) => a.isCorrect === true);

  useEffect(() => {
    const announcement = `퀴즈 완료. ${totalQuestions}문제 중 ${score}문제 정답. 정답률 ${percentage}퍼센트. ${
      wrongAnswers.length > 0
        ? `틀린 문제는 ${wrongAnswers.length}개입니다. 복습이 필요합니다.`
        : "모든 문제를 맞혔습니다. 완벽합니다!"
    }`;
    AccessibilityInfo.announceForAccessibility(announcement);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [score, totalQuestions, percentage, wrongAnswers.length]);

  const handleGoToLibrary = useCallback(() => {
    AccessibilityInfo.announceForAccessibility("서재로 돌아갑니다.");
    navigation.navigate("Library");
  }, [navigation]);

  const handleRetry = useCallback(() => {
    AccessibilityInfo.announceForAccessibility("퀴즈를 다시 시작합니다.");
    navigation.navigate("Quiz", { quiz });
  }, [navigation, quiz]);

  const handleToggleAllQuestions = useCallback(() => {
    setShowAllQuestions((prev) => {
      const next = !prev;
      AccessibilityInfo.announceForAccessibility(
        next ? "맞은 문제를 펼쳤습니다" : "맞은 문제를 접었습니다"
      );
      return next;
    });
  }, []);

  // QuizResultScreen 전용 음성 명령 처리
  const handleQuizResultVoiceCommand = useCallback(
    (spoken: string) => {
      const t = spoken.trim().toLowerCase();
      if (!t) return;

      // 다시 풀기 / 재도전
      if (
        t.includes("다시") ||
        t.includes("재도전") ||
        (t.includes("퀴즈") && t.includes("풀"))
      ) {
        handleRetry();
        return;
      }

      // 서재로 / 목록으로
      if (
        t.includes("서재") ||
        t.includes("도서관") ||
        t.includes("목록") ||
        t.includes("교재 화면") ||
        t.includes("홈")
      ) {
        handleGoToLibrary();
        return;
      }

      // 맞은 문제 펼치기 / 접기 / 토글
      if (t.includes("맞은") || t.includes("정답")) {
        if (
          t.includes("펼") ||
          t.includes("보여") ||
          t.includes("보기") ||
          t.includes("열어")
        ) {
          setShowAllQuestions((prev) => {
            if (prev) {
              AccessibilityInfo.announceForAccessibility(
                "이미 맞은 문제를 펼친 상태입니다."
              );
              return prev;
            }
            AccessibilityInfo.announceForAccessibility(
              "맞은 문제 목록을 펼쳤습니다."
            );
            return true;
          });
        } else if (
          t.includes("접") ||
          t.includes("숨겨") ||
          t.includes("닫아")
        ) {
          setShowAllQuestions((prev) => {
            if (!prev) {
              AccessibilityInfo.announceForAccessibility(
                "이미 맞은 문제를 접은 상태입니다."
              );
              return prev;
            }
            AccessibilityInfo.announceForAccessibility(
              "맞은 문제 목록을 접었습니다."
            );
            return false;
          });
        } else {
          // "맞은 문제"만 말했을 때는 토글
          setShowAllQuestions((prev) => {
            const next = !prev;
            AccessibilityInfo.announceForAccessibility(
              next
                ? "맞은 문제 목록을 펼쳤습니다."
                : "맞은 문제 목록을 접었습니다."
            );
            return next;
          });
        }
        return;
      }

      // 뒤로 가기 (전역 파서가 놓친 경우 대비)
      if (t.includes("뒤로") || t.includes("이전 화면")) {
        navigation.goBack();
        return;
      }

      AccessibilityInfo.announceForAccessibility(
        "이 화면에서는 다시 풀기, 서재로, 맞은 문제 펼치기, 맞은 문제 접기, 뒤로 가기와 같은 음성 명령을 사용할 수 있습니다."
      );
    },
    [handleRetry, handleGoToLibrary, navigation]
  );

  // 전역 음성 명령 핸들러 등록
  useEffect(() => {
    setCurrentScreenId("QuizResult");

    registerVoiceHandlers("QuizResult", {
      goBack: () => navigation.goBack(),
      openQuiz: handleRetry, // "퀴즈" 명령이 들어오면 다시 풀기
      rawText: handleQuizResultVoiceCommand,
    });

    return () => {
      registerVoiceHandlers("QuizResult", {});
    };
  }, [
    setCurrentScreenId,
    registerVoiceHandlers,
    navigation,
    handleRetry,
    handleQuizResultVoiceCommand,
  ]);

  const renderQuestionCard = (
    questionIndex: number,
    isCorrect: boolean,
    emphasize: boolean = false
  ) => {
    const question = quiz.questions[questionIndex];
    if (!question) {
      console.error(`Question at index ${questionIndex} not found`);
      return null;
    }

    const answer = answers[questionIndex];
    if (!answer) {
      console.error(`Answer at index ${questionIndex} not found`);
      return null;
    }

    // 옵션 찾기
    const selectedOption = question.options.find(
      (opt) => opt.id === answer.selectedOptionId
    );
    const correctOption = question.options.find((opt) => opt.isCorrect);

    // 접근성 레이블 생성
    let accessibilityLabel = `문제 ${questionIndex + 1}. ${
      question.questionText
    }. `;

    if (isCorrect) {
      accessibilityLabel += `정답입니다. 선택한 답 ${selectedOption?.optionText}`;
    } else {
      accessibilityLabel += `오답입니다. 선택한 답 ${selectedOption?.optionText}. 정답은 ${correctOption?.optionText}입니다`;
    }

    return (
      <View
        key={question.id}
        style={[
          styles.questionCard,
          isCorrect ? styles.correctCard : styles.wrongCard,
          emphasize && styles.emphasizedCard,
        ]}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="text"
      >
        {/* 문제 헤더 */}
        <View style={styles.cardHeader}>
          <View style={styles.questionNumberBadge}>
            <Text style={styles.questionNumberText}>{questionIndex + 1}</Text>
          </View>
          <View
            style={[
              styles.resultBadge,
              isCorrect ? styles.correctBadge : styles.wrongBadge,
            ]}
          >
            <Text style={styles.resultBadgeText}>
              {isCorrect ? "✓ 정답" : "✗ 오답"}
            </Text>
          </View>
        </View>

        {/* 문제 내용 */}
        <View style={styles.cardContent}>
          <Text style={styles.cardQuestionLabel}>문제</Text>
          <Text style={styles.cardQuestionText}>{question.questionText}</Text>
        </View>

        {/* 답안 정보 */}
        <View style={styles.cardAnswers}>
          {/* 선택한 답 */}
          <View style={styles.answerRow}>
            <Text style={styles.answerLabel}>
              {isCorrect ? "선택한 답 (정답)" : "선택한 답 (오답)"}
            </Text>
            <View
              style={[
                styles.answerBox,
                isCorrect ? styles.answerBoxCorrect : styles.answerBoxWrong,
              ]}
            >
              <Text
                style={[
                  styles.answerBoxText,
                  isCorrect
                    ? styles.answerBoxTextCorrect
                    : styles.answerBoxTextWrong,
                ]}
              >
                {isCorrect ? "✓ " : "✗ "}
                {selectedOption?.optionText || "(선택 없음)"}
              </Text>
            </View>
          </View>

          {/* 오답일 경우 정답 표시 */}
          {!isCorrect && (
            <View style={styles.answerRow}>
              <Text style={styles.answerLabel}>정답</Text>
              <View style={[styles.answerBox, styles.answerBoxCorrect]}>
                <Text
                  style={[styles.answerBoxText, styles.answerBoxTextCorrect]}
                >
                  ✓ {correctOption?.optionText || "(정답 없음)"}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* 상단 오른쪽 음성 명령 버튼 */}
      <View style={styles.header}>
        <View style={{ flex: 1 }} />
        <VoiceCommandButton accessibilityHint="두 번 탭한 후 다시 풀기, 서재로, 맞은 문제 펼치기, 맞은 문제 접기와 같은 명령을 말씀하세요." />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 점수 요약 */}
        <View style={styles.summarySection}>
          <Text
            style={styles.summaryTitle}
            accessible={true}
            accessibilityRole="header"
          >
            퀴즈 완료!
          </Text>
          <Text style={styles.quizTitle}>{quiz.title}</Text>

          <View style={styles.scoreCircle}>
            <Text
              style={styles.scoreText}
              accessible={true}
              accessibilityLabel={`${totalQuestions}문제 중 ${score}문제 정답`}
              accessibilityRole="text"
            >
              {score}
            </Text>
            <Text style={styles.scoreDivider}>/</Text>
            <Text style={styles.totalText}>{totalQuestions}</Text>
          </View>

          <Text
            style={styles.percentageText}
            accessible={true}
            accessibilityLabel={`정답률 ${percentage}퍼센트`}
            accessibilityRole="text"
          >
            정답률 {percentage}%
          </Text>
        </View>

        {/* 틀린 문제 섹션 */}
        {wrongAnswers.length > 0 ? (
          <View style={styles.wrongSection}>
            <View style={styles.wrongSectionHeader}>
              <Text
                style={styles.sectionTitle}
                accessible={true}
                accessibilityRole="header"
              >
                ❌ 틀린 문제: {wrongAnswers.length}개
              </Text>
              <Text
                style={styles.sectionSubtitle}
                accessible={true}
                accessibilityRole="text"
              >
                복습이 필요합니다
              </Text>
            </View>

            {/* 틀린 문제 카드들 */}
            <View style={styles.cardsContainer}>
              {answers.map((answer, index) => {
                if (answer && !answer.isCorrect && quiz.questions[index]) {
                  return renderQuestionCard(index, false, true);
                }
                return null;
              })}
            </View>
          </View>
        ) : (
          // 만점일 때
          <View style={styles.perfectSection}>
            <Text
              style={styles.perfectTitle}
              accessible={true}
              accessibilityRole="header"
            >
              완벽해요!
            </Text>
            <Text
              style={styles.perfectSubtitle}
              accessible={true}
              accessibilityRole="text"
            >
              모든 문제를 맞혔습니다
            </Text>
          </View>
        )}

        {/* 맞은 문제 섹션 (접기/펼치기) */}
        {correctAnswers.length > 0 && (
          <View style={styles.correctSection}>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={handleToggleAllQuestions}
              accessible={true}
              accessibilityLabel={
                showAllQuestions ? "맞은 문제 접기" : "맞은 문제 펼치기"
              }
              accessibilityRole="button"
              accessibilityHint={
                showAllQuestions
                  ? "맞은 문제 목록을 숨깁니다"
                  : "맞은 문제 목록을 보여줍니다"
              }
            >
              <Text style={styles.toggleButtonText}>
                {showAllQuestions ? "▼" : "▶"} 맞은 문제:{" "}
                {correctAnswers.length}개 {showAllQuestions ? "접기" : "펼치기"}
              </Text>
            </TouchableOpacity>

            {showAllQuestions && (
              <View style={styles.cardsContainer}>
                {answers.map((answer, index) => {
                  // 안전성 체크: index가 유효하고 맞은 답인 경우에만 렌더링
                  if (answer && answer.isCorrect && quiz.questions[index]) {
                    return renderQuestionCard(index, true, false);
                  }
                  return null;
                })}
              </View>
            )}
          </View>
        )}

        {/* 격려 메시지 */}
        <View style={styles.encouragementSection}>
          {percentage === 100 ? (
            <Text
              style={styles.encouragementText}
              accessible={true}
              accessibilityRole="text"
            >
              완벽합니다! 모든 내용을 잘 이해하셨네요!
            </Text>
          ) : percentage >= 80 ? (
            <Text
              style={styles.encouragementText}
              accessible={true}
              accessibilityRole="text"
            >
              잘했어요! 조금만 더 복습하면 완벽할 거예요!
            </Text>
          ) : percentage >= 60 ? (
            <Text
              style={styles.encouragementText}
              accessible={true}
              accessibilityRole="text"
            >
              좋아요! 틀린 문제를 다시 복습해보세요!
            </Text>
          ) : (
            <Text
              style={styles.encouragementText}
              accessible={true}
              accessibilityRole="text"
            >
              괜찮아요! 다시 한 번 복습하고 도전해보세요!
            </Text>
          )}
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.retryButton]}
          onPress={handleRetry}
          accessible={true}
          accessibilityLabel="다시 풀기"
          accessibilityRole="button"
          accessibilityHint="이 퀴즈를 처음부터 다시 풉니다"
        >
          <Text style={styles.actionButtonText}>다시 풀기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.libraryButton]}
          onPress={handleGoToLibrary}
          accessible={true}
          accessibilityLabel="서재로 돌아가기"
          accessibilityRole="button"
        >
          <Text style={styles.actionButtonText}>서재로</Text>
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
  // 상단 음성 명령 버튼 영역
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  summarySection: {
    alignItems: "center",
    marginBottom: 32,
    paddingBottom: 32,
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
  },
  summaryTitle: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 8,
  },
  quizTitle: {
    fontSize: 20,
    color: "#666666",
    textAlign: "center",
    marginBottom: 24,
  },
  scoreCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#E3F2FD",
    borderWidth: 8,
    borderColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 20,
  },
  scoreText: {
    fontSize: 56,
    fontWeight: "bold",
    color: "#2196F3",
  },
  scoreDivider: {
    fontSize: 40,
    color: "#2196F3",
    marginHorizontal: 4,
  },
  totalText: {
    fontSize: 40,
    fontWeight: "600",
    color: "#2196F3",
  },
  percentageText: {
    fontSize: 28,
    fontWeight: "600",
    color: "#333333",
  },
  wrongSection: {
    marginBottom: 32,
  },
  wrongSectionHeader: {
    backgroundColor: "#FFEBEE",
    padding: 20,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#F44336",
    marginBottom: 20,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#C62828",
    marginBottom: 8,
    textAlign: "center",
  },
  sectionSubtitle: {
    fontSize: 18,
    color: "#D32F2F",
    textAlign: "center",
  },
  perfectSection: {
    backgroundColor: "#E8F5E9",
    padding: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#4CAF50",
    marginBottom: 32,
    alignItems: "center",
  },
  perfectTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 8,
    textAlign: "center",
  },
  perfectSubtitle: {
    fontSize: 20,
    color: "#388E3C",
    textAlign: "center",
  },
  correctSection: {
    marginBottom: 32,
  },
  toggleButton: {
    backgroundColor: "#E8F5E9",
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#4CAF50",
    marginBottom: 16,
    alignItems: "center",
  },
  toggleButtonText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#2E7D32",
  },
  cardsContainer: {
    gap: 20,
  },
  questionCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 3,
  },
  correctCard: {
    backgroundColor: "#F1F8E9",
    borderColor: "#8BC34A",
  },
  wrongCard: {
    backgroundColor: "#FFEBEE",
    borderColor: "#F44336",
  },
  emphasizedCard: {
    borderWidth: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  questionNumberBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
  },
  questionNumberText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
  },
  resultBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  correctBadge: {
    backgroundColor: "#4CAF50",
  },
  wrongBadge: {
    backgroundColor: "#F44336",
  },
  resultBadgeText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  cardContent: {
    marginBottom: 16,
  },
  cardQuestionLabel: {
    fontSize: 16,
    color: "#666666",
    fontWeight: "600",
    marginBottom: 8,
  },
  cardQuestionText: {
    fontSize: 24,
    color: "#333333",
    lineHeight: 36,
    fontWeight: "500",
  },
  cardAnswers: {
    gap: 12,
  },
  answerRow: {
    gap: 8,
  },
  answerLabel: {
    fontSize: 16,
    color: "#666666",
    fontWeight: "600",
    marginBottom: 4,
  },
  answerBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  answerBoxCorrect: {
    backgroundColor: "#E8F5E9",
    borderColor: "#4CAF50",
  },
  answerBoxWrong: {
    backgroundColor: "#FFCDD2",
    borderColor: "#F44336",
  },
  answerBoxText: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: "600",
  },
  answerBoxTextCorrect: {
    color: "#2E7D32",
  },
  answerBoxTextWrong: {
    color: "#C62828",
  },
  encouragementSection: {
    padding: 24,
    backgroundColor: "#E3F2FD",
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#2196F3",
    alignItems: "center",
  },
  encouragementText: {
    fontSize: 22,
    color: "#1565C0",
    textAlign: "center",
    lineHeight: 32,
    fontWeight: "600",
  },
  bottomButtons: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 2,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  actionButton: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    minHeight: 88,
    justifyContent: "center",
    borderWidth: 3,
  },
  retryButton: {
    backgroundColor: "#FF9800",
    borderColor: "#F57C00",
  },
  libraryButton: {
    backgroundColor: "#2196F3",
    borderColor: "#1976D2",
  },
  actionButtonText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
});