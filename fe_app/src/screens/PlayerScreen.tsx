import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  PlayerScreenNavigationProp,
  PlayerScreenRouteProp
} from '../navigation/navigationTypes';
import { getChapterById } from '../data/dummyChapters';
import * as Haptics from 'expo-haptics';
import { TriggerContext } from '../triggers/TriggerContext';

export default function PlayerScreen() {
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const route = useRoute<PlayerScreenRouteProp>();
  const { book, chapterId, fromStart } = route.params;

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const { setMode, registerPlayPause } = useContext(TriggerContext);

  const chapter = getChapterById(chapterId);

  // 화면 진입/이탈 시 전역 트리거 모드 설정
  useEffect(() => {
    // 이 화면에서는 Magic Tap / Android 볼륨 다운 더블 = 재생/정지
    setMode('playpause');

    // 전역에서 호출될 재생/정지 핸들러 등록
    registerPlayPause(() => handlePlayPause());

    return () => {
      // 화면 떠날 때 원복
      registerPlayPause(null);
      setMode('voice');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chapter) {
      const announcement = `${book.subject}, ${chapter.title}. ${
        fromStart ? '처음부터 시작합니다' : '이어서 듣기를 시작합니다'
      }`;
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, []);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handlePlayPause = () => {
    setIsPlaying((prev) => {
      const next = !prev;
      AccessibilityInfo.announceForAccessibility(next ? '재생' : '일시정지');
      Haptics.selectionAsync();
      return next;
    });
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex((i) => i - 1);
      AccessibilityInfo.announceForAccessibility('이전 문단');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNext = () => {
    if (chapter && currentSectionIndex < chapter.sections.length - 1) {
      setCurrentSectionIndex((i) => i + 1);
      AccessibilityInfo.announceForAccessibility('다음 문단');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleQuestionPress = () => {
    AccessibilityInfo.announceForAccessibility('질문하기 화면으로 이동합니다');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate('Question');
  };

  if (!chapter) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>챕터를 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const currentSection = chapter.sections[currentSectionIndex];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleGoBack}
          accessible
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.subjectText}>{book.subject}</Text>
          <Text style={styles.chapterTitle}>{chapter.title}</Text>
        </View>
      </View>

      {/* 본문 */}
      <ScrollView style={styles.contentArea} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.contentText} accessible accessibilityRole="text">
          {currentSection.text}
        </Text>
        <Text style={styles.progressText}>
          {currentSectionIndex + 1} / {chapter.sections.length}
        </Text>
      </ScrollView>

      {/* 컨트롤 */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, currentSectionIndex === 0 && styles.disabledButton]}
          onPress={handlePrevious}
          disabled={currentSectionIndex === 0}
          accessible
          accessibilityLabel="이전 문단"
          accessibilityRole="button"
          accessibilityHint="이전 문단으로 이동합니다"
        >
          <Text style={styles.controlButtonText}>◀ 이전</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.playButton]}
          onPress={handlePlayPause}
          onLongPress={handleQuestionPress} // iOS 보조 트리거
          accessible
          accessibilityLabel={isPlaying ? '일시정지' : '재생'}
          accessibilityRole="button"
          accessibilityHint="두 손가락 두 번 탭으로도 제어할 수 있습니다"
        >
          <Text style={styles.playButtonText}>{isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            currentSectionIndex === chapter.sections.length - 1 && styles.disabledButton,
          ]}
          onPress={handleNext}
          disabled={currentSectionIndex === chapter.sections.length - 1}
          accessible
          accessibilityLabel="다음 문단"
          accessibilityRole="button"
          accessibilityHint="다음 문단으로 이동합니다"
        >
          <Text style={styles.controlButtonText}>다음 ▶</Text>
        </TouchableOpacity>
      </View>

      {/* 질문하기 버튼 */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.voiceQueryButton}
          onPress={handleQuestionPress}
          accessible
          accessibilityLabel="질문하기"
          accessibilityRole="button"
          accessibilityHint="음성으로 질문할 수 있는 화면으로 이동합니다"
        >
          <Text style={styles.voiceQueryText}>🎤 질문하기</Text>
        </TouchableOpacity>
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
  contentArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentContainer: {
    paddingTop: 40,
    paddingBottom: 40,
  },
  contentText: {
    fontSize: 24,
    lineHeight: 40,
    color: '#333333',
    marginBottom: 24,
  },
  progressText: {
    fontSize: 18,
    color: '#999999',
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  controlButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    minWidth: 100,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.5,
  },
  controlButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  playButton: {
    backgroundColor: '#4CAF50',
    minWidth: 120,
    minHeight: 88,
    justifyContent: 'center',
  },
  playButtonText: {
    fontSize: 36,
    color: '#ffffff',
  },
  bottomButtons: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
  },
  voiceQueryButton: {
    backgroundColor: '#FF9800',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minHeight: 88,
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F57C00',
  },
  voiceQueryText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});