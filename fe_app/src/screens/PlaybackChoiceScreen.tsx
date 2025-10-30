import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  PlaybackChoiceScreenNavigationProp,
  PlaybackChoiceScreenRouteProp 
} from '../navigation/navigationTypes';
import { getChaptersByBookId } from '../data/dummyChapters';
import { getQuizzesByChapterId } from '../data/dummyQuizzes';
import * as Haptics from 'expo-haptics';

export default function PlaybackChoiceScreen() {
  const navigation = useNavigation<PlaybackChoiceScreenNavigationProp>();
  const route = useRoute<PlaybackChoiceScreenRouteProp>();
  const { book } = route.params;

  const chapters = getChaptersByBookId(book.id);
  const firstChapter = chapters[0];
  
  // 학습 진도가 1번 이상 있는지 확인 (hasProgress가 true면 최소 1번은 학습함)
  const hasStudied = book.hasProgress;
  
  // 첫 번째 챕터의 퀴즈 가져오기
  const quizzes = firstChapter ? getQuizzesByChapterId(firstChapter.id) : [];
  const hasQuiz = quizzes.length > 0;
  const showQuizButton = hasStudied && hasQuiz;

  useEffect(() => {
    const announcement = `${book.subject}, ${book.currentChapter}챕터. 이어듣기 또는 처음부터 선택하세요.${
      showQuizButton ? ' 퀴즈도 풀 수 있습니다.' : ''
    }`;
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [book.subject, book.currentChapter, showQuizButton]);

  const handleFromStart = () => {
    AccessibilityInfo.announceForAccessibility('처음부터 시작합니다.');
    
    if (firstChapter) {
      navigation.navigate('Player', {
        book,
        chapterId: firstChapter.id,
        fromStart: true,
      });
    }
  };

  const handleContinue = () => {
    AccessibilityInfo.announceForAccessibility('이어서 듣기 시작합니다.');
    
    if (firstChapter) {
      navigation.navigate('Player', {
        book,
        chapterId: firstChapter.id,
        fromStart: false,
      });
    }
  };

  const handleQuizPress = () => {
    if (!firstChapter) return;

    if (quizzes.length === 1) {
      // 퀴즈가 1개면 바로 퀴즈 화면으로
      AccessibilityInfo.announceForAccessibility('퀴즈를 시작합니다');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('Quiz', { quiz: quizzes[0] });
    } else {
      // 퀴즈가 여러 개면 퀴즈 목록으로
      AccessibilityInfo.announceForAccessibility('퀴즈 목록으로 이동합니다');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('QuizList', { book, chapterId: firstChapter.id });
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 뒤로가기 버튼 */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleGoBack}
        accessible={true}
        accessibilityLabel="뒤로가기"
        accessibilityRole="button"
      >
        <Text style={styles.backButtonText}>← 뒤로</Text>
      </TouchableOpacity>

      {/* 교재 정보 */}
      <View style={styles.infoSection}>
        <Text 
          style={styles.subjectText}
          accessible={true}
          accessibilityRole="header"
        >
          {book.subject}
        </Text>
        <Text style={styles.chapterText}>
          {book.currentChapter}챕터
        </Text>
      </View>

      {/* 선택 버튼들 */}
      <View style={styles.buttonSection}>
        {book.hasProgress && (
          <TouchableOpacity
            style={[styles.choiceButton, styles.continueButton]}
            onPress={handleContinue}
            accessible={true}
            accessibilityLabel="이어서 듣기"
            accessibilityRole="button"
            accessibilityHint="마지막 들었던 위치부터 계속 듣습니다"
          >
            <Text style={styles.buttonText}>이어서 듣기</Text>
            <Text style={styles.buttonSubtext}>마지막 위치부터</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.choiceButton, styles.fromStartButton]}
          onPress={handleFromStart}
          accessible={true}
          accessibilityLabel="처음부터 듣기"
          accessibilityRole="button"
          accessibilityHint="챕터 처음부터 다시 듣습니다"
        >
          <Text style={styles.buttonText}>처음부터 듣기</Text>
          <Text style={styles.buttonSubtext}>챕터 처음부터</Text>
        </TouchableOpacity>

        {/* 퀴즈 버튼 - 학습 진도가 있을 때만 표시 */}
        {showQuizButton && (
          <TouchableOpacity
            style={[styles.choiceButton, styles.quizButton]}
            onPress={handleQuizPress}
            accessible={true}
            accessibilityLabel="퀴즈 풀기"
            accessibilityRole="button"
            accessibilityHint="학습한 내용을 확인하는 퀴즈를 풉니다"
          >
            <Text style={styles.buttonText}>퀴즈 풀기</Text>
            <Text style={styles.buttonSubtext}>학습 내용 확인</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
  },
  backButton: {
    paddingTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 20,
    color: '#2196F3',
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 60,
    alignItems: 'center',
  },
  subjectText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  chapterText: {
    fontSize: 24,
    color: '#666666',
  },
  buttonSection: {
    gap: 20,
  },
  choiceButton: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
    borderWidth: 3,
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#45a049',
  },
  fromStartButton: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
  },
  quizButton: {
    backgroundColor: '#9C27B0',
    borderColor: '#7B1FA2',
  },
  buttonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  buttonSubtext: {
    fontSize: 18,
    color: '#ffffff',
    opacity: 0.9,
  },
});