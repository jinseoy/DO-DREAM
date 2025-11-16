import React, { useEffect, useContext, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  PlaybackChoiceScreenNavigationProp,
  PlaybackChoiceScreenRouteProp,
} from "../../navigation/navigationTypes";
import { getChaptersByMaterialId } from "../../data/dummyChapters";
import { getQuizzesByChapterId } from "../../data/dummyQuizzes";
import * as Haptics from "expo-haptics";
import { TriggerContext } from "../../triggers/TriggerContext";
import VoiceCommandButton from "../../components/VoiceCommandButton";
import BackButton from "../../components/BackButton";
import { commonStyles } from "../../styles/commonStyles";
import ChoiceButton from "../../components/ChoiceButton";

export default function PlaybackChoiceScreen() {
  const navigation = useNavigation<PlaybackChoiceScreenNavigationProp>();
  const route = useRoute<PlaybackChoiceScreenRouteProp>();
  const { material } = route.params;

  const chapters = getChaptersByMaterialId(material.id.toString());
  const firstChapter = chapters[0];

  const hasStudied = material.hasProgress;

  const quizzes = firstChapter
    ? getQuizzesByChapterId(firstChapter.chapterId.toString())
    : [];
  const hasQuiz = quizzes.length > 0;
  const showQuizButton = hasStudied && hasQuiz;

  const { setCurrentScreenId, registerVoiceHandlers } =
    useContext(TriggerContext);

  useEffect(() => {
    const announcement = `${material.title}, ${material.currentChapter}챕터. 이어듣기, 처음부터, 저장 목록, 질문 목록, 퀴즈 중 선택하세요. 상단의 음성 명령 버튼을 두 번 탭하고, 이어서 듣기, 처음부터, 저장 목록, 질문 목록, 퀴즈 풀기, 뒤로 가기처럼 말할 수 있습니다.`;
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [material.title, material.currentChapter]);

  const handleFromStart = useCallback(() => {
    AccessibilityInfo.announceForAccessibility("처음부터 시작합니다.");

    if (firstChapter) {
      navigation.navigate("Player", {
        material,
        chapterId: firstChapter.chapterId,
        fromStart: true,
      });
    }
  }, [firstChapter, material, navigation]);

  const handleContinue = useCallback(() => {
    AccessibilityInfo.announceForAccessibility("이어서 듣기 시작합니다.");

    if (firstChapter) {
      navigation.navigate("Player", {
        material,
        chapterId: firstChapter.chapterId,
        fromStart: false,
      });
    }
  }, [firstChapter, material, navigation]);

  const handleBookmarkPress = useCallback(() => {
    AccessibilityInfo.announceForAccessibility("저장 목록으로 이동합니다");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: 북마크 목록 화면으로 이동
  }, []);

  const handleQuestionPress = useCallback(() => {
    AccessibilityInfo.announceForAccessibility("질문 목록으로 이동합니다");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: 질문 목록 화면으로 이동
  }, []);

  const handleQuizPress = useCallback(() => {
    if (!firstChapter) return;

    if (quizzes.length === 1) {
      AccessibilityInfo.announceForAccessibility("퀴즈를 시작합니다");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate("Quiz", { quiz: quizzes[0] });
    } else {
      AccessibilityInfo.announceForAccessibility("퀴즈 목록으로 이동합니다");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate("QuizList", {
        material,
        chapterId: firstChapter.chapterId,
      });
    }
  }, [firstChapter, quizzes, navigation, material]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

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
        "이 화면에서 사용할 수 없는 음성 명령입니다. 이어서 듣기, 처음부터, 저장 목록, 질문 목록, 퀴즈 풀기, 뒤로 가기처럼 말해 주세요."
      );
    },
    [
      material.hasProgress,
      handleContinue,
      handleFromStart,
      handleBookmarkPress,
      handleQuestionPress,
      handleQuizPress,
      showQuizButton,
    ]
  );

  // 🔧 TriggerContext와 음성 명령 핸들러 등록
  useEffect(() => {
    setCurrentScreenId("PlaybackChoice");

    registerVoiceHandlers("PlaybackChoice", {
      goBack: handleGoBack,
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
    handleQuizPress,
    handlePlaybackVoiceRaw,
    showQuizButton,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* 상단: 뒤로가기 + 음성 명령 버튼 */}
      <View style={[commonStyles.headerContainer, styles.header]}>
        <BackButton
          onPress={handleGoBack}
          style={commonStyles.headerBackButton}
        />

        <VoiceCommandButton
          style={commonStyles.headerVoiceButton}
          accessibilityHint="두 번 탭한 후, 이어서 듣기, 처음부터, 저장 목록, 질문 목록, 퀴즈 풀기, 뒤로 가기와 같은 명령을 말씀하세요"
        />
      </View>

      {/* 교재 정보 */}
      <View style={styles.infoSection}>
        <Text
          style={styles.subjectText}
          accessible={true}
          accessibilityRole="header"
        >
          {material.title}
        </Text>
        <Text style={styles.chapterText}>{material.currentChapter}챕터</Text>
      </View>

      {/* 선택 버튼들 */}
      <View style={styles.buttonSection}>
        {material.hasProgress && (
          <ChoiceButton
            onPress={handleContinue}
            label="이어서 듣기"
            subLabel="마지막 위치부터"
            accessibilityLabel="이어서 듣기, 마지막 위치부터"
          />
        )}

        <ChoiceButton
          onPress={handleFromStart}
          label="처음부터 듣기"
          subLabel="챕터 처음부터"
          accessibilityLabel="처음부터 듣기, 챕터 처음부터"
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingTop: 0, // SafeAreaView의 기본 패딩을 사용하지 않도록
  },
  header: {
    marginHorizontal: -24, // 부모의 paddingHorizontal 상쇄
  },
  infoSection: {
    marginBottom: 40,
    alignItems: "center",
  },
  subjectText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 8,
  },
  chapterText: {
    fontSize: 20,
    color: "#666666",
  },
  buttonSection: {
    gap: 16,
  },
});
