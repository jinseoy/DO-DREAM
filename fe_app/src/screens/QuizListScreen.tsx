import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  QuizListScreenNavigationProp,
  QuizListScreenRouteProp,
} from '../navigation/navigationTypes';
import { getQuizzesByChapterId } from '../data/dummyQuizzes';
import { getChapterById } from '../data/dummyChapters';
import { Quiz } from '../types/quiz';

export default function QuizListScreen() {
  const navigation = useNavigation<QuizListScreenNavigationProp>();
  const route = useRoute<QuizListScreenRouteProp>();
  const { book, chapterId } = route.params;

  const quizzes = getQuizzesByChapterId(chapterId);
  const chapter = getChapterById(chapterId);

  useEffect(() => {
    const announcement = `${book.subject}, ${chapter?.title} 퀴즈 목록. ${quizzes.length}개의 퀴즈가 있습니다.`;
    AccessibilityInfo.announceForAccessibility(announcement);
  }, []);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleQuizPress = (quiz: Quiz) => {
    AccessibilityInfo.announceForAccessibility(`${quiz.title} 시작합니다.`);
    navigation.navigate('Quiz', { quiz });
  };

  const renderQuizItem = ({ item, index }: { item: Quiz; index: number }) => {
    const quizTypeLabel = item.quizType === 'AI_GENERATED' ? 'AI 생성' : '선생님 제작';
    const accessibilityLabel = `${index + 1}번. ${item.title}. ${quizTypeLabel}. 문제 ${item.questions.length}개.`;

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
                item.quizType === 'AI_GENERATED' ? styles.aiBadge : styles.teacherBadge,
              ]}
            >
              <Text style={styles.typeBadgeText}>{quizTypeLabel}</Text>
            </View>
          </View>
          <Text style={styles.questionCount}>문제 {item.questions.length}개</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (quizzes.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          accessible={true}
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>

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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          accessible={true}
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text
            style={styles.subjectText}
            accessible={true}
            accessibilityRole="header"
          >
            {book.subject}
          </Text>
          <Text style={styles.chapterTitle}>{chapter?.title}</Text>
        </View>
      </View>

      <FlatList
        data={quizzes}
        renderItem={renderQuizItem}
        keyExtractor={(item) => item.id}
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
  },
  subjectText: {
    fontSize: 20,
    color: '#666666',
    marginBottom: 4,
  },
  chapterTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  quizButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    minHeight: 100,
  },
  quizContent: {
    gap: 12,
  },
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  aiBadge: {
    backgroundColor: '#9C27B0',
  },
  teacherBadge: {
    backgroundColor: '#FF9800',
  },
  typeBadgeText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  questionCount: {
    fontSize: 18,
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 24,
    color: '#999999',
    textAlign: 'center',
  },
});