import React, { useEffect, useContext, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import {
  QuestionListScreenNavigationProp,
  QuestionListScreenRouteProp,
} from "../../navigation/navigationTypes";
import * as Haptics from "expo-haptics";
import { TriggerContext } from "../../triggers/TriggerContext";
import VoiceCommandButton from "../../components/VoiceCommandButton";
import BackButton from "../../components/BackButton";
import { commonStyles } from "../../styles/commonStyles";
import {
  getQuestionsByMaterial,
  deleteQuestionHistory,
  QuestionHistory,
} from "../../services/questionStorage";
import { useTheme } from "../../contexts/ThemeContext";

export default function QuestionListScreen() {
  const navigation = useNavigation<QuestionListScreenNavigationProp>();
  const route = useRoute<QuestionListScreenRouteProp>();
  const { material } = route.params;

  const { colors, fontSize: themeFont } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, themeFont), [colors, themeFont]);

  const [questions, setQuestions] = useState<QuestionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { setCurrentScreenId, registerVoiceHandlers } =
    useContext(TriggerContext);

  // 질문 목록 로드
  const loadQuestions = useCallback(() => {
    try {
      setIsLoading(true);
      const questionList = getQuestionsByMaterial(material.id.toString());
      setQuestions(questionList);
      console.log("[QuestionListScreen] 질문 목록 로드:", questionList.length);
    } catch (error) {
      console.error("[QuestionListScreen] 질문 목록 로드 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [material.id]);

  // 화면 포커스 시 질문 목록 새로고침
  useFocusEffect(
    useCallback(() => {
      loadQuestions();
    }, [loadQuestions])
  );

  // 화면 진입 안내 (로딩 완료 후에만 실행)
  useEffect(() => {
    if (!isLoading) {
      const announcement = `질문 목록 화면입니다. ${questions.length}개의 질문이 있습니다. 질문을 선택하면 이어서 대화할 수 있습니다.`;
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [isLoading, questions.length]);

  // 날짜 포맷팅 (한국어)
  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  // 텍스트 줄임 (최대 길이)
  const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // 질문 선택 핸들러
  const handleQuestionPress = useCallback(
    (question: QuestionHistory) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      AccessibilityInfo.announceForAccessibility("질문을 불러옵니다.");

      // 첫 번째 챕터 ID 가져오기 (실제로는 question.chapterId 사용)
      navigation.navigate("Question", {
        material,
        chapterId: question.chapterId,
        sectionIndex: 0, // 질문 목록에서는 sectionIndex가 의미 없지만 필수 파라미터
        questionId: question.id,
        sessionId: question.sessionId,
      });
    },
    [material, navigation]
  );

  // 질문 삭제 핸들러
  const handleDeleteQuestion = useCallback(
    (question: QuestionHistory) => {
      Alert.alert(
        "질문 삭제",
        "이 질문과 대화 내역을 삭제하시겠습니까?",
        [
          {
            text: "취소",
            style: "cancel",
            onPress: () => {
              AccessibilityInfo.announceForAccessibility("삭제를 취소했습니다.");
            },
          },
          {
            text: "삭제",
            style: "destructive",
            onPress: () => {
              const success = deleteQuestionHistory(question.id);
              if (success) {
                AccessibilityInfo.announceForAccessibility("질문을 삭제했습니다.");
                loadQuestions(); // 목록 새로고침
              } else {
                AccessibilityInfo.announceForAccessibility("질문 삭제에 실패했습니다.");
              }
            },
          },
        ],
        { cancelable: true }
      );
    },
    [loadQuestions]
  );

  // 뒤로가기
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // 음성 명령 핸들러
  const handleVoiceCommand = useCallback(
    (spoken: string) => {
      const t = spoken.trim().toLowerCase();

      // 뒤로가기
      if (
        t.includes("뒤로") ||
        t.includes("이전") ||
        t.includes("돌아가")
      ) {
        handleGoBack();
        return;
      }

      // 새로고침
      if (
        t.includes("새로고침") ||
        t.includes("새로 고침") ||
        t.includes("목록 갱신") ||
        t.includes("다시 불러")
      ) {
        AccessibilityInfo.announceForAccessibility("질문 목록을 새로고침합니다.");
        loadQuestions();
        return;
      }

      // 그 외
      AccessibilityInfo.announceForAccessibility(
        "이 화면에서 사용할 수 없는 명령입니다. 뒤로 가기 또는 새로고침처럼 말해주세요."
      );
    },
    [handleGoBack, loadQuestions]
  );

  // TriggerContext 등록
  useEffect(() => {
    setCurrentScreenId("QuestionList");
    registerVoiceHandlers("QuestionList", {
      goBack: handleGoBack,
      rawText: handleVoiceCommand,
    });
  }, [setCurrentScreenId, registerVoiceHandlers, handleGoBack, handleVoiceCommand]);

  // 첫 질문과 답변 가져오기
  const getFirstQuestion = (question: QuestionHistory): string => {
    const firstUserMessage = question.messages.find(m => m.type === 'user');
    return firstUserMessage?.text || "";
  };

  const getFirstAnswer = (question: QuestionHistory): string => {
    const firstBotMessage = question.messages.find(m => m.type === 'bot');
    return firstBotMessage?.text || "";
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* 헤더 */}
      <View style={[commonStyles.headerContainer, styles.header]}>
        <BackButton
          onPress={handleGoBack}
          style={commonStyles.headerBackButton}
        />

        <Text
          style={styles.title}
          accessible={true}
          accessibilityRole="header"
        >
          질문 목록
        </Text>

        <VoiceCommandButton
          style={commonStyles.headerVoiceButton}
          accessibilityHint="두 번 탭한 후, 뒤로 가기 또는 새로고침 같은 명령을 말씀하세요"
        />
      </View>

      {/* 교재 정보 */}
      <View style={styles.infoSection}>
        <Text style={styles.materialTitle} accessibilityRole="text">
          {material.title}
        </Text>
        <Text style={styles.questionCount}>
          총 {questions.length}개의 질문
        </Text>
      </View>

      {/* 질문 목록 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>질문 목록을 불러오는 중...</Text>
          </View>
        ) : questions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              아직 질문한 내역이 없습니다.{"\n"}
              학습 중에 질문하기 버튼을 눌러 질문해보세요.
            </Text>
          </View>
        ) : (
          questions.map((question) => {
            const firstQuestion = getFirstQuestion(question);
            const firstAnswer = getFirstAnswer(question);
            const messageCount = question.messages.length;
            const exchangeCount = Math.floor(messageCount / 2); // 질문-답변 쌍의 개수

            return (
              <View key={question.id} style={styles.questionCard}>
                <TouchableOpacity
                  style={styles.questionContent}
                  onPress={() => handleQuestionPress(question)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`질문: ${truncateText(firstQuestion, 50)}. 대화 ${exchangeCount}회. ${formatDate(question.updatedAt)} 작성.`}
                  accessibilityHint="두 번 탭하면 이어서 대화할 수 있습니다"
                >
                  {/* 질문 텍스트 */}
                  <View style={styles.questionTextContainer}>
                    <Text style={styles.questionLabel}>질문</Text>
                    <Text style={styles.questionText}>
                      {truncateText(firstQuestion, 120)}
                    </Text>
                  </View>

                  {/* 답변 텍스트 */}
                  <View style={styles.answerTextContainer}>
                    <Text style={styles.answerLabel}>답변</Text>
                    <Text style={styles.answerText}>
                      {truncateText(firstAnswer, 150)}
                    </Text>
                  </View>

                  {/* 메타 정보 */}
                  <View style={styles.metaContainer}>
                    <Text style={styles.metaText}>
                      대화 {exchangeCount}회
                    </Text>
                    <Text style={styles.metaText}>•</Text>
                    <Text style={styles.metaText}>
                      {formatDate(question.updatedAt)}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* 삭제 버튼 */}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteQuestion(question)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="질문 삭제"
                  accessibilityHint="두 번 탭하면 이 질문을 삭제합니다"
                >
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, fontSize: (size: number) => number) => {
  const isPrimaryColors = 'primary' in colors;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      paddingHorizontal: 16,
    },
    title: {
      fontSize: fontSize(22),
      fontWeight: "600",
      color: colors.text.secondary,
      flex: 1,
      textAlign: "center",
    },
    infoSection: {
      paddingHorizontal: 24,
      paddingVertical: 20,
      borderBottomWidth: 2,
      borderBottomColor: isPrimaryColors ? colors.border.light : colors.border.default,
      backgroundColor: colors.background.elevated || colors.background.default,
    },
    materialTitle: {
      fontSize: fontSize(26),
      fontWeight: "bold",
      color: colors.text.primary,
      marginBottom: 8,
    },
    questionCount: {
      fontSize: fontSize(17),
      color: colors.text.secondary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      gap: 16,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: fontSize(20),
      color: colors.text.tertiary || colors.text.secondary,
      textAlign: "center",
      lineHeight: 30,
    },
    questionCard: {
      backgroundColor: colors.background.default,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: isPrimaryColors ? colors.border.light : colors.border.default,
      overflow: "hidden",
      marginBottom: 16,
    },
    questionContent: {
      padding: 16,
    },
    questionTextContainer: {
      marginBottom: 12,
    },
    questionLabel: {
      fontSize: fontSize(14),
      fontWeight: "700",
      color: isPrimaryColors ? colors.primary.main : colors.accent.primary,
      marginBottom: 4,
    },
    questionText: {
      fontSize: fontSize(20),
      lineHeight: 28,
      color: colors.text.primary,
      fontWeight: "600",
    },
    answerTextContainer: {
      marginBottom: 12,
      paddingTop: 12,
      borderTopWidth: 2,
      borderTopColor: colors.background.elevated || colors.background.default,
    },
    answerLabel: {
      fontSize: fontSize(14),
      fontWeight: "700",
      color: colors.status.success,
      marginBottom: 4,
    },
    answerText: {
      fontSize: fontSize(17),
      lineHeight: 26,
      color: colors.text.secondary,
    },
    metaContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 8,
    },
    metaText: {
      fontSize: fontSize(14),
      color: colors.text.tertiary || colors.text.secondary,
    },
    deleteButton: {
      backgroundColor: colors.status.error,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
      borderTopWidth: 2,
      borderTopColor: isPrimaryColors ? colors.border.light : colors.border.default,
    },
    deleteButtonText: {
      fontSize: fontSize(16),
      fontWeight: "700",
      color: isPrimaryColors ? colors.text.inverse : colors.text.primary,
    },
  });
};