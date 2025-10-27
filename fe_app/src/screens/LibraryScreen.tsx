import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  AccessibilityInfo,
} from 'react-native';
import { dummyBooks, studentName, Book } from '../data/dummyBooks';

export default function LibraryScreen() {
  const handleBookPress = (book: Book) => {
    // TODO: 나중에 네비게이션으로 상세 화면 이동
    console.log('선택한 교재:', book.subject);
    
    // 기록이 있으면 선택 화면으로, 없으면 바로 재생
    if (book.hasProgress) {
      // TODO: 처음부터/이어서 선택 화면으로 이동
      console.log('기록 있음 - 선택 화면으로');
    } else {
      // TODO: 바로 재생 화면으로
      console.log('기록 없음 - 바로 재생');
    }
  };

  const renderBookButton = ({ item, index }: { item: Book; index: number }) => {
    const accessibilityLabel = `${item.subject}, 현재 ${item.currentChapter}챕터, 전체 ${item.totalChapters}챕터 중. ${
      item.hasProgress ? '이어듣기 가능' : '처음부터 시작'
    }`;

    return (
      <TouchableOpacity
        style={styles.bookButton}
        onPress={() => handleBookPress(item)}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityHint="두 번 탭하여 교재를 선택하세요"
      >
        <View style={styles.bookContent}>
          {/* 과목 이름 */}
          <Text style={styles.subjectText}>
            {item.subject}
          </Text>
          
          {/* 현재 챕터 */}
          <Text style={styles.chapterText}>
            현재 {item.currentChapter}챕터
          </Text>

          {/* 기록 표시 (저시력자용 시각 표시) */}
          {item.hasProgress && (
            <View style={styles.progressIndicator}>
              <Text style={styles.progressText}>이어듣기</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 학생 이름 헤더 */}
      <View style={styles.header}>
        <Text 
          style={styles.studentName}
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel={`${studentName} 학생의 서재`}
        >
          {studentName} 학생의 서재
        </Text>
      </View>

      {/* 교재 목록 */}
      <FlatList
        data={dummyBooks}
        renderItem={renderBookButton}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        // 접근성: 리스트임을 명시
        accessible={false} // FlatList 자체는 접근성 컨테이너로 사용 안 함
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
  },
  studentName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333333',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  bookButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    // 터치 영역을 넓게
    minHeight: 88, // 최소 터치 영역 권장 사이즈
  },
  bookContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  chapterText: {
    fontSize: 18,
    color: '#666666',
    marginLeft: 12,
  },
  progressIndicator: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
});