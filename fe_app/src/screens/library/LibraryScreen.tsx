import React, { useEffect, useContext, useCallback } from "react";
import {
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  View,
  AccessibilityInfo,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LibraryScreenNavigationProp } from "../../navigation/navigationTypes";
import { dummyMaterials } from "../../data/dummyMaterials";
import { Material } from "../../types/material";
import { useAuthStore } from "../../stores/authStore";
import { useAppSettingsStore } from "../../stores/appSettingsStore";
import { TriggerContext } from "../../triggers/TriggerContext";

export default function LibraryScreen() {
  const navigation = useNavigation<LibraryScreenNavigationProp>();
  const student = useAuthStore((state) => state.student);
  const settings = useAppSettingsStore((state) => state.settings);

  const {
    setCurrentScreenId,
    registerVoiceHandlers,
    startVoiceCommandListening,
    isVoiceCommandListening,
  } = useContext(TriggerContext);

  const displayName = student?.name || "학생";

  // 헬퍼: 한글 교재명 / 음성 명령 정규화
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/\s+/g, "") // 공백 제거
      // 숫자/한글 숫자 비슷하게 맞추기
      .replace(/일/g, "1")
      .replace(/이/g, "2")
      .replace(/삼/g, "3")
      .replace(/사/g, "4")
      .replace(/오/g, "5")
      .replace(/육/g, "6")
      .replace(/칠/g, "7")
      .replace(/팔/g, "8")
      .replace(/구/g, "9");

  /**
   * 🔍 음성으로 들어온 문장을 기반으로
   * dummyMaterials 중 가장 잘 맞는 교재를 찾는다.
   */
  const findMaterialByVoice = useCallback(
    (spoken: string): Material | null => {
      const normalizedSpoken = normalize(spoken);
      if (!normalizedSpoken) return null;

      console.log(
        "[VoiceCommands][Library] spoken:",
        spoken,
        "normalized:",
        normalizedSpoken
      );

      // 1) 특수 매핑 (ASR 오인 보정용)
      //  - "합법과 작문" → "화법과 작문"
      const specialMappings: { keywords: string[]; titleHint: string }[] = [
        {
          keywords: ["합법", "화법"],
          titleHint: "화법과 작문",
        },
      ];

      for (const mapping of specialMappings) {
        const hit = mapping.keywords.some((k) =>
          normalizedSpoken.includes(normalize(k))
        );
        if (hit) {
          const hintNorm = normalize(mapping.titleHint);
          const found = dummyMaterials.find((m) =>
            normalize(m.title).includes(hintNorm)
          );
          if (found) {
            console.log(
              "[VoiceCommands][Library] 특수 매핑으로 교재 선택:",
              found.title
            );
            return found;
          }
        }
      }

      // 2) 일반 매칭: 제목 기반 스코어 계산
      let best: { material: Material; score: number } | null = null;

      for (const material of dummyMaterials) {
        const normTitle = normalize(material.title);
        if (!normTitle) continue;

        let score = 0;

        // 제목 전체 혹은 일부가 그대로 포함될 경우 가산점
        if (
          normalizedSpoken.includes(normTitle) ||
          normTitle.includes(normalizedSpoken)
        ) {
          score += 50;
        }

        // 공통 글자 수로 점수 부여 (한글 교과명 구분용)
        const charSet = new Set(normTitle.split(""));
        charSet.forEach((ch) => {
          if (normalizedSpoken.includes(ch)) score += 1;
        });

        if (!best || score > best.score) {
          best = { material, score };
        }
      }

      // 너무 애매하면 매칭 실패로 처리
      if (!best || best.score < 3) {
        console.log(
          "[VoiceCommands][Library] 매칭 실패. bestScore=",
          best?.score ?? 0
        );
        return null;
      }

      console.log(
        "[VoiceCommands][Library] 교재 매칭 성공:",
        best.material.title,
        "score=",
        best.score
      );
      return best.material;
    },
    []
  );

  /**
   * Library 화면 전용 음성 명령 처리
   * - "영어 1", "문학", "생물 1로 이동", "합법과 작문" 등
   */
  const handleLibraryVoiceCommand = useCallback(
    (spoken: string) => {
      const material = findMaterialByVoice(spoken);

      if (!material) {
        AccessibilityInfo.announceForAccessibility(
          "말씀하신 이름의 교재를 찾지 못했습니다. 다시 한 번 말씀해 주세요."
        );
        return;
      }

      AccessibilityInfo.announceForAccessibility(
        `${material.title} 교재로 이동합니다`
      );
      navigation.navigate("PlaybackChoice", { material });
    },
    [findMaterialByVoice, navigation]
  );

  const handleMaterialPress = (material: Material) => {
    console.log("선택한 교재:", material.title);
    navigation.navigate("PlaybackChoice", { material });
  };

  const handleSettingsPress = () => {
    AccessibilityInfo.announceForAccessibility("설정 화면으로 이동합니다.");
    navigation.navigate("Settings");
  };

  const renderMaterialButton = ({ item }: { item: Material }) => {
    const accessibilityLabel = `${item.title}, 현재 ${item.currentChapter}챕터, 전체 ${item.totalChapters}챕터 중. ${
      item.hasProgress ? "이어듣기 가능" : "처음부터 시작"
    }`;

    const baseFontSize = 24;
    const scaledFontSize = baseFontSize * settings.fontSizeScale;
    const scaledChapterFontSize = 18 * settings.fontSizeScale;

    return (
      <TouchableOpacity
        style={styles.materialButton}
        onPress={() => handleMaterialPress(item)}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityHint="두 번 탭하여 교재를 선택하세요"
      >
        <View style={styles.materialContent}>
          <Text style={[styles.subjectText, { fontSize: scaledFontSize }]}>
            {item.title}
          </Text>

          <Text
            style={[styles.chapterText, { fontSize: scaledChapterFontSize }]}
          >
            현재 {item.currentChapter}챕터
          </Text>

          {item.hasProgress && (
            <View style={styles.progressIndicator}>
              <Text style={styles.progressText}>이어듣기</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const HC = settings.highContrastMode;
  const headerFontSize = 36 * settings.fontSizeScale;

  // LibraryScreen용 음성 명령 핸들러 등록
  useEffect(() => {
    setCurrentScreenId("Library");

    registerVoiceHandlers("Library", {
      // 전역 명령: "뒤로 가" → 이전 화면
      goBack: () => navigation.goBack(),
      // 나머지 일반 문장(영어 1, 문학, 생물 1 등)은 여기서 처리
      rawText: handleLibraryVoiceCommand,
    });

    return () => {
      registerVoiceHandlers("Library", {});
    };
  }, [
    setCurrentScreenId,
    registerVoiceHandlers,
    navigation,
    handleLibraryVoiceCommand,
  ]);

  // 화면 진입 안내 (음성 명령 안내 포함)
  useEffect(() => {
    const msg = `${displayName} 학생의 서재 화면입니다. 교재 목록에서 원하는 교재를 선택할 수 있습니다. 상단의 음성 명령 버튼을 두 번 탭한 후, 영어 1, 문학 1, 생물 1, 화법과 작문처럼 교재 이름을 말하면 해당 교재로 이동합니다.`;
    const timer = setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(msg);
    }, 500);
    return () => clearTimeout(timer);
  }, [displayName]);

  return (
    <SafeAreaView
      style={[styles.container, HC && styles.containerHC]}
      edges={["top", "bottom"]}
    >
      <View style={[styles.header, HC && styles.headerHC]}>
        <Text
          style={[
            styles.studentName,
            { fontSize: headerFontSize },
            HC && styles.textHC,
          ]}
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel={`${displayName} 학생의 서재`}
        >
          {displayName}
        </Text>

        {/* 오른쪽: 음성 명령 + 설정 버튼 */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[
              styles.voiceCommandButton,
              isVoiceCommandListening && styles.voiceCommandButtonActive,
            ]}
            onPress={startVoiceCommandListening}
            accessible={true}
            accessibilityLabel="음성 명령"
            accessibilityRole="button"
            accessibilityHint="두 번 탭한 후 교재 이름을 말씀하세요. 예: 영어 1, 문학 1, 생물 1"
          >
            <Text
              style={[
                styles.voiceCommandButtonText,
                HC && styles.voiceCommandButtonTextHC,
              ]}
            >
              {isVoiceCommandListening ? "듣는 중…" : "음성 명령"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={handleSettingsPress}
            accessible={true}
            accessibilityLabel="사용자 설정"
            accessibilityRole="button"
            accessibilityHint="TTS 속도 및 화면 설정을 변경합니다."
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.settingsIcon}>⚙️ 설정</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={dummyMaterials}
        renderItem={renderMaterialButton}
        keyExtractor={(item) => item.id.toString()}
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
    backgroundColor: "#ffffff",
  },
  containerHC: {
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
  },
  headerHC: {
    borderBottomColor: "#ffffff",
  },
  studentName: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#333333",
  },
  textHC: {
    color: "#ffffff",
  },
  // 오른쪽: 음성 명령 + 설정
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  voiceCommandButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FF5722",
    backgroundColor: "#FFF3E0",
    minHeight: 40,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  voiceCommandButtonActive: {
    borderColor: "#C62828",
    backgroundColor: "#FFCDD2",
  },
  voiceCommandButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E64A19",
  },
  voiceCommandButtonTextHC: {
    color: "#FFFDE7",
  },
  settingsButton: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "skyblue",
    borderColor: "blue",
    borderRadius: 12,
    borderWidth: 2,
  },
  settingsIcon: {
    fontSize: 16,
    color: "blue",
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  materialButton: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    minHeight: 88,
  },
  materialContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subjectText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333333",
    flex: 1,
  },
  chapterText: {
    fontSize: 18,
    color: "#666666",
    marginLeft: 12,
  },
  progressIndicator: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  progressText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
  },
});