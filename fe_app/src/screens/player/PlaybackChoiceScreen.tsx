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
} from '../../navigation/navigationTypes';
import { getChaptersByMaterialId } from '../../data/dummyChapters';
import { getQuizzesByChapterId } from '../../data/dummyQuizzes';
import * as Haptics from 'expo-haptics';

export default function PlaybackChoiceScreen() {
  const navigation = useNavigation<PlaybackChoiceScreenNavigationProp>();
  const route = useRoute<PlaybackChoiceScreenRouteProp>();
  const { material } = route.params;

  const chapters = getChaptersByMaterialId(material.id.toString());
  const firstChapter = chapters[0];
  
  // 학습 진도가 1번 이상 있는지 확인 (hasProgress가 true면 최소 1번은 학습함)
  const hasStudied = material.hasProgress;
  
  // 첫 번째 챕터의 퀴즈 가져오기
  const quizzes = firstChapter ? getQuizzesByChapterId(firstChapter.chapterId.toString()) : [];
  const hasQuiz = quizzes.length > 0;
  const showQuizButton = hasStudied && hasQuiz;

  useEffect(() => {
    const announcement = `${material.title}, ${material.currentChapter}챕터. 이어듣기, 처음부터, 저장 목록, 질문 목록, 퀴즈 중 선택하세요.`;
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [material.title, material.currentChapter]);

  const handleFromStart = () => {
    AccessibilityInfo.announceForAccessibility('처음부터 시작합니다.');
    
    if (firstChapter) {
      navigation.navigate('Player', {
        material,
        chapterId: firstChapter.chapterId,
        fromStart: true,
      });
    }
  };

  const handleContinue = () => {
    AccessibilityInfo.announceForAccessibility('이어서 듣기 시작합니다.');
    
    if (firstChapter) {
      navigation.navigate('Player', {
        material,
        chapterId: firstChapter.chapterId,
        fromStart: false,
      });
    }
  };

  const handleBookmarkPress = () => {
    AccessibilityInfo.announceForAccessibility('저장 목록으로 이동합니다');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: 북마크 목록 화면으로 이동
    // navigation.navigate('BookmarkList', { material });
  };

  const handleQuestionPress = () => {
    AccessibilityInfo.announceForAccessibility('질문 목록으로 이동합니다');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: 질문 목록 화면으로 이동
    // navigation.navigate('QuestionList', { material });
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
      navigation.navigate('QuizList', { material, chapterId: firstChapter.chapterId });
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
          {material.title}
        </Text>
        <Text style={styles.chapterText}>
          {material.currentChapter}챕터
        </Text>
      </View>

      {/* 선택 버튼들 */}
      <View style={styles.buttonSection}>
        {/* 이어서 듣기 - 학습 진도가 있을 때만 표시 */}
        {material.hasProgress && (
          <TouchableOpacity
            style={styles.choiceButton}
            onPress={handleContinue}
            accessible={true}
            accessibilityLabel="이어서 듣기, 마지막 위치부터"
            accessibilityRole="button"
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>이어서 듣기</Text>
              <Text style={styles.buttonSubtext}>마지막 위치부터</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 처음부터 듣기 */}
        <TouchableOpacity
          style={styles.choiceButton}
          onPress={handleFromStart}
          accessible={true}
          accessibilityLabel="처음부터 듣기, 챕터 처음부터"
          accessibilityRole="button"
        >
          <View style={styles.buttonContent}>
            <Text style={styles.buttonText}>처음부터 듣기</Text>
            <Text style={styles.buttonSubtext}>챕터 처음부터</Text>
          </View>
        </TouchableOpacity>

        {/* 저장 목록 */}
        <TouchableOpacity
          style={styles.choiceButton}
          onPress={handleBookmarkPress}
          accessible={true}
          accessibilityLabel="저장 목록"
          accessibilityRole="button"
        >
          <View style={styles.buttonContent}>
            <Text style={styles.buttonText}>저장 목록</Text>
            <Text style={styles.buttonSubtext}>북마크 보기</Text>
          </View>
        </TouchableOpacity>

        {/* 질문 목록 */}
        <TouchableOpacity
          style={styles.choiceButton}
          onPress={handleQuestionPress}
          accessible={true}
          accessibilityLabel="질문 목록"
          accessibilityRole="button"
        >
          <View style={styles.buttonContent}>
            <Text style={styles.buttonText}>질문 목록</Text>
            <Text style={styles.buttonSubtext}>이전 질문 보기</Text>
          </View>
        </TouchableOpacity>

        {/* 퀴즈 풀기 - 학습 진도가 있고 퀴즈가 있을 때만 표시 */}
        {showQuizButton && (
          <TouchableOpacity
            style={styles.choiceButton}
            onPress={handleQuizPress}
            accessible={true}
            accessibilityLabel="퀴즈 풀기, 학습 내용 확인"
            accessibilityRole="button"
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>퀴즈 풀기</Text>
              <Text style={styles.buttonSubtext}>학습 내용 확인</Text>
            </View>
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
    marginBottom: 40,
    alignItems: 'center',
  },
  subjectText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  chapterText: {
    fontSize: 20,
    color: '#666666',
  },
  buttonSection: {
    gap: 16,
  },
  choiceButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    minHeight: 88,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  buttonSubtext: {
    fontSize: 18,
    color: '#666666',
    marginLeft: 12,
  },
});