import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  AccessibilityInfo,
  findNodeHandle,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  QuizScreenNavigationProp,
  QuizScreenRouteProp,
} from "../../navigation/navigationTypes";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { TriggerContext } from "../../triggers/TriggerContext";
import VoiceCommandButton from "../../components/VoiceCommandButton";
import BackButton from "../../components/BackButton";
import { commonStyles } from "../../styles/commonStyles";
import { COLORS, HIGH_CONTRAST_COLORS } from "../../constants/colors";
import {
  HEADER_BTN_HEIGHT,
  HEADER_MIN_HEIGHT,
} from "../../constants/dimensions";
import { useTheme } from "../../contexts/ThemeContext";
import { submitQuizAnswers } from "../../api/quizApi";
import { QuizAnswerRequest } from "../../types/api/quizApiTypes";
import { asrService } from "../../services/asrService";

export default function QuizScreen() {
  const navigation = useNavigation<QuizScreenNavigationProp>();
  const route = useRoute<QuizScreenRouteProp>();
  const { material, questions, startIndex } = route.params;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
    startIndex || 0
  );
  const [userAnswers, setUserAnswers] = useState<Map<number, string>>(
    new Map()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDictating, setIsDictating] = useState(false);

  const userInput = userAnswers.get(questions[currentQuestionIndex]?.id) || "";
  const [isTalkBackEnabled, setIsTalkBackEnabled] = useState<boolean>(false);

  const {
    setMode,
    registerPlayPause,
    setCurrentScreenId,
    registerVoiceHandlers,
    registerVolumeTriggers, // 1. TriggerContext에서 새로운 함수를 가져옵니다.
    startVoiceCommandListening,
    stopVoiceCommandListening,
  } = useContext(TriggerContext);

  const questionTextRef = useRef<Text>(null);
  const inputRef = useRef<TextInput>(null);
  const asrOffRef = useRef<null | (() => void)>(null);

  const { isHighContrast } = useTheme();
  const styles = React.useMemo(
    () => createStyles(isHighContrast),
    [isHighContrast]
  );

  if (!questions || questions.length === 0) {
    // TODO: 퀴즈 데이터가 없을 때의 UI 처리 (예: 에러 메시지)
    return null;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  useEffect(() => {
    const checkScreenReaderEnabled = async () => {
      try {
        const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
        setIsTalkBackEnabled(isEnabled);
        console.log("TalkBack 활성화 상태:", isEnabled);
      } catch (error) {
        console.error("TalkBack 상태 확인 오류:", error);
        setIsTalkBackEnabled(false);
      }
    };

    checkScreenReaderEnabled();

    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      (enabled) => {
        setIsTalkBackEnabled(enabled);
        console.log("TalkBack 상태 변경:", enabled);
      }
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    setMode("playpause");
    registerPlayPause(() => (isLastQuestion ? handleSubmit() : handleNext()));

    return () => {
      registerPlayPause(null);
      setMode("voice");
      Speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInput, currentQuestionIndex, isLastQuestion]);

  const readQuestion = async () => {
    if (isTalkBackEnabled) {
      console.log("TalkBack 활성화 - TTS 비활성화");
      return;
    }

    await Speech.stop();

    try {
      console.log("=== TTS 읽기 시작 ===");

      const titleText = `${currentQuestion.title}`;
      console.log("읽기 1:", titleText);

      await new Promise<void>((resolve) => {
        Speech.speak(titleText, {
          language: "ko-KR",
          pitch: 1.0,
          rate: 1.1,
          onDone: () => {
            console.log("제목 읽기 완료");
            resolve();
          },
          onError: (error) => {
            console.error("제목 읽기 오류:", error);
            resolve();
          },
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      const contentText = currentQuestion.content;
      console.log("읽기 2:", contentText);

      await new Promise<void>((resolve) => {
        Speech.speak(contentText, {
          language: "ko-KR",
          pitch: 1.0,
          rate: 1.1,
          onDone: () => {
            console.log("내용 읽기 완료");
            resolve();
          },
          onError: (error) => {
            console.error("내용 읽기 오류:", error);
            resolve();
          },
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      console.log("읽기 마지막: 답을 입력해주세요");
      await new Promise<void>((resolve) => {
        Speech.speak("답을 입력해주세요", {
          language: "ko-KR",
          pitch: 1.0,
          rate: 1.1,
          onDone: () => {
            console.log("=== TTS 읽기 완료 ===");
            resolve();
          },
          onError: (error) => {
            console.error("마지막 안내 읽기 오류:", error);
            resolve();
          },
        });
      });
    } catch (error) {
      console.error("TTS 읽기 전체 오류:", error);
    }
  };

  useEffect(() => {
    readQuestion();

    if (isTalkBackEnabled) {
      setTimeout(() => {
        if (questionTextRef.current) {
          const reactTag = findNodeHandle(questionTextRef.current);
          if (reactTag) {
            AccessibilityInfo.setAccessibilityFocus(reactTag);
          }
        }
      }, 500);
    }
  }, [currentQuestionIndex, isTalkBackEnabled]);

  const handleGoBack = () => {
    Speech.stop();
    navigation.goBack();
  };

  const handleUserInput = (text: string) => {
    setUserAnswers((prev) => new Map(prev).set(currentQuestion.id, text));
  };

  const handleNext = () => {
    if (isLastQuestion) return;

    setCurrentQuestionIndex((prev) => prev + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!userInput.trim()) {
      const announcement = "답을 먼저 입력해주세요";
      if (isTalkBackEnabled) {
        AccessibilityInfo.announceForAccessibility(announcement);
      } else {
        Speech.speak(announcement, { language: "ko-KR", rate: 1.2 });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (!isLastQuestion) {
      handleNext();
      return;
    }

    setIsSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const announcement = "모든 문제를 완료했습니다. 채점을 시작합니다.";
    if (isTalkBackEnabled) {
      AccessibilityInfo.announceForAccessibility(announcement);
    } else {
      Speech.speak(announcement, { language: "ko-KR", rate: 1.2 });
    }

    const answersPayload: QuizAnswerRequest[] = questions.map((q) => ({
      quizId: q.id,
      answer: userAnswers.get(q.id) || "",
    }));

    try {
      const results = await submitQuizAnswers(material.id, {
        answers: answersPayload,
      });
      console.log("[QuizScreen] 채점 결과:", results);

      navigation.navigate("QuizResult", {
        material: material,
        gradingResults: results,
        userAnswers: answersPayload,
      });
      // AccessibilityInfo.announceForAccessibility(
      //   "채점이 완료되었습니다. 결과 화면으로 이동하는 기능은 현재 개발 중입니다. 서재로 돌아가려면 뒤로가기라고 말해주세요."
      // );
    } catch (error) {
      console.error("[QuizScreen] 채점 실패:", error);
      AccessibilityInfo.announceForAccessibility(
        "채점에 실패했습니다. 네트워크 연결을 확인하고 다시 시도해주세요."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 음성 받아쓰기 시작
  const startDictation = useCallback(async () => {
    if (isDictating) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (asrOffRef.current) asrOffRef.current(); // 기존 리스너 정리
    asrOffRef.current = asrService.on((raw, isFinal) => {
      if (isFinal) {
        handleUserInput(raw);
        stopDictation();
        AccessibilityInfo.announceForAccessibility(
          `'${raw}' 라고 입력되었습니다.`
        );
      }
    });

    await asrService.start({
      lang: "ko-KR",
      interimResults: false,
      continuous: false,
    });
    setIsDictating(true);
    AccessibilityInfo.announceForAccessibility("답변을 말씀하세요.");
  }, [isDictating, handleUserInput]);

  // 음성 받아쓰기 중지
  const stopDictation = useCallback(async () => {
    if (!isDictating) return;
    await asrService.stop();
    if (asrOffRef.current) {
      asrOffRef.current();
      asrOffRef.current = null;
    }
    setIsDictating(false);
  }, [isDictating]);

  // 음성 받아쓰기 버튼 핸들러
  const handleDictateAnswer = useCallback(() => {
    // isDictating 상태가 클로저에 갇히는 것을 방지하기 위해 함수형 업데이트 사용 또는 직접 isDictating 참조
    isDictating ? stopDictation() : startDictation();
  }, [isDictating, startDictation, stopDictation]);

  const handlePrevious = () => {
    Speech.stop();

    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleQuizVoiceRaw = (spoken: string): boolean => {
    const raw = (spoken || "").trim().toLowerCase();
    if (!raw) return false;

    const noSpace = raw.replace(/\s+/g, "");
    console.log("[VoiceCommands][Quiz] rawText:", raw);

    if (
      noSpace.includes("뒤로가기") ||
      noSpace.includes("뒤로가") ||
      noSpace.includes("이전화면") ||
      noSpace.includes("이전화면으로")
    ) {
      handleGoBack();
      return true;
    }

    if (
      noSpace.includes("다시읽어") ||
      noSpace.includes("다시읽어줘") ||
      noSpace.includes("문제다시") ||
      noSpace.includes("문제읽어줘") ||
      noSpace.includes("다시들려줘")
    ) {
      readQuestion();
      return true;
    }

    if (
      noSpace.includes("제출") ||
      noSpace.includes("제출하기") ||
      noSpace.includes("다음문제") ||
      noSpace.includes("다음문제로") ||
      noSpace.includes("다음") ||
      noSpace.includes("넘어가") ||
      noSpace.includes("넘어가줘") ||
      noSpace.includes("넘겨")
    ) {
      isLastQuestion ? handleSubmit() : handleNext();
      return true;
    }

    if (
      noSpace.includes("채점") ||
      noSpace.includes("결과보기") ||
      noSpace.includes("결과확인") ||
      noSpace.includes("정답확인")
    ) {
      handleSubmit();
      return true;
    }

    if (
      noSpace.includes("이전문제") ||
      noSpace.includes("앞문제") ||
      noSpace.includes("전문제") ||
      noSpace.includes("이전으로") ||
      noSpace.includes("이전")
    ) {
      handlePrevious();
      return true;
    }

    console.log("[VoiceCommands][Quiz] 처리할 수 없는 명령:", spoken);
    AccessibilityInfo.announceForAccessibility(
      "이 화면에서 사용할 수 없는 음성 명령입니다. 다음 문제, 이전 문제, 채점하기, 뒤로 가기처럼 말해 주세요."
    );
    return false;
  };

  useEffect(() => {
    setCurrentScreenId("Quiz");

    registerVoiceHandlers("Quiz", {
      next: isLastQuestion ? handleSubmit : handleNext,
      prev: handlePrevious,
      goBack: handleGoBack,
      rawText: handleQuizVoiceRaw,
    });

    return () => {
      registerVoiceHandlers("Quiz", {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentQuestionIndex,
    isLastQuestion,
    handleNext,
    handlePrevious,
    handleGoBack,
    handleQuizVoiceRaw,
  ]);

  // 2. 새로운 볼륨 버튼 트리거 핸들러를 등록합니다.
  useEffect(() => {
    if (registerVolumeTriggers) {
      // registerVolumeTriggers 함수가 있는지 확인
      const handleVolumeUp = (count: number) => {
        if (count === 2) {
          // 2번 누르면 기존 음성 명령
          startVoiceCommandListening();
        } else if (count === 3) {
          // 3번 누르면 답변 받아쓰기
          startDictation();
        }
      };

      const handleVolumeDown = (count: number) => {
        if (count === 2) {
          // 2번 누르면 기존 음성 명령 중지
          stopVoiceCommandListening();
        } else if (count === 3) {
          // 3번 누르면 답변 받아쓰기 중지
          stopDictation();
        }
      };
      registerVolumeTriggers("Quiz", {
        onVolumeUpPress: handleVolumeUp,
        onVolumeDownPress: handleVolumeDown,
      });
    }

    return () => {
      if (registerVolumeTriggers) {
        registerVolumeTriggers("Quiz", {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isDictating,
    registerVolumeTriggers,
    startDictation,
    stopDictation,
    startVoiceCommandListening,
    stopVoiceCommandListening,
  ]);

  // 언마운트 시 ASR 정리
  useEffect(() => {
    return () => {
      asrService.abort();
    };
  }, []);

  useEffect(() => {
    const msg =
      "퀴즈 화면입니다. 볼륨 올리기 버튼을 세 번 눌러 음성으로 답을 입력할 수 있습니다. 상단의 말하기 버튼으로는 다음 문제, 이전 문제와 같은 명령을 사용할 수 있습니다.";
    const timer = setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(msg);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <BackButton onPress={handleGoBack} />
            <VoiceCommandButton
              style={commonStyles.headerVoiceButton}
              accessibilityHint="두 번 탭한 후, 제출하기, 다음 문제, 이전 문제, 문제 다시, 채점하기, 뒤로 가기와 같은 명령을 말씀하세요"
              onBeforeListen={() => Speech.stop()}
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.quizTitle} numberOfLines={1}>
              {currentQuestion.title}
            </Text>
            <Text style={styles.progressText}>
              {currentQuestionIndex + 1} / {questions.length}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.contentArea}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.questionSection}>
            <Text
              style={styles.questionTitle}
              accessible={true}
              accessibilityRole="text"
            >
              {currentQuestion.title}
            </Text>
            <Text
              ref={questionTextRef}
              style={styles.questionContent}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={`${currentQuestion.title}. ${currentQuestion.content}. 답을 입력해주세요`}
            >
              {currentQuestion.content}
            </Text>
          </View>

          {/* 답변 입력 및 액션 버튼 영역 */}
          <View style={styles.actionContainer}>
            <TextInput
              ref={inputRef}
              style={styles.answerInput}
              value={userInput}
              onChangeText={handleUserInput}
              placeholder="답을 입력하세요"
              placeholderTextColor={COLORS.text.tertiary}
              accessible={true}
              accessibilityLabel="답 입력란"
              accessibilityHint="답을 입력한 후 제출 버튼을 눌러주세요"
              returnKeyType="done"
              onSubmitEditing={isLastQuestion ? handleSubmit : handleNext}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.dictationButton,
                isDictating && styles.dictationButtonActive,
              ]}
              onPress={handleDictateAnswer}
              accessible={true}
              accessibilityLabel={
                isDictating ? "음성 입력 중지" : "음성으로 답하기"
              }
              accessibilityRole="button"
            >
              <Text style={styles.dictationButtonText}>
                {isDictating ? "입력 중지..." : "음성으로 답하기"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                isLastQuestion ? styles.submitButton : styles.nextButton,
                !userInput.trim() && styles.submitButtonDisabled,
              ]}
              onPress={isLastQuestion ? handleSubmit : handleNext}
              disabled={!userInput.trim() || isSubmitting}
              accessible={true}
              accessibilityLabel={isLastQuestion ? "채점하기" : "다음 문제"}
              accessibilityRole="button"
            >
              <Text style={styles.nextButtonText}>
                {isLastQuestion ? "채점하기" : "다음 문제"}
              </Text>
            </TouchableOpacity>

            {currentQuestionIndex > 0 && (
              <TouchableOpacity
                style={[styles.actionButton, styles.prevButton]}
                onPress={handlePrevious}
                accessible={true}
                accessibilityLabel="이전 문제"
                accessibilityRole="button"
              >
                <Text style={styles.prevButtonText}>이전 문제</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (isHighContrast: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background.default,
    },
    header: {
      flexDirection: "column",
      alignItems: "stretch",
      paddingBottom: 20,
      paddingHorizontal: 24,
      borderBottomWidth: 3,
      borderBottomColor: isHighContrast ? "#FEC73D" : COLORS.primary.main,
      minHeight: HEADER_MIN_HEIGHT,
    },
    headerTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      height: HEADER_BTN_HEIGHT,
    },
    headerInfo: {
      marginTop: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    quizTitle: {
      fontSize: 26,
      fontWeight: "bold",
      color: COLORS.text.primary,
      flex: 1,
      marginRight: 16,
    },
    progressText: {
      fontSize: 22,
      color: COLORS.text.secondary,
      fontWeight: "600",
    },
    contentArea: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 24,
    },
    questionSection: {
      marginBottom: 32,
    },
    questionTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: COLORS.primary.main,
      marginBottom: 16,
    },
    questionContent: {
      fontSize: 28,
      fontWeight: "600",
      color: COLORS.text.primary,
      lineHeight: 40,
    },
    navigationButtons: {
      // 이 스타일은 더 이상 사용되지 않음
    },
    actionContainer: {
      marginTop: 32,
    },
    inputContainer: {
      marginTop: 24,
    },
    inputSection: {
      flexDirection: "row",
      alignItems: "center",
    },
    answerInput: {
      flex: 1,
      backgroundColor: isHighContrast ? COLORS.background.default : COLORS.background.elevated,
      borderRadius: 12,
      paddingTop: 20,
      padding: 20,
      fontSize: 24,
      color: COLORS.text.primary,
      borderWidth: 3,
      borderColor: COLORS.border.light,
      minHeight: 88,
      marginBottom: 16,
    },
    navButton: {
      flex: 1,
      borderRadius: 12,
      padding: 20,
      minHeight: 72,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 3,
    },
    actionButton: {
      borderRadius: 16,
      padding: 20,
      alignItems: "center",
      minHeight: 80,
      justifyContent: "center",
      borderWidth: 4,
      marginBottom: 12,
    },
    nextButton: {
      backgroundColor: isHighContrast ? COLORS.primary.main : COLORS.primary.main,
      borderColor: isHighContrast ? COLORS.primary.dark : COLORS.primary.dark,
    },
    nextButtonText: {
      color: COLORS.common.white,
      fontSize: 26,
      fontWeight: "bold",
    },
    submitButton: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      minHeight: 72,
      backgroundColor: isHighContrast ? COLORS.status.success : COLORS.status.success,
      borderColor: isHighContrast ? COLORS.status.success : COLORS.status.success,
    },
    submitButtonDisabled: {
      backgroundColor: COLORS.background.elevated,
      borderColor: COLORS.border.main,
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: 22,
      fontWeight: "bold",
      color: COLORS.text.inverse,
    },
    navButtonText: {
      fontSize: 22,
      fontWeight: "bold",
      color: COLORS.text.inverse,
    },
    prevButton: {
      backgroundColor: isHighContrast ? COLORS.primary.main : COLORS.primary.main,
      borderColor: isHighContrast ? COLORS.primary.dark : COLORS.primary.dark,
    },
    prevButtonText: {
      color: COLORS.common.white,
      fontSize: 26,
      fontWeight: "bold",
    },
    dictationButton: {
      backgroundColor: isHighContrast ? COLORS.secondary.lightest : COLORS.secondary.main,
      borderColor: isHighContrast ? COLORS.secondary.dark : COLORS.secondary.dark,
    },
    dictationButtonActive: {
      backgroundColor: COLORS.status.error,
      borderColor: COLORS.status.error,
    },
    dictationButtonText: {
      color: isHighContrast ? COLORS.text.primary : COLORS.text.primary,
      fontSize: 26,
      fontWeight: "bold",
    },
  });
