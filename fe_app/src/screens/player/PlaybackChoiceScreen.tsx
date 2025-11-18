import React, {
  useEffect,
  useContext,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  PlaybackChoiceScreenNavigationProp,
  PlaybackChoiceScreenRouteProp,
} from "../../navigation/navigationTypes";
import * as Haptics from "expo-haptics";
import { TriggerContext } from "../../triggers/TriggerContext";
import VoiceCommandButton from "../../components/VoiceCommandButton";
import BackButton from "../../components/BackButton";
import SettingsButton from "../../components/SettingsButton";
import { commonStyles } from "../../styles/commonStyles";
import ChoiceButton from "../../components/ChoiceButton";
import { buildChaptersFromMaterialJson } from "../../utils/materialJsonMapper";
import type { Chapter } from "../../types/chapter";
import { fetchMaterialProgress } from "../../api/progressApi";
import type { MaterialProgress } from "../../types/api/progressApiTypes";
import { COLORS } from "../../constants/colors";

export default function PlaybackChoiceScreen() {
  const navigation = useNavigation<PlaybackChoiceScreenNavigationProp>();
  const route = useRoute<PlaybackChoiceScreenRouteProp>();
  const { material } = route.params;

  // 백엔드에서 조회한 진행률 데이터
  const [progressData, setProgressData] = useState<MaterialProgress | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  // 챕터 선택을 위한 현재 인덱스
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);

  // JSON → Chapter[] 변환
  const chapters: Chapter[] = useMemo(() => {
    const anyMaterial: any = material;
    const json = anyMaterial?.json;
    if (json && Array.isArray(json.chapters)) {
      return buildChaptersFromMaterialJson(material.id, json);
    }
    return [];
  }, [material]);

  const firstChapter = chapters[0] ?? null;
  const hasStudied = material.hasProgress;

  // 퀴즈는 나중에: 지금은 항상 false
  const hasQuiz = false;
  const showQuizButton = hasStudied && hasQuiz;

  const { setCurrentScreenId, registerVoiceHandlers } =
    useContext(TriggerContext);

  // 화면 진입 시 백엔드에서 진행률 조회
  useEffect(() => {
    const loadProgress = async () => {
      try {
        setIsLoadingProgress(true);
        const response = await fetchMaterialProgress(material.id);
        console.log("[PlaybackChoiceScreen] 진행률 조회 성공:", response.data);
        setProgressData(response.data);
      } catch (error) {
        console.error("[PlaybackChoiceScreen] 진행률 조회 실패:", error);
        // 에러가 발생해도 화면은 정상적으로 표시
        setProgressData(null);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadProgress();
  }, [material.id]);

  useEffect(() => {
    const announcement = `${material.title}, ${material.currentChapter}챕터. 이어듣기, 처음부터, 저장 목록, 질문 목록, 설정, 퀴즈 중 선택하세요. 상단의 음성 명령 버튼을 두 번 탭하고, 이어서 듣기, 처음부터, 다음 챕터, 이전 챕터, 이 챕터 듣기, 저장 목록, 질문 목록, 설정, 퀴즈 풀기, 뒤로 가기처럼 말할 수 있습니다.`;
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [material.title, material.currentChapter]);

  const handleFromStart = useCallback(() => {
    if (chapters.length === 0) {
      AccessibilityInfo.announceForAccessibility(
        "이 교재의 내용을 불러오지 못했습니다."
      );
      return;
    }

    const selectedChapter = chapters[currentChapterIndex];
    if (!selectedChapter) {
      AccessibilityInfo.announceForAccessibility("챕터를 선택할 수 없습니다.");
      return;
    }

    AccessibilityInfo.announceForAccessibility(
      `${selectedChapter.title} 챕터를 처음부터 시작합니다.`
    );

    navigation.navigate("Player", {
      material,
      chapterId: selectedChapter.chapterId,
      fromStart: true,
      initialSectionIndex: 0,
    });
  }, [chapters, currentChapterIndex, material, navigation]);

  const handleContinue = useCallback(() => {
    if (chapters.length === 0) {
      AccessibilityInfo.announceForAccessibility(
        "이 교재의 내용을 불러오지 못했습니다."
      );
      return;
    }

    const selectedChapter = chapters[currentChapterIndex];
    if (!selectedChapter) {
      AccessibilityInfo.announceForAccessibility("챕터를 선택할 수 없습니다.");
      return;
    }

    AccessibilityInfo.announceForAccessibility(
      `${selectedChapter.title} 챕터를 이어서 듣기 시작합니다.`
    );

    navigation.navigate("Player", {
      material,
      chapterId: selectedChapter.chapterId,
      fromStart: false,
    });
  }, [chapters, currentChapterIndex, material, navigation]);

  const handleBookmarkPress = useCallback(() => {
    if (!firstChapter) {
      AccessibilityInfo.announceForAccessibility(
        "이 교재의 북마크를 불러오지 못했습니다."
      );
      return;
    }

    AccessibilityInfo.announceForAccessibility("저장 목록으로 이동합니다");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    navigation.navigate("BookmarkList", {
      material,
      chapterId: firstChapter.chapterId,
    });
  }, [firstChapter, material, navigation]);

  const handleQuestionPress = useCallback(() => {
    AccessibilityInfo.announceForAccessibility("질문 목록으로 이동합니다");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    navigation.navigate("QuestionList", {
      material,
    });
  }, [material, navigation]);

  const handleQuizPress = useCallback(() => {
    AccessibilityInfo.announceForAccessibility(
      "이 교재에서는 퀴즈 기능이 아직 준비 중입니다."
    );
  }, []);

  // 선택된 챕터로 이동 (처음부터 시작)
  const handleGoToSelectedChapter = useCallback(() => {
    if (chapters.length === 0) {
      AccessibilityInfo.announceForAccessibility(
        "이 교재의 내용을 불러오지 못했습니다."
      );
      return;
    }

    const selectedChapter = chapters[currentChapterIndex];
    if (!selectedChapter) {
      AccessibilityInfo.announceForAccessibility("챕터를 선택할 수 없습니다.");
      return;
    }

    AccessibilityInfo.announceForAccessibility(
      `${selectedChapter.title} 챕터를 처음부터 시작합니다.`
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    navigation.navigate("Player", {
      material,
      chapterId: selectedChapter.chapterId,
      fromStart: true,
      initialSectionIndex: 0,
    });
  }, [chapters, currentChapterIndex, material, navigation]);

  const handleSettingsPress = useCallback(() => {
    AccessibilityInfo.announceForAccessibility("설정 화면으로 이동합니다");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    navigation.navigate("Settings");
  }, [navigation]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // 챕터 이전/다음 네비게이션
  const handlePrevChapter = useCallback(() => {
    if (chapters.length === 0) return;

    setCurrentChapterIndex((prev) => {
      const newIndex = prev > 0 ? prev - 1 : chapters.length - 1;
      const chapter = chapters[newIndex];

      // 완료 상태 확인
      const isCompleted = progressData?.chapterProgress?.[newIndex]?.progressPercentage === 100;
      const statusText = isCompleted ? "완료" : "미완료";

      AccessibilityInfo.announceForAccessibility(
        `${chapter?.title || '알 수 없음'}, ${statusText}`
      );
      return newIndex;
    });
  }, [chapters, progressData]);

  const handleNextChapter = useCallback(() => {
    if (chapters.length === 0) return;

    setCurrentChapterIndex((prev) => {
      const newIndex = prev < chapters.length - 1 ? prev + 1 : 0;
      const chapter = chapters[newIndex];

      // 완료 상태 확인
      const isCompleted = progressData?.chapterProgress?.[newIndex]?.progressPercentage === 100;
      const statusText = isCompleted ? "완료" : "미완료";

      AccessibilityInfo.announceForAccessibility(
        `${chapter?.title || '알 수 없음'}, ${statusText}`
      );
      return newIndex;
    });
  }, [chapters, progressData]);

  // 🎙 PlaybackChoice 전용 음성 명령(rawText) 처리
  const handlePlaybackVoiceRaw = useCallback(
    (spoken: string) => {
      const t = spoken.trim().toLowerCase();

      // 이어서 듣기
      if (
        t.includes("이어서") ||
        t.includes("이어 듣기") ||
        t.includes("이어듣기") ||
        t.includes("계속 듣기") ||
        t.includes("계속듣기")
      ) {
        if (material.hasProgress) {
          handleContinue();
        } else {
          AccessibilityInfo.announceForAccessibility(
            "아직 학습 기록이 없습니다. 처음부터 듣기를 사용해 주세요."
          );
        }
        return;
      }

      // 처음부터 듣기
      if (
        t.includes("처음") ||
        t.includes("처음부터") ||
        t.includes("처음 부터") ||
        t.includes("맨 처음") ||
        t.includes("처음부터 듣기")
      ) {
        handleFromStart();
        return;
      }

      // 저장 목록
      if (
        t.includes("저장 목록") ||
        t.includes("저장목록") ||
        t.includes("북마크 목록") ||
        t.includes("북마크목록") ||
        (t.includes("저장") && t.includes("목록"))
      ) {
        handleBookmarkPress();
        return;
      }

      // 질문 목록
      if (
        t.includes("질문 목록") ||
        t.includes("질문목록") ||
        (t.includes("질문") && t.includes("목록")) ||
        t.includes("질문 보기") ||
        t.includes("질문보기")
      ) {
        handleQuestionPress();
        return;
      }

      // 챕터 이동 (음성 명령으로 선택된 챕터로 이동)
      if (
        t.includes("이 챕터") ||
        t.includes("현재 챕터") ||
        t.includes("선택한 챕터") ||
        t.includes("챕터 시작") ||
        t.includes("이 챕터 듣기")
      ) {
        handleGoToSelectedChapter();
        return;
      }

      // 다음 챕터 보기
      if (
        t.includes("다음 챕터") ||
        t.includes("챕터 다음")
      ) {
        handleNextChapter();
        return;
      }

      // 이전 챕터 보기
      if (
        t.includes("이전 챕터") ||
        t.includes("챕터 이전")
      ) {
        handlePrevChapter();
        return;
      }

      // 퀴즈 풀기
      if (
        t.includes("퀴즈 풀") ||
        t.includes("문제 풀") ||
        t.includes("퀴즈 시작") ||
        t.includes("퀴즈 보기")
      ) {
        if (showQuizButton) {
          handleQuizPress();
        } else {
          AccessibilityInfo.announceForAccessibility(
            "이 교재에서는 바로 풀 수 있는 퀴즈가 없습니다."
          );
        }
        return;
      }

      // 그 외: 안내
      console.log(
        "[VoiceCommands][PlaybackChoice] 처리할 수 없는 rawText:",
        spoken
      );
      AccessibilityInfo.announceForAccessibility(
        "이 화면에서 사용할 수 없는 음성 명령입니다. 이어서 듣기, 처음부터, 저장 목록, 질문 목록, 다음 챕터, 이전 챕터, 이 챕터 듣기, 설정, 퀴즈 풀기, 뒤로 가기처럼 말해 주세요."
      );
    },
    [
      material.hasProgress,
      handleContinue,
      handleFromStart,
      handleBookmarkPress,
      handleQuestionPress,
      handleGoToSelectedChapter,
      handleNextChapter,
      handlePrevChapter,
      handleQuizPress,
      showQuizButton,
    ]
  );

  // 🔧 TriggerContext와 음성 명령 핸들러 등록
  useEffect(() => {
    setCurrentScreenId("PlaybackChoice");

    registerVoiceHandlers("PlaybackChoice", {
      goBack: handleGoBack,
      openSettings: handleSettingsPress,
      openQuiz: showQuizButton ? handleQuizPress : undefined,
      rawText: handlePlaybackVoiceRaw,
    });

    return () => {
      registerVoiceHandlers("PlaybackChoice", {});
    };
  }, [
    setCurrentScreenId,
    registerVoiceHandlers,
    handleGoBack,
    handleSettingsPress,
    handleQuizPress,
    handlePlaybackVoiceRaw,
    showQuizButton,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* 상단: 뒤로가기 + 설정 + 음성 명령 버튼 */}
      <View style={[commonStyles.headerContainer, styles.header]}>
        <BackButton
          onPress={handleGoBack}
          style={commonStyles.headerBackButton}
        />

        <View style={styles.headerRight}>
          <SettingsButton
            onPress={handleSettingsPress}
            showLabel={true}
            accessibilityHint="재생 속도 및 화면 설정을 변경합니다."
          />

          <VoiceCommandButton
            style={commonStyles.headerVoiceButton}
            accessibilityHint="두 번 탭한 후, 이어서 듣기, 처음부터, 다음 챕터, 이전 챕터, 이 챕터 듣기, 저장 목록, 질문 목록, 설정, 퀴즈 풀기, 뒤로 가기와 같은 명령을 말씀하세요"
          />
        </View>
      </View>

      {/* 스크롤 가능한 콘텐츠 영역 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        accessible={false}
      >
        {/* 교재 정보 */}
        <View style={styles.infoSection}>
          <Text
            style={styles.subjectText}
            accessible={true}
            accessibilityRole="header"
          >
            {material.title}
          </Text>
          {/* <Text style={styles.chapterText}>{material.currentChapter}챕터</Text> */}
        </View>

        {/* 챕터 선택 UI */}
        {chapters.length > 0 && (
          <View style={styles.chapterSelectSection}>
             <View style={styles.chapterInfoCompact}>
                {chapters[currentChapterIndex] && (
                  <>
                    <Text
                      style={styles.chapterTitleCompact}
                      accessible
                      accessibilityLabel={`현재 선택: ${chapters[currentChapterIndex].title}`}
                    >
                      {chapters[currentChapterIndex].title}
                    </Text>
                    <Text
                      style={styles.chapterStatusText}
                      accessible
                      accessibilityLabel={
                        progressData?.chapterProgress?.[currentChapterIndex]?.progressPercentage === 100
                          ? "학습 완료"
                          : "미완료"
                      }
                    >
                      {progressData?.chapterProgress?.[currentChapterIndex]?.progressPercentage === 100
                        ? "✓ 완료"
                        : "○ 미완료"}
                    </Text>
                  </>
                )}
              </View>
            <View style={styles.chapterNavigationContainer}>
              <TouchableOpacity
                onPress={handlePrevChapter}
                style={styles.navButton}
                accessible
                accessibilityLabel={`이전 챕터, ${currentChapterIndex > 0 ? chapters[currentChapterIndex - 1]?.title : chapters[chapters.length - 1]?.title}`}
                accessibilityRole="button"
              >
                <Text style={styles.navButtonText}>◀</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNextChapter}
                style={styles.navButton}
                accessible
                accessibilityLabel={`다음 챕터, ${currentChapterIndex < chapters.length - 1 ? chapters[currentChapterIndex + 1]?.title : chapters[0]?.title}`}
                accessibilityRole="button"
              >
                <Text style={styles.navButtonText}>▶</Text>
              </TouchableOpacity>
            </View>

            <Text
              style={styles.chapterIndexText}
              accessible
              accessibilityLabel={`${currentChapterIndex + 1}번째 챕터, 전체 ${chapters.length}개 중`}
            >
              {currentChapterIndex + 1} / {chapters.length}
            </Text>
          </View>
        )}

        {/* 전체 진행률 표시 */}
        {/* {!isLoadingProgress && progressData && (
          <View style={styles.progressSection}>
            <Text style={styles.progressTitle}>전체 진행률</Text>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progressData.overallProgressPercentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressPercentage}>
                {progressData.overallProgressPercentage.toFixed(1)}%
              </Text>
            </View>
            <Text style={styles.sectionCountText}>
              완료: {progressData.completedSections} / {progressData.totalSections} 섹션
            </Text>
          </View>
        )} */}

        {/* 선택 버튼들 */}
        <View style={styles.buttonSection}>
          {material.hasProgress && (
            <ChoiceButton
              onPress={handleContinue}
              label="이어서 듣기"
              subLabel={`마지막 위치부터`}
              accessibilityLabel={`이어서 듣기, ${chapters[currentChapterIndex]?.title || ''} 챕터, 마지막 위치부터`}
            />
          )}

          <ChoiceButton
            onPress={handleFromStart}
            label="처음부터 듣기"
            subLabel={`챕터 처음부터`}
            accessibilityLabel={`처음부터 듣기, ${chapters[currentChapterIndex]?.title || ''} 챕터, 처음부터`}
          />

          <ChoiceButton
            onPress={handleBookmarkPress}
            label="저장 목록"
            subLabel="북마크 보기"
            accessibilityLabel="저장 목록"
          />

          <ChoiceButton
            onPress={handleQuestionPress}
            label="질문 목록"
            subLabel="이전 질문 보기"
            accessibilityLabel="질문 목록"
          />

          {showQuizButton && (
            <ChoiceButton
              onPress={handleQuizPress}
              label="퀴즈 풀기"
              subLabel="학습 내용 확인"
              accessibilityLabel="퀴즈 풀기, 학습 내용 확인"
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    // gap: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  infoSection: {
    marginBottom: 24,
    alignItems: "center",
    paddingTop: 8,
  },
  subjectText: {
    fontSize: 40,
    fontWeight: "bold",
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  chapterText: {
    fontSize: 22,
    color: COLORS.text.secondary,
  },
  chapterSelectSection: {
    backgroundColor: COLORS.background.elevated,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: COLORS.primary.main,
  },
  progressSection: {
    backgroundColor: COLORS.background.elevated,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 24,
    backgroundColor: COLORS.border.light,
    borderRadius: 12,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.status.success,
    borderRadius: 12,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text.primary,
    minWidth: 55,
    textAlign: "right",
  },
  sectionCountText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginTop: 4,
    textAlign: "center",
  },
  chapterNavigationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
  },
  navButton: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primary.main,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: COLORS.primary.dark,
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text.inverse,
  },
  chapterInfoCompact: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chapterTitleCompact: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  chapterStatusText: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text.secondary,
    textAlign: "center",
  },
  chapterIndexText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary.main,
    textAlign: "center",
  },
  goToChapterButton: {
    backgroundColor: COLORS.status.success,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 60,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.status.success,
  },
  goToChapterButtonText: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text.inverse,
  },
  buttonSection: {
    gap: 16,
  },
});