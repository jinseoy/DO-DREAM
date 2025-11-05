import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  AccessibilityInfo,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  BookmarkListScreenNavigationProp,
  BookmarkListScreenRouteProp,
} from '../navigation/navigationTypes';
import {
  getBookmarksByChapter,
  deleteBookmark,
  incrementBookmarkRepeatCount,
} from '../services/bookmarkStorage';
import { Bookmark } from '../types/bookmark';
import { getChapterById } from '../data/dummyChapters';
import ttsService from '../services/ttsService';
import * as Haptics from 'expo-haptics';

export default function BookmarkListScreen() {
  const navigation = useNavigation<BookmarkListScreenNavigationProp>();
  const route = useRoute<BookmarkListScreenRouteProp>();
  const { book, chapterId } = route.params;

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const chapter = getChapterById(chapterId);

  // 북마크 목록 로드
  useEffect(() => {
    loadBookmarks();
  }, []);

  // 화면 진입 시 안내
  useEffect(() => {
    const count = bookmarks.length;
    const announcement = count > 0
      ? `북마크 목록 화면입니다. 저장된 북마크가 ${count}개 있습니다. 각 북마크를 탭하면 해당 섹션으로 이동합니다. 화면 하단의 복습 모드 버튼을 누르면 모든 북마크를 연속으로 재생합니다.`
      : '북마크 목록 화면입니다. 저장된 북마크가 없습니다.';
    
    setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(announcement);
    }, 500);
  }, [bookmarks.length]);

  // 복습 모드 종료 시 정리
  useEffect(() => {
    return () => {
      if (isReviewMode) {
        ttsService.stop();
      }
    };
  }, [isReviewMode]);

  const loadBookmarks = () => {
    const loaded = getBookmarksByChapter(book.id, chapterId);
    setBookmarks(loaded);
  };

  const handleGoBack = () => {
    if (isReviewMode) {
      ttsService.stop();
    }
    AccessibilityInfo.announceForAccessibility('이전 화면으로 돌아갑니다');
    navigation.goBack();
  };

  // 단일 북마크 재생
  const handlePlayBookmark = async (bookmark: Bookmark) => {
    if (!chapter) return;

    try {
      // 재생 횟수 증가
      incrementBookmarkRepeatCount(bookmark.id);

      // TTS 초기화 및 재생
      const section = chapter.sections[bookmark.sectionIndex];
      if (section) {
        ttsService.initialize([section], 0, {
          rate: 1.0,
          playMode: 'single',
          onStart: () => {
            setIsPlaying(true);
          },
          onDone: () => {
            setIsPlaying(false);
            AccessibilityInfo.announceForAccessibility('북마크 재생 완료');
          },
          onError: (error) => {
            console.error('TTS Error:', error);
            setIsPlaying(false);
            AccessibilityInfo.announceForAccessibility('음성 재생 오류가 발생했습니다');
          },
        });

        await ttsService.play();
        AccessibilityInfo.announceForAccessibility(
          `북마크 재생 시작. ${bookmark.sectionIndex + 1}번째 섹션`
        );
        Haptics.selectionAsync();
      }
    } catch (error) {
      console.error('[Bookmark] Play error:', error);
      AccessibilityInfo.announceForAccessibility('북마크 재생에 실패했습니다');
    }
  };

  // 복습 모드 시작
  const handleStartReviewMode = async () => {
    if (bookmarks.length === 0) {
      AccessibilityInfo.announceForAccessibility('북마크가 없습니다');
      return;
    }

    if (!chapter) return;

    setIsReviewMode(true);
    setCurrentReviewIndex(0);

    try {
      // 북마크된 섹션들만 추출
      const bookmarkedSections = bookmarks
        .map(b => chapter.sections[b.sectionIndex])
        .filter(s => s !== undefined);

      if (bookmarkedSections.length === 0) {
        AccessibilityInfo.announceForAccessibility('재생할 북마크가 없습니다');
        setIsReviewMode(false);
        return;
      }

      // TTS 초기화 - 북마크 복습 모드
      ttsService.initialize(bookmarkedSections, 0, {
        rate: 1.0,
        playMode: 'repeat', // 각 북마크를 2회씩 반복
        repeatCount: 2,
        pauseSettings: {
          heading: 3000, // 북마크 간 3초 간격
          paragraph: 3000,
          formula: 3000,
          imageDescription: 3000,
          default: 3000,
        },
        onStart: () => {
          setIsPlaying(true);
        },
        onSectionChange: (index) => {
          setCurrentReviewIndex(index);
          const bookmark = bookmarks[index];
          if (bookmark) {
            // 재생 횟수 증가
            incrementBookmarkRepeatCount(bookmark.id);
            AccessibilityInfo.announceForAccessibility(
              `${index + 1}번째 북마크. ${bookmarks.length}개 중`
            );
          }
        },
        onDone: () => {
          setIsPlaying(false);
          setIsReviewMode(false);
          setCurrentReviewIndex(0);
          AccessibilityInfo.announceForAccessibility('모든 북마크 복습 완료');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (error) => {
          console.error('TTS Error:', error);
          setIsPlaying(false);
          setIsReviewMode(false);
          AccessibilityInfo.announceForAccessibility('음성 재생 오류가 발생했습니다');
        },
      });

      await ttsService.play();
      AccessibilityInfo.announceForAccessibility(
        `북마크 복습 모드 시작. 총 ${bookmarks.length}개의 북마크를 각각 2회씩 반복합니다`
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[ReviewMode] Start error:', error);
      setIsReviewMode(false);
      AccessibilityInfo.announceForAccessibility('복습 모드 시작에 실패했습니다');
    }
  };

  // 복습 모드 중지
  const handleStopReviewMode = async () => {
    await ttsService.stop();
    setIsPlaying(false);
    setIsReviewMode(false);
    setCurrentReviewIndex(0);
    AccessibilityInfo.announceForAccessibility('복습 모드를 중지했습니다');
    Haptics.selectionAsync();
  };

  // 북마크 삭제 확인
  const handleDeleteBookmark = (bookmark: Bookmark) => {
    Alert.alert(
      '북마크 삭제',
      `${bookmark.sectionIndex + 1}번째 섹션의 북마크를 삭제하시겠습니까?`,
      [
        {
          text: '취소',
          style: 'cancel',
          onPress: () => AccessibilityInfo.announceForAccessibility('취소되었습니다'),
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            const success = deleteBookmark(bookmark.id);
            if (success) {
              loadBookmarks();
              AccessibilityInfo.announceForAccessibility('북마크가 삭제되었습니다');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              AccessibilityInfo.announceForAccessibility('북마크 삭제에 실패했습니다');
            }
          },
        },
      ]
    );
  };

  // 북마크를 눌러 해당 섹션으로 이동
  const handleGoToSection = (bookmark: Bookmark) => {
    if (isReviewMode) {
      AccessibilityInfo.announceForAccessibility('복습 모드를 먼저 중지해주세요');
      return;
    }

    // PlayerScreen으로 돌아가면서 해당 섹션으로 이동
    navigation.navigate('Player', {
      book,
      chapterId,
      fromStart: false,
      initialSectionIndex: bookmark.sectionIndex,
    });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  };

  const getSectionTypeLabel = (type: string) => {
    switch (type) {
      case 'heading':
        return '제목';
      case 'paragraph':
        return '본문';
      case 'formula':
        return '수식';
      case 'image_description':
        return '이미지 설명';
      default:
        return '내용';
    }
  };

  if (!chapter) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={styles.errorText}>챕터를 불러올 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          accessible={true}
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
          accessibilityHint="이전 화면으로 돌아갑니다"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>

        <View style={styles.headerTitle}>
          <Text style={styles.titleText}>북마크 목록</Text>
          <Text style={styles.countText}>총 {bookmarks.length}개</Text>
        </View>

        <View style={{ width: 70 }} />
      </View>

      {/* 챕터 정보 */}
      <View style={styles.chapterInfo}>
        <Text style={styles.subjectText}>{book?.subject || '과목 정보 없음'}</Text>
        <Text style={styles.chapterTitle}>{chapter?.title || '챕터 정보 없음'}</Text>
      </View>

      {/* 북마크 리스트 */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.listArea}
        contentContainerStyle={styles.listContent}
      >
        {bookmarks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>저장된 북마크가 없습니다</Text>
            <Text style={styles.emptyHint}>
              {'학습 중 중요한 부분을 북마크하면\n이곳에서 다시 들을 수 있습니다'}
            </Text>
          </View>
        ) : (
          bookmarks.map((bookmark, index) => (
            <View
              key={bookmark.id}
              style={[
                styles.bookmarkCard,
                isReviewMode && index === currentReviewIndex && styles.activeBookmarkCard,
              ]}
            >
              {/* 북마크 정보 */}
              <TouchableOpacity
                style={styles.bookmarkContent}
                onPress={() => handleGoToSection(bookmark)}
                onLongPress={() => handlePlayBookmark(bookmark)}
                accessible={true}
                accessibilityLabel={`북마크 ${index + 1}. 섹션 ${bookmark.sectionIndex + 1}. ${getSectionTypeLabel(bookmark.sectionType || 'paragraph')}. ${bookmark.sectionText || '내용 없음'}`}
                accessibilityRole="button"
                accessibilityHint="탭하면 해당 섹션으로 이동합니다. 길게 누르면 이 섹션만 다시 듣습니다"
              >
                <View style={styles.bookmarkHeader}>
                  <Text style={styles.sectionNumber}>
                    섹션 {bookmark.sectionIndex + 1}
                  </Text>
                  <Text style={styles.sectionType}>
                    {getSectionTypeLabel(bookmark.sectionType || 'paragraph')}
                  </Text>
                </View>

                <Text style={styles.bookmarkText} numberOfLines={3}>
                  {bookmark.sectionText || '내용 없음'}
                </Text>

                <View style={styles.bookmarkFooter}>
                  <Text style={styles.dateText}>
                    {formatDate(bookmark.createdAt)}
                  </Text>
                  {bookmark.repeatCount != null && bookmark.repeatCount > 0 && (
                    <Text style={styles.repeatText}>
                      🔁 {bookmark.repeatCount}회 복습
                    </Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* 삭제 버튼 */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteBookmark(bookmark)}
                accessible={true}
                accessibilityLabel="북마크 삭제"
                accessibilityRole="button"
                accessibilityHint="이 북마크를 삭제합니다"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* 하단 복습 모드 버튼 */}
      {bookmarks.length > 0 && (
        <View style={styles.bottomContainer}>
          {isReviewMode ? (
            <View style={styles.reviewModeActive}>
              <View style={styles.reviewInfo}>
                <Text style={styles.reviewInfoText}>
                  {`🔄 복습 중: ${currentReviewIndex + 1} / ${bookmarks.length}`}
                </Text>
                <Text style={styles.reviewSubText}>
                  각 북마크를 2회씩 반복합니다
                </Text>
              </View>
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStopReviewMode}
                accessible={true}
                accessibilityLabel="복습 모드 중지"
                accessibilityRole="button"
                accessibilityHint="북마크 복습을 중지합니다"
              >
                <Text style={styles.stopButtonText}>⏹ 중지</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={handleStartReviewMode}
              accessible={true}
              accessibilityLabel="북마크 복습 모드 시작"
              accessibilityRole="button"
              accessibilityHint="저장된 모든 북마크를 연속으로 재생합니다"
            >
              <Text style={styles.reviewButtonText}>
                🔄 북마크 복습 모드
              </Text>
              <Text style={styles.reviewButtonSubtext}>
                모든 북마크를 각 2회씩 반복 재생
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 70,
    minHeight: 44,
  },
  backButtonText: {
    fontSize: 20,
    color: '#2196F3',
    fontWeight: '600',
  },
  headerTitle: {
    alignItems: 'center',
  },
  titleText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333333',
  },
  countText: {
    fontSize: 20,
    color: '#666666',
    marginTop: 4,
  },
  chapterInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  subjectText: {
    fontSize: 20,
    color: '#666666',
    marginBottom: 4,
  },
  chapterTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  listArea: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#999999',
    marginBottom: 12,
  },
  emptyHint: {
    fontSize: 22,
    color: '#BDBDBD',
    textAlign: 'center',
    lineHeight: 32,
  },
  errorText: {
    fontSize: 24,
    color: '#666666',
    fontWeight: '600',
  },
  bookmarkCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#FFB300',
    overflow: 'hidden',
    flexDirection: 'row',
    minHeight: 140,
  },
  activeBookmarkCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  bookmarkContent: {
    flex: 1,
    padding: 20,
  },
  bookmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF6F00',
  },
  sectionType: {
    fontSize: 18,
    color: '#666666',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    fontWeight: '600',
  },
  bookmarkText: {
    fontSize: 22,
    lineHeight: 34,
    color: '#333333',
    marginBottom: 16,
    fontWeight: '500',
  },
  bookmarkFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#999999',
  },
  repeatText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '700',
  },
  deleteButton: {
    width: 80,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 140,
  },
  deleteButtonText: {
    fontSize: 36,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  reviewButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#388E3C',
  },
  reviewButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  reviewButtonSubtext: {
    fontSize: 20,
    color: '#E8F5E9',
    fontWeight: '700',
  },
  reviewModeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewInfo: {
    flex: 1,
  },
  reviewInfoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 6,
  },
  reviewSubText: {
    fontSize: 20,
    color: '#666666',
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 28,
    minHeight: 72,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#D32F2F',
  },
  stopButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});