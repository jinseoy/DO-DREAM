import React, { useEffect, useContext, useCallback, useState } from "react";
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
import { QuizQuestion } from "../../types/quiz";
import { fetchQuizzes } from "../../api/quizApi";
import { TriggerContext } from "../../triggers/TriggerContext";
import VoiceCommandButton from "../../components/VoiceCommandButton";
import { useTheme } from "../../contexts/ThemeContext";
import { HEADER_BTN_HEIGHT, HEADER_MIN_HEIGHT } from "../../constants/dimensions";
import { COLORS } from "../../constants/colors";
import { createCommonStyles } from "../../styles/commonStyles";

export default function QuizListScreen() {
  const { colors, fontSize: themeFont, isHighContrast } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, themeFont, isHighContrast), [colors, themeFont, isHighContrast]);
  const commonStyles = React.useMemo(() => createCommonStyles(colors), [colors]);
  const navigation = useNavigation<QuizListScreenNavigationProp>();
  const route = useRoute<QuizListScreenRouteProp>();
  const { material } = route.params;

  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { setCurrentScreenId, registerVoiceHandlers } =
    useContext(TriggerContext);

  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        setLoading(true);
        setError(null);
        const quizData = await fetchQuizzes(material.id);
        setQuizzes(quizData);

        const announcement = `${material.title} 퀴즈 목록. 총 ${quizData.length}개의 문제가 있습니다. 상단의 말하기 버튼을 두 번 탭한 후, '1번 문제', '마지막 문제', '뒤로 가기'와 같이 말할 수 있습니다.`;
        AccessibilityInfo.announceForAccessibility(announcement);

      } catch (e) {
        console.error("[QuizListScreen] 퀴즈 로딩 실패:", e);
        setError("퀴즈를 불러오는 중 오류가 발생했습니다.");
        AccessibilityInfo.announceForAccessibility("퀴즈 목록을 불러오는 데 실패했습니다. 네트워크 상태를 확인해 주세요.");
      } finally {
        setLoading(false);
      }
    };

    loadQuizzes();
  }, [material.id, material.title]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleQuizPress = useCallback(
    (quizQuestion: QuizQuestion, index: number) => {
      AccessibilityInfo.announceForAccessibility(
        `${index + 1}번 문제. 퀴즈 풀이 화면으로 이동합니다.`
      );
      navigation.navigate("Quiz", {
        material: material,
        questions: quizzes,
        startIndex: index,
      });
    },
    [navigation, material.id, quizzes]
  );

  // 🎙 퀴즈 목록 전용 음성 명령(rawText) 처리
  const handleQuizListVoiceRaw = useCallback(
    (spoken: string): boolean => {
      const raw = spoken.trim().toLowerCase();
      if (!raw) return false;

      const normalized = raw.replace(/\s+/g, "");

      if (quizzes.length === 0) {
        if (
          normalized.includes("뒤로") ||
          normalized.includes("이전화면") ||
          normalized.includes("이전화면으로")
        ) {
          handleGoBack();
          return true;
        } else {
          AccessibilityInfo.announceForAccessibility(
            "아직 퀴즈가 없습니다. 뒤로 가기라고 말씀하시면 이전 화면으로 돌아갑니다."
          );
          return false;
        }
      }

      if (
        normalized.includes("마지막퀴즈") ||
        normalized.includes("마지막문제")
      ) {
        const lastIndex = quizzes.length - 1;
        handleQuizPress(quizzes[lastIndex], lastIndex);
        return true;
      }

      if (
        normalized.includes("첫번째퀴즈") ||
        normalized.includes("첫퀴즈") ||
        normalized.includes("처음퀴즈") ||
        normalized.includes("첫번째문제") ||
        normalized.includes("첫문제") ||
        normalized.includes("처음문제")
      ) {
        handleQuizPress(quizzes[0], 0);
        return true;
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
        handleQuizPress(quizzes[targetIndex], targetIndex);
        return true;
      }

      if (
        normalized.includes("뒤로가기") ||
        normalized.includes("뒤로가") ||
        normalized.includes("이전화면") ||
        normalized.includes("이전화면으로")
      ) {
        handleGoBack();
        return true;
      }

      console.log("[VoiceCommands][QuizList] 처리할 수 없는 rawText:", spoken);
      AccessibilityInfo.announceForAccessibility(
        "이 화면에서 사용할 수 없는 음성 명령입니다. 첫 번째 퀴즈, 두 번째 퀴즈, 1번 퀴즈, 2번 퀴즈, 마지막 퀴즈, 뒤로 가기처럼 말해 주세요."
      );
      return false;
    },
    [quizzes, handleGoBack, handleQuizPress]
  );

  useEffect(() => { // 음성 명령 핸들러 등록
    setCurrentScreenId("QuizList");
    registerVoiceHandlers("QuizList", {
      goBack: handleGoBack,
      rawText: handleQuizListVoiceRaw,
    });
    return () => {
      registerVoiceHandlers("QuizList", {});
    };
  }, [
    setCurrentScreenId, // handleQuizListVoiceRaw가 quizzes 상태에 의존하므로, quizzes가 바뀔 때마다 핸들러를 새로 등록해야 함
    registerVoiceHandlers,
    handleGoBack,
    handleQuizListVoiceRaw,
  ]);

  const renderQuizQuestionItem = ({ item, index }: { item: QuizQuestion; index: number }) => {
    const quizTypeLabel = item.question_type; // 예: 'TERM_DEFINITION'
    const accessibilityLabel = `${index + 1}번. ${
      item.title
    }. 문제 유형: ${quizTypeLabel}.`;

    return (
      <TouchableOpacity
        style={styles.quizButton}
        onPress={() => handleQuizPress(item, index)}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        <View style={styles.quizContent}>
          <Text style={styles.quizTitle}>{`${index + 1}. ${item.title}`}</Text>
          <View style={styles.quizTypeBadge}>
            <Text style={styles.quizTypeBadgeText}>{quizTypeLabel}</Text>
          </View>
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

        <VoiceCommandButton
          style={commonStyles.headerVoiceButton}
          accessibilityHint="두 번 탭한 후, 첫 번째 퀴즈, 두 번째 퀴즈, 1번 퀴즈, 2번 퀴즈, 마지막 퀴즈, 뒤로 가기와 같은 명령을 말씀하세요"
        />
      </View>

      {!loading && (
        <View style={styles.headerInfo}>
          <Text
            style={styles.subjectText}
            accessible={true}
            accessibilityRole="header"
          >
            {material.title}
          </Text>
          <Text style={styles.chapterTitle}>전체 퀴즈 목록</Text>
        </View>
      )}
    </View>
  );

  if (loading || error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {Header}
        <View style={styles.emptyContainer}>
          <Text
            style={styles.emptyText}
            accessible={true}
            accessibilityRole="text"
          >
            {loading ? "퀴즈를 불러오는 중입니다..." :
             error ? error :
             "아직 퀴즈가 없습니다."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {Header}
      <FlatList
        data={quizzes} // API로 받아온 퀴즈 목록
        renderItem={renderQuizQuestionItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        accessible={false}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any, fontSize: (size: number) => number, isHighContrast: boolean) => {
  const isPrimaryColors = 'primary' in colors;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: 3,
      borderBottomColor: isHighContrast ? COLORS.secondary.main : colors.primary.main,
      minHeight: HEADER_MIN_HEIGHT,
    },
    headerTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: HEADER_BTN_HEIGHT,
    },
    backButton: {
      paddingVertical: 8,
      paddingRight: 16,
      alignSelf: "flex-start",
    },
    backButtonText: {
      fontSize: fontSize(20),
      color: isPrimaryColors ? colors.primary.main : colors.accent.primary,
      fontWeight: "600",
    },
    headerInfo: {
      marginTop: 16,
    },
    subjectText: {
      fontSize: fontSize(22),
      color: colors.text.secondary,
      marginBottom: 4,
    },
    chapterTitle: {
      fontSize: fontSize(30),
      fontWeight: "bold",
      color: colors.text.primary,
    },
    listContent: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 40,
    },
    quizButton: {
      backgroundColor: isPrimaryColors ? colors.primary.lightest : colors.background.elevated,
      borderRadius: 12,
      padding: 24,
      borderWidth: 3,
      borderColor: isPrimaryColors ? colors.primary.main : colors.accent.primary,
      minHeight: 100,
      marginBottom: 16,
      justifyContent: "center",
    },
    quizContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    quizTitle: {
      fontSize: fontSize(26),
      fontWeight: "700",
      color: colors.text.primary,
      flex: 1,
      marginRight: 12,
    },
    quizTypeBadge: {
      backgroundColor: colors.status.info,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    quizTypeBadgeText: {
      fontSize: fontSize(20),
      fontWeight: "600",
      color: colors.text.inverse,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    emptyText: {
      fontSize: fontSize(26),
      color: colors.text.tertiary || colors.text.secondary,
      textAlign: "center",
    },
  });
};