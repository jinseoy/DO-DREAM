import React, { useEffect, useContext, useCallback, useState } from "react";
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
import axios from "axios";
import { LibraryScreenNavigationProp } from "../../navigation/navigationTypes";
import { Material } from "../../types/material";
import { useAuthStore } from "../../stores/authStore";
import { useAppSettingsStore } from "../../stores/appSettingsStore";
import { TriggerContext } from "../../triggers/TriggerContext";
import VoiceCommandButton from "../../components/VoiceCommandButton";
import { fetchSharedMaterials } from "../../api/materialApi";
import { SharedMaterialSummary } from "../../types/api/materialApiTypes";

export default function LibraryScreen() {
  const navigation = useNavigation<LibraryScreenNavigationProp>();
  const student = useAuthStore((state) => state.student);
  const settings = useAppSettingsStore((state) => state.settings);

  const { setCurrentScreenId, registerVoiceHandlers } =
    useContext(TriggerContext);

  const displayName = student?.name || "학생";

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 헬퍼: 백엔드 공유 자료 요약 → 앱 Material 도메인으로 매핑
  const mapSharedToMaterial = (shared: SharedMaterialSummary): Material => {
    return {
      id: shared.materialId,
      teacherId: String(shared.teacherId),
      title: shared.materialTitle,
      // 백엔드에서 과목 정보는 아직 없으므로 일단 빈 문자열
      subject: "",
      // createdAt / updatedAt이 Swagger에 없어서 sharedAt 기준으로 세팅
      createdAt: new Date(shared.sharedAt),
      updatedAt: new Date(shared.sharedAt),
      // accessed: 학습을 한 번이라도 열어본 적이 있는지 여부
      hasProgress: shared.accessed,
      // 아직 챕터/재생 위치 정보는 없으므로 undefined
      currentChapter: undefined,
      totalChapters: undefined,
      lastPosition: undefined,
    };
  };

  // 서버에서 공유 자료 목록 불러오기
  useEffect(() => {
    let isMounted = true;

    const loadMaterials = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchSharedMaterials();
        if (!isMounted) return;

        const mapped = response.materials.map(mapSharedToMaterial);
        setMaterials(mapped);

        if (mapped.length === 0) {
          AccessibilityInfo.announceForAccessibility(
            `${displayName} 학생에게 아직 공유된 학습 자료가 없습니다. 교사가 자료를 공유하면 이 화면에서 바로 확인할 수 있습니다.`
          );
        } else {
          AccessibilityInfo.announceForAccessibility(
            `${displayName} 학생에게 공유된 학습 자료 ${mapped.length}개가 있습니다. 화면을 아래로 쓸어 내려 교재를 탐색하세요.`
          );
        }
      } catch (e: any) {
        console.error("[LibraryScreen] 자료 로딩 실패:", e);

        // 401이면: 자동 로그인도 실패한 상태 → AuthStart로 보내서 다시 로그인
        if (axios.isAxiosError(e) && e.response?.status === 401) {
          AccessibilityInfo.announceForAccessibility(
            "로그인이 만료되었습니다. 생체 인증 로그인 화면으로 이동합니다."
          );

          // 스택 초기화 후 AuthStart로 이동
          // (네비게이션 타입 충돌을 피하려고 name을 as never 캐스팅)
          navigation.reset({
            index: 0,
            routes: [{ name: "AuthStart" as never }],
          });

          setLoading(false);
          return;
        }

        setError("자료를 불러오는 도중 오류가 발생했습니다.");
        AccessibilityInfo.announceForAccessibility(
          "서버에서 학습 자료를 불러오는 데 실패했습니다. 네트워크 상태를 확인해 주세요."
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadMaterials();

    return () => {
      isMounted = false;
    };
  }, [displayName, navigation]);

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
   * 음성으로 들어온 문장을 기반으로
   * 서버에서 가져온 materials 중 가장 잘 맞는 교재를 찾는다.
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
          const found = materials.find((m) =>
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

      for (const material of materials) {
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
    [materials]
  );

  /**
   * Library 화면 전용 음성 명령 처리
   * - "영어 1", "문학", "생물 1로 이동", "합법과 작문" 등
   */
  const handleLibraryVoiceCommand = useCallback(
    (spoken: string) => {
      if (loading) {
        AccessibilityInfo.announceForAccessibility(
          "학습 자료를 불러오는 중입니다. 잠시 후 다시 말씀해 주세요."
        );
        return;
      }

      if (materials.length === 0) {
        AccessibilityInfo.announceForAccessibility(
          "현재 공유된 학습 자료가 없습니다."
        );
        return;
      }

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
    [findMaterialByVoice, navigation, loading, materials.length]
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
    // 챕터 정보가 없는 경우도 자연스럽게 읽히도록 처리
    const hasChapterInfo =
      typeof item.currentChapter === "number" &&
      typeof item.totalChapters === "number";

    const chapterDescription = hasChapterInfo
      ? `현재 ${item.currentChapter}챕터, 전체 ${item.totalChapters}챕터 중. `
      : item.hasProgress
      ? "이어서 듣기가 가능합니다. "
      : "처음부터 학습을 시작할 수 있습니다. ";

    const accessibilityLabel = `${item.title}, ${chapterDescription}`;

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
            {hasChapterInfo
              ? `현재 ${item.currentChapter}챕터`
              : item.hasProgress
              ? "이어서 듣기 가능"
              : "처음부터 시작"}
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
    const msg = `${displayName} 학생의 서재 화면입니다. 상단의 음성 명령 버튼을 두 번 탭한 후, 영어 1, 문학, 생물 1, 화법과 작문처럼 교재 이름을 말하면 해당 교재로 이동합니다.`;
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
          <VoiceCommandButton accessibilityHint="두 번 탭한 후 교재 이름을 말씀하세요. 예: 영어 1, 문학, 생물 1, 화법과 작문" />

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
        data={materials}
        renderItem={renderMaterialButton}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        accessible={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, HC && styles.textHC]}>
              {loading
                ? "학습 자료를 불러오는 중입니다..."
                : error
                ? error
                : "현재 공유된 학습 자료가 없습니다."}
            </Text>
          </View>
        }
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
    marginLeft: 8,
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
  emptyContainer: {
    paddingTop: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    color: "#666666",
  },
});
