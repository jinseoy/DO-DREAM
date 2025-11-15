import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  AccessibilityInfo,
  findNodeHandle,
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

interface Answer {
  questionId: number;
  selectedOptionId: number;
  isCorrect: boolean;
}

export default function QuizScreen() {
  const navigation = useNavigation<QuizScreenNavigationProp>();
  const route = useRoute<QuizScreenRouteProp>();
  const { quiz } = route.params;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isTalkBackEnabled, setIsTalkBackEnabled] = useState<boolean>(false);

  const {
    setMode,
    registerPlayPause,
    setCurrentScreenId,
    registerVoiceHandlers,
  } = useContext(TriggerContext);

  const questionTextRef = useRef<Text>(null);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

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
    registerPlayPause(() => handleNext());

    return () => {
      registerPlayPause(null);
      setMode("voice");
      Speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOptionId, currentQuestionIndex]);

  const readQuestionAndOptions = async () => {
    if (isTalkBackEnabled) {
      console.log("TalkBack 활성화 - TTS 비활성화");
      return;
    }

    await Speech.stop();

    try {
      console.log("=== TTS 읽기 시작 ===");

      const questionText = `${currentQuestionIndex + 1}번 문제. ${
        currentQuestion.questionText
      }`;
      console.log("읽기 1:", questionText);

      await new Promise<void>((resolve) => {
        Speech.speak(questionText, {
          language: "ko-KR",
          pitch: 1.0,
          rate: 1.1,
          onDone: () => {
            console.log("문제 읽기 완료");
            resolve();
          },
          onError: (error) => {
            console.error("문제 읽기 오류:", error);
            resolve();
          },
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      console.log("읽기 2: 보기");
      await new Promise<void>((resolve) => {
        Speech.speak("보기", {
          language: "ko-KR",
          pitch: 1.0,
          rate: 1.1,
          onDone: () => {
            console.log("보기 읽기 완료");
            resolve();
          },
          onError: (error) => {
            console.error("보기 읽기 오류:", error);
            resolve();
          },
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      for (const [index, option] of currentQuestion.options.entries()) {
        const optionText = `${index + 1}번, ${option.optionText}`;
        console.log(`읽기 ${index + 3}:`, optionText);

        await new Promise<void>((resolve) => {
          Speech.speak(optionText, {
            language: "ko-KR",
            pitch: 1.0,
            rate: 1.1,
            onDone: () => {
              console.log(`보기 ${index + 1} 읽기 완료`);
              resolve();
            },
            onError: (error) => {
              console.error(`보기 ${index + 1} 읽기 오류:`, error);
              resolve();
            },
          });
        });

        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      console.log("읽기 마지막: 답을 선택해주세요");
      await new Promise<void>((resolve) => {
        Speech.speak("답을 선택해주세요", {
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
    readQuestionAndOptions();

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

  const handleOptionPress = (optionId: number, optionNumber: number) => {
    setSelectedOptionId(optionId);
    Haptics.selectionAsync();

    if (!isTalkBackEnabled) {
      const announcement = `${optionNumber}번 선택됨`;
      Speech.speak(announcement, {
        language: "ko-KR",
        pitch: 1.0,
        rate: 1.2,
      });
    }
  };

  const handleNext = () => {
    if (!selectedOptionId) {
      const announcement = "답을 먼저 선택해주세요";

      if (isTalkBackEnabled) {
        AccessibilityInfo.announceForAccessibility(announcement);
      } else {
        Speech.speak(announcement, {
          language: "ko-KR",
          pitch: 1.0,
          rate: 1.2,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const selectedOption = currentQuestion.options.find(
      (opt) => opt.id === selectedOptionId
    );

    if (selectedOption) {
      const newAnswer: Answer = {
        questionId: currentQuestion.id,
        selectedOptionId: selectedOptionId,
        isCorrect: selectedOption.isCorrect,
      };

      const updatedAnswers = [...answers, newAnswer];
      setAnswers(updatedAnswers);

      if (isLastQuestion) {
        const finalScore = updatedAnswers.filter((a) => a.isCorrect).length;
        const announcement = "모든 문제를 완료했습니다. 채점 결과를 확인합니다";

        if (isTalkBackEnabled) {
          AccessibilityInfo.announceForAccessibility(announcement);
        } else {
          Speech.speak(announcement, {
            language: "ko-KR",
            pitch: 1.0,
            rate: 1.2,
          });
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        setTimeout(() => {
          navigation.navigate("QuizResult", {
            quiz: quiz,
            score: finalScore,
            totalQuestions: quiz.questions.length,
            answers: updatedAnswers,
          });
        }, 1500);
      } else {
        setCurrentQuestionIndex((prev) => prev + 1);
        setSelectedOptionId(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handlePrevious = () => {
    Speech.stop();

    if (currentQuestionIndex > 0) {
      const previousAnswer = answers[currentQuestionIndex - 1];
      if (previousAnswer) {
        setSelectedOptionId(previousAnswer.selectedOptionId);
      } else {
        setSelectedOptionId(null);
      }

      setCurrentQuestionIndex((prev) => prev - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleQuizVoiceRaw = (spoken: string) => {
    const raw = (spoken || "").trim().toLowerCase();
    if (!raw) return;

    const noSpace = raw.replace(/\s+/g, "");
    console.log("[VoiceCommands][Quiz] rawText:", raw);

    if (
      noSpace.includes("뒤로가기") ||
      noSpace.includes("뒤로가") ||
      noSpace.includes("이전화면") ||
      noSpace.includes("이전화면으로")
    ) {
      handleGoBack();
      return;
    }

    if (
      noSpace.includes("다시읽어") ||
      noSpace.includes("다시읽어줘") ||
      noSpace.includes("문제다시") ||
      noSpace.includes("문제읽어줘") ||
      noSpace.includes("다시들려줘")
    ) {
      readQuestionAndOptions();
      return;
    }

    if (
      noSpace.includes("다음문제") ||
      noSpace.includes("다음문제로") ||
      noSpace.includes("다음문제요") ||
      noSpace.includes("다음") ||
      noSpace.includes("넘어가") ||
      noSpace.includes("넘어가줘")
    ) {
      handleNext();
      return;
    }

    if (
      noSpace.includes("채점") ||
      noSpace.includes("결과보기") ||
      noSpace.includes("결과확인") ||
      noSpace.includes("정답확인")
    ) {
      handleNext();
      return;
    }

    if (
      noSpace.includes("이전문제") ||
      noSpace.includes("앞문제") ||
      noSpace.includes("전문제") ||
      noSpace.includes("이전으로") ||
      noSpace.includes("이전")
    ) {
      handlePrevious();
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

    let targetOptionIndex: number | null = null;

    const numMatch = noSpace.match(/([0-9]+)/);
    if (numMatch) {
      const n = parseInt(numMatch[1], 10);
      if (!isNaN(n) && n >= 1 && n <= currentQuestion.options.length) {
        targetOptionIndex = n - 1;
      }
    }

    if (targetOptionIndex === null) {
      (Object.keys(hanToNum) as (keyof typeof hanToNum)[]).forEach((ch) => {
        if (targetOptionIndex !== null) return;
        if (
          noSpace.includes(ch + "번보기") ||
          noSpace.includes(ch + "번선택") ||
          noSpace.includes(ch + "번답") ||
          noSpace.includes(ch + "번") ||
          noSpace.includes(ch + "번째보기") ||
          noSpace.includes(ch + "번째")
        ) {
          const n = hanToNum[ch];
          if (n >= 1 && n <= currentQuestion.options.length) {
            targetOptionIndex = n - 1;
          }
        }
      });
    }

    if (targetOptionIndex !== null) {
      const option = currentQuestion.options[targetOptionIndex];
      handleOptionPress(option.id, targetOptionIndex + 1);
      return;
    }

    console.log("[VoiceCommands][Quiz] 처리할 수 없는 명령:", spoken);
    AccessibilityInfo.announceForAccessibility(
      "이 화면에서 사용할 수 없는 음성 명령입니다. 1번, 2번처럼 보기 번호를 말하거나, 다음 문제, 이전 문제, 문제 다시, 채점하기, 뒤로 가기처럼 말해 주세요."
    );
  };

  useEffect(() => {
    setCurrentScreenId("Quiz");

    registerVoiceHandlers("Quiz", {
      next: handleNext,
      prev: handlePrevious,
      goBack: handleGoBack,
      rawText: handleQuizVoiceRaw,
    });

    return () => {
      registerVoiceHandlers("Quiz", {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const msg =
      "퀴즈 화면입니다. 상단의 음성 명령 버튼을 두 번 탭한 후, 1번, 2번처럼 보기 번호를 말하거나, 다음 문제, 이전 문제, 문제 다시, 채점하기, 뒤로 가기라고 말하면 해당 기능이 실행됩니다.";
    const timer = setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(msg);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={handleGoBack}
            accessible={true}
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
            accessibilityHint="이전 화면으로 돌아갑니다"
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← 뒤로</Text>
          </TouchableOpacity>

          <VoiceCommandButton
            accessibilityHint="두 번 탭한 후, 1번, 2번처럼 보기 번호를 말하거나, 다음 문제, 이전 문제, 문제 다시, 채점하기, 뒤로 가기와 같은 명령을 말씀하세요"
            onBeforeListen={() => Speech.stop()}
          />
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.quizTitle}>{quiz.title}</Text>
          <Text style={styles.progressText}>
            {currentQuestionIndex + 1} / {quiz.questions.length}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.contentArea}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.questionSection}>
          <Text
            style={styles.questionNumber}
            accessible={true}
            accessibilityRole="text"
          >
            문제 {currentQuestionIndex + 1}
          </Text>
          <Text
            ref={questionTextRef}
            style={styles.questionText}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={`${currentQuestionIndex + 1}번 문제. ${
              currentQuestion.questionText
            }. 보기. ${currentQuestion.options
              .map((opt, idx) => `${idx + 1}번, ${opt.optionText}`)
              .join(". ")}. 답을 선택해주세요`}
          >
            {currentQuestion.questionText}
          </Text>
        </View>

        <View style={styles.optionsSection} accessible={false}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOptionId === option.id;

            const buttonStyle: any[] = [styles.optionButton];
            const textStyle: any[] = [styles.optionText];

            if (isSelected) {
              buttonStyle.push(styles.optionButtonSelected);
              textStyle.push(styles.optionTextSelected);
            }

            const accessibilityLabel = `${index + 1}번, ${option.optionText}`;

            return (
              <TouchableOpacity
                key={option.id}
                style={buttonStyle}
                onPress={() => handleOptionPress(option.id, index + 1)}
                accessible={true}
                accessibilityLabel={accessibilityLabel}
                accessibilityRole="button"
                accessibilityHint=""
                accessibilityState={{ selected: isSelected }}
                accessibilityLiveRegion="none"
              >
                <View
                  style={styles.optionContent}
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                >
                  <View
                    style={styles.optionNumber}
                    accessible={false}
                    importantForAccessibility="no"
                  >
                    <Text
                      style={textStyle}
                      accessible={false}
                      importantForAccessibility="no"
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <Text
                    style={textStyle}
                    accessible={false}
                    importantForAccessibility="no"
                  >
                    {option.optionText}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.bottomButtons}>
        <View style={styles.navigationButtons}>
          {currentQuestionIndex > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.prevButton]}
              onPress={handlePrevious}
              accessible={true}
              accessibilityLabel="이전 문제"
              accessibilityRole="button"
              accessibilityHint="이전 문제로 돌아갑니다"
            >
              <Text style={styles.navButtonText}>◀ 이전</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.navButton,
              styles.nextButton,
              !selectedOptionId && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!selectedOptionId}
            accessible={true}
            accessibilityLabel={isLastQuestion ? "채점하기" : "다음 문제"}
            accessibilityRole="button"
            accessibilityHint={
              selectedOptionId
                ? "두 손가락 두 번 탭으로도 다음으로 넘어갈 수 있습니다"
                : "답을 먼저 선택해주세요"
            }
          >
            <Text style={styles.navButtonText}>
              {isLastQuestion ? "채점하기 ✓" : "다음 ▶"}
            </Text>
          </TouchableOpacity>
        </View>
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
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333333",
    flex: 1,
  },
  progressText: {
    fontSize: 20,
    color: "#666666",
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
  questionNumber: {
    fontSize: 18,
    color: "#666666",
    marginBottom: 12,
  },
  questionText: {
    fontSize: 28,
    fontWeight: "600",
    color: "#333333",
    lineHeight: 40,
  },
  optionsSection: {
    gap: 16,
  },
  optionButton: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 20,
    borderWidth: 3,
    borderColor: "#e0e0e0",
    minHeight: 88,
    justifyContent: "center",
  },
  optionButtonSelected: {
    backgroundColor: "#E3F2FD",
    borderColor: "#2196F3",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  optionNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: {
    fontSize: 22,
    color: "#333333",
    flex: 1,
    lineHeight: 32,
  },
  optionTextSelected: {
    fontWeight: "600",
    color: "#2196F3",
  },
  bottomButtons: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  navigationButtons: {
    flexDirection: "row",
    gap: 12,
  },
  navButton: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    minHeight: 88,
    justifyContent: "center",
    borderWidth: 3,
  },
  prevButton: {
    backgroundColor: "#9E9E9E",
    borderColor: "#757575",
  },
  nextButton: {
    backgroundColor: "#4CAF50",
    borderColor: "#45a049",
  },
  nextButtonDisabled: {
    backgroundColor: "#cccccc",
    borderColor: "#999999",
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
  },
});