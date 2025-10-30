import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  AccessibilityInfo,
  findNodeHandle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  QuizScreenNavigationProp,
  QuizScreenRouteProp,
} from '../navigation/navigationTypes';
import * as Haptics from 'expo-haptics';
import { TriggerContext } from '../triggers/TriggerContext';

interface Answer {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
}

export default function QuizScreen() {
  const navigation = useNavigation<QuizScreenNavigationProp>();
  const route = useRoute<QuizScreenRouteProp>();
  const { quiz } = route.params;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const { setMode, registerPlayPause } = useContext(TriggerContext);

  // 문제 텍스트의 ref
  const questionTextRef = useRef<Text>(null);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

  // 화면 진입/이탈 시 전역 트리거 모드 설정
  useEffect(() => {
    // 퀴즈 화면에서는 Magic Tap / Android 볼륨 다운 더블 = 다음 문제로
    setMode('playpause');

    // 전역에서 호출될 다음 문제 핸들러 등록
    registerPlayPause(() => handleNext());

    return () => {
      // 화면 떠날 때 원복
      registerPlayPause(null);
      setMode('voice');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOptionId, currentQuestionIndex]);

  useEffect(() => {
    const announcement = `${currentQuestionIndex + 1}번 문제`;
    AccessibilityInfo.announceForAccessibility(announcement);

    // 포커스를 문제 텍스트로 이동
    setTimeout(() => {
      if (questionTextRef.current) {
        const reactTag = findNodeHandle(questionTextRef.current);
        if (reactTag) {
          AccessibilityInfo.setAccessibilityFocus(reactTag);
        }
      }
    }, 500); // 약간의 딜레이를 줘서 화면 전환 후 포커스 이동
  }, [currentQuestionIndex]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleOptionPress = (optionId: string, optionText: string) => {
    setSelectedOptionId(optionId);
    AccessibilityInfo.announceForAccessibility(`${optionText} 선택됨`);
    Haptics.selectionAsync();
  };

  const handleNext = () => {
    if (!selectedOptionId) {
      AccessibilityInfo.announceForAccessibility('답을 먼저 선택해주세요.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // 현재 문제의 답안 저장
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
        // 마지막 문제 - 결과 화면으로 이동
        const finalScore = updatedAnswers.filter((a) => a.isCorrect).length;

        AccessibilityInfo.announceForAccessibility(
          '모든 문제를 완료했습니다. 채점 결과를 확인합니다.'
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        navigation.navigate('QuizResult', {
          quiz: quiz,
          score: finalScore,
          totalQuestions: quiz.questions.length,
          answers: updatedAnswers,
        });
      } else {
        // 다음 문제로
        setCurrentQuestionIndex((prev) => prev + 1);
        setSelectedOptionId(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      // 이전 문제로 돌아가면 이전 답안 불러오기
      const previousAnswer = answers[currentQuestionIndex - 1];
      if (previousAnswer) {
        setSelectedOptionId(previousAnswer.selectedOptionId);
      } else {
        setSelectedOptionId(null);
      }

      // 이전 답안 제거
      setAnswers((prev) => prev.slice(0, -1));

      setCurrentQuestionIndex((prev) => prev - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Text>문제를 불러올 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
          <Text style={styles.quizTitle}>{quiz.title}</Text>
          <Text style={styles.progressText}>
            {currentQuestionIndex + 1} / {quiz.questions.length}
          </Text>
        </View>
      </View>

      {/* 문제 영역 */}
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
            accessibilityLabel={`${currentQuestion.questionText}`}
          >
            {currentQuestion.questionText}
          </Text>
        </View>

        {/* 선택지 */}
        <View style={styles.optionsSection}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOptionId === option.id;

            const buttonStyle: any[] = [styles.optionButton];
            const textStyle: any[] = [styles.optionText];
            let accessibilityLabel = `${index + 1}번. ${option.optionText}`;

            if (isSelected) {
              buttonStyle.push(styles.optionButtonSelected);
              textStyle.push(styles.optionTextSelected);
              accessibilityLabel += '. 선택됨';
            }

            return (
              <TouchableOpacity
                key={option.id}
                style={buttonStyle}
                onPress={() => handleOptionPress(option.id, option.optionText)}
                accessible={true}
                accessibilityLabel={accessibilityLabel}
                accessibilityRole="button"
                accessibilityHint="두 번 탭하여 선택하세요"
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionNumber}>
                    <Text style={textStyle}>{index + 1}</Text>
                  </View>
                  <Text style={textStyle}>{option.optionText}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
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
            accessibilityLabel={isLastQuestion ? '채점하기' : '다음 문제'}
            accessibilityRole="button"
            accessibilityHint={
              selectedOptionId
                ? '두 손가락 두 번 탭으로도 다음으로 넘어갈 수 있습니다'
                : '답을 먼저 선택해주세요'
            }
          >
            <Text style={styles.navButtonText}>
              {isLastQuestion ? '채점하기 ✓' : '다음 ▶'}
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
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 20,
    color: '#2196F3',
    fontWeight: '600',
  },
  headerInfo: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
  },
  progressText: {
    fontSize: 20,
    color: '#666666',
    fontWeight: '600',
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
    color: '#666666',
    marginBottom: 12,
  },
  questionText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333333',
    lineHeight: 40,
  },
  optionsSection: {
    gap: 16,
  },
  optionButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    borderWidth: 3,
    borderColor: '#e0e0e0',
    minHeight: 88,
    justifyContent: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  optionNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 22,
    color: '#333333',
    flex: 1,
    lineHeight: 32,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: '#2196F3',
  },
  bottomButtons: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minHeight: 88,
    justifyContent: 'center',
    borderWidth: 3,
  },
  prevButton: {
    backgroundColor: '#9E9E9E',
    borderColor: '#757575',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#45a049',
  },
  nextButtonDisabled: {
    backgroundColor: '#cccccc',
    borderColor: '#999999',
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});