import React, {
  useEffect,
  useContext,
  useCallback,
  useState,
  useRef,
} from "react";
import {
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  View,
  AccessibilityInfo,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { LibraryScreenNavigationProp } from "../../navigation/navigationTypes";
import { Material } from "../../types/material";
import { useAuthStore } from "../../stores/authStore";
import { useAppSettingsStore } from "../../stores/appSettingsStore";
import { TriggerContext } from "../../triggers/TriggerContext";
import VoiceCommandButton from "../../components/VoiceCommandButton";
import SettingsButton from "../../components/SettingsButton";
import { fetchSharedMaterials, fetchMaterialJson } from "../../api/materialApi";
import { SharedMaterialSummary } from "../../types/api/materialApiTypes";
import { fetchAllProgress } from "../../api/progressApi";
import type { MaterialProgress } from "../../types/api/progressApiTypes";
import { useTheme } from "../../contexts/ThemeContext";
import { HEADER_BTN_HEIGHT, HEADER_MIN_HEIGHT } from "../../constants/dimensions";
import { COLORS } from "../../constants/colors";
import { commonStyles } from "../../styles/commonStyles";

export default function LibraryScreen() {
  const navigation = useNavigation<LibraryScreenNavigationProp>();
  const student = useAuthStore((state) => state.student);
  const settings = useAppSettingsStore((state) => state.settings);
  const { colors, fontSize: themeFont, isHighContrast } = useTheme();

  const { setCurrentScreenId, registerVoiceHandlers } =
    useContext(TriggerContext);

  const displayName = student?.name || "학생";

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingMaterialId, setLoadingMaterialId] = useState<number | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // 모든 교재의 진행률 데이터 (materialId를 키로 하는 Map)
  const [progressDataMap, setProgressDataMap] = useState<
    Map<number, MaterialProgress>
  >(new Map());

  // 공유 목록 → Material 도메인으로 매핑
  const mapSharedToMaterial = (shared: SharedMaterialSummary): Material => {
    return {
      id: shared.materialId,
      teacherId: String(shared.teacherId),
      title: shared.materialTitle,
      subject: "", // 백엔드에서 과목 정보는 아직 없으므로 빈 문자열
      createdAt: new Date(shared.sharedAt),
      updatedAt: new Date(shared.sharedAt),
      hasProgress: shared.accessed,
      currentChapter: undefined,
      totalChapters: undefined,
      lastPosition: undefined,
    };
  };

  // 서버에서 공유 자료 목록 + 진행률 불러오기
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadMaterials = async () => {
        setLoadingList(true);
        setError(null);

        try {
          // 1. 공유된 교재 목록 조회
          const response = await fetchSharedMaterials();
          if (!isMounted) return;

          const mapped = response.materials.map(mapSharedToMaterial);
          setMaterials(mapped);

          // 2. 모든 교재의 진행률 조회
          try {
            const progressResponse = await fetchAllProgress();
            if (!isMounted) return;

            console.log("[LibraryScreen] 진행률 API 응답:", progressResponse);

            // materialId를 키로 하는 Map으로 변환
            const progressMap = new Map<number, MaterialProgress>();
            if (progressResponse.data && Array.isArray(progressResponse.data)) {
              progressResponse.data.forEach((progress) => {
                progressMap.set(progress.materialId, progress);
              });
              setProgressDataMap(progressMap);
              console.log(
                "[LibraryScreen] 진행률 조회 성공:",
                progressResponse.data.length,
                "개"
              );
            } else {
              console.warn(
                "[LibraryScreen] 진행률 데이터가 배열이 아닙니다:",
                progressResponse.data
              );
            }
          } catch (progressError: any) {
            console.error("[LibraryScreen] 진행률 조회 실패:", progressError);
            if (progressError.response) {
              console.error(
                "[LibraryScreen] 에러 응답 상태:",
                progressError.response.status
              );
              console.error(
                "[LibraryScreen] 에러 응답 데이터:",
                progressError.response.data
              );
            }
            // 진행률 조회 실패해도 교재 목록은 표시
          }

          if (mapped.length === 0) {
            AccessibilityInfo.announceForAccessibility(
              `${displayName} 학생에게 아직 공유된 학습 자료가 없습니다. 교사가 자료를 공유하면 이 화면에서 바로 확인할 수 있습니다.`
            );
          } else {
            AccessibilityInfo.announceForAccessibility(
              `${displayName} 학생에게 공유된 학습 자료 ${mapped.length}개가 있습니다.`
            );
          }
        } catch (e: any) {
          console.error("[LibraryScreen] 자료 로딩 실패:", e);

          if (axios.isAxiosError(e) && e.response?.status === 401) {
            AccessibilityInfo.announceForAccessibility(
              "로그인이 만료되었습니다. 생체 인증 로그인 화면으로 이동합니다."
            );

            navigation.reset({
              index: 0,
              routes: [{ name: "AuthStart" as never }],
            });

            setLoadingList(false);
            return;
          }

          setError("자료를 불러오는 도중 오류가 발생했습니다.");
          AccessibilityInfo.announceForAccessibility(
            "서버에서 학습 자료를 불러오는 데 실패했습니다. 네트워크 상태를 확인해 주세요."
          );
        } finally {
          if (isMounted) {
            setLoadingList(false);
          }
        }
      };

      loadMaterials();

      return () => {
        isMounted = false;
      };
    }, [displayName, navigation])
  );

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
   * 교재 버튼을 눌렀을 때:
   * - materialId로 JSON(본문 + 퀴즈)을 먼저 가져온 뒤
   * - material.json에 담아서 PlaybackChoice로 전달
   */
  const handleMaterialPress = async (material: Material) => {
    // 이미 해당 교재를 열기 위한 요청이 진행 중이면 중복 요청 방지
    if (loadingMaterialId === material.id) {
      return;
    }

    try {
      setLoadingMaterialId(material.id);
      AccessibilityInfo.announceForAccessibility(
        `${material.title} 교재 내용을 불러오는 중입니다.`
      );

      const json = await fetchMaterialJson(material.id);

      // 백엔드에서 조회한 진행률 데이터를 사용하여 hasProgress 업데이트
      const progressData = progressDataMap.get(material.id);
      const hasActualProgress =
        progressData != null &&
        (progressData.completedSections > 0 ||
          progressData.overallProgressPercentage > 0);

      const enrichedMaterial: Material = {
        ...material,
        json,
        hasProgress: hasActualProgress, // 실제 진행률 데이터 기반으로 설정
      };

      console.log(
        `[LibraryScreen] Material ${material.id} hasProgress:`,
        hasActualProgress
      );

      AccessibilityInfo.announceForAccessibility(
        `${material.title} 교재 내용을 불러왔습니다. 재생 방법을 선택하는 화면으로 이동합니다.`
      );

      navigation.navigate("PlaybackChoice", { material: enrichedMaterial });
    } catch (e: any) {
      console.error("[LibraryScreen] 교재 JSON 로딩 실패:", e);

      if (axios.isAxiosError(e) && e.response?.status === 401) {
        AccessibilityInfo.announceForAccessibility(
          "로그인이 만료되었습니다. 생체 인증 로그인 화면으로 이동합니다."
        );

        navigation.reset({
          index: 0,
          routes: [{ name: "AuthStart" as never }],
        });

        return;
      }

      AccessibilityInfo.announceForAccessibility(
        `${material.title} 교재 내용을 불러오는 데 실패했습니다. 네트워크 상태를 확인한 후 다시 시도해 주세요.`
      );
    } finally {
      setLoadingMaterialId(null);
    }
  };

  /**
   * Library 화면 전용 음성 명령 처리
   * - "영어 1", "문학", "생물 1로 이동", "합법과 작문" 등
   */
  const handleLibraryVoiceCommand = useCallback(
    (spoken: string): boolean => {
      const raw = spoken.trim();

      console.log("[LibraryScreen] rawText 핸들러 호출:", raw);

      // 1) 자료 로딩 중이면 대기 요청
      if (loadingList) {
        AccessibilityInfo.announceForAccessibility(
          "학습 자료를 불러오는 중입니다. 잠시 후 다시 말씀해 주세요."
        );
        return true;
      }

      // 2) 자료가 없으면 안내
      if (materials.length === 0) {
        AccessibilityInfo.announceForAccessibility(
          "현재 공유된 학습 자료가 없습니다."
        );
        return true;
      }

      // 3) 교재명으로 매칭 시도
      const material = findMaterialByVoice(raw);

      if (!material || raw.toLowerCase().includes("소리")) {
        AccessibilityInfo.announceForAccessibility(
          "말씀하신 이름의 교재를 찾지 못했습니다. 다시 한 번 말씀해 주세요."
        );
        return false;
      }

      AccessibilityInfo.announceForAccessibility(
        `${material.title} 교재로 이동합니다.`
      );
      handleMaterialPress(material);
      return true;
    },
    [findMaterialByVoice, loadingList, materials, handleMaterialPress]
  );

  const handleSettingsPress = () => {
    AccessibilityInfo.announceForAccessibility("설정 화면으로 이동합니다.");
    navigation.navigate("Settings");
  };

  const renderMaterialButton = ({ item }: { item: Material }) => {
    // 백엔드에서 조회한 진행률 데이터
    const progressData = progressDataMap.get(item.id);

    const hasChapterInfo =
      typeof item.currentChapter === "number" &&
      typeof item.totalChapters === "number";

    // 진행률 데이터가 있으면 우선적으로 사용
    const chapterDescription = progressData
      ? `진행률 ${progressData.overallProgressPercentage.toFixed(0)}%, ${
          progressData.completedSections} / ${progressData.totalSections} 챕터 완료. `
      : hasChapterInfo
      ? `현재 ${item.currentChapter}챕터, 전체 ${item.totalChapters}챕터 중. `
      : item.hasProgress
      ? "이어서 듣기가 가능합니다. "
      : "처음부터 학습을 시작할 수 있습니다. ";

    const accessibilityLabel = `${item.title}, ${chapterDescription}`;

    const baseFontSize = 24;
    const scaledFontSize = baseFontSize * settings.fontSizeScale;
    const scaledChapterFontSize = 18 * settings.fontSizeScale;

    const isThisLoading = loadingMaterialId === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.materialButton,
          isThisLoading && styles.materialButtonLoading,
        ]}
        onPress={() => handleMaterialPress(item)}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityHint={
          isThisLoading
            ? "이 교재의 내용을 불러오는 중입니다."
            : "두 번 탭하여 교재 내용을 불러온 후 재생 방식을 선택하세요."
        }
      >
        <View style={styles.materialContent}>
          <View style={styles.materialTextContainer}>
            <Text style={[styles.subjectText, { fontSize: scaledFontSize }]}>
              {item.title}
            </Text>

            <Text
              style={[styles.chapterText, { fontSize: scaledChapterFontSize }]}
            >
              {progressData
                ? `${progressData.overallProgressPercentage.toFixed(0)}% 완료`
                : hasChapterInfo
                ? `현재 ${item.currentChapter}챕터`
                : item.hasProgress
                ? "이어서 듣기 가능"
                : "처음부터 시작"}
            </Text>

            {progressData && (
              <Text style={styles.chapterProgressText}>
                {progressData.completedSections} / {progressData.totalSections}{" "}
                챕터
              </Text>
            )}
          </View>

          {(item.hasProgress || progressData) && (
            <View style={styles.progressIndicator}>
              <Text style={styles.progressText}>이어듣기</Text>
            </View>
          )}
        </View>

        {isThisLoading && (
          <Text style={styles.loadingText}>불러오는 중...</Text>
        )}
      </TouchableOpacity>
    );
  };

  const styles = React.useMemo(() => createStyles(colors, themeFont, isHighContrast), [colors, themeFont, isHighContrast]);
  const headerFontSize = themeFont(36);

  const handleLibraryVoiceCommandRef = useRef(handleLibraryVoiceCommand);
  useEffect(() => {
    handleLibraryVoiceCommandRef.current = handleLibraryVoiceCommand;
  }, [handleLibraryVoiceCommand]);

  // LibraryScreen용 음성 명령 핸들러 등록
  useEffect(() => {
    setCurrentScreenId("Library");

    registerVoiceHandlers("Library", {
      rawText: (text: string) => handleLibraryVoiceCommandRef.current(text),
      openLibrary: () => AccessibilityInfo.announceForAccessibility("이미 서재 화면입니다."),
      openSettings: () => {
        AccessibilityInfo.announceForAccessibility("설정 화면으로 이동합니다.");
        navigation.navigate("Settings");
      },
      // // 전역 명령: "뒤로 가" → 이전 화면
      // goBack: () => navigation.goBack(),
      // 나머지 일반 문장(영어 1, 문학, 생물 1 등)은 여기서 처리
      // rawText: (text: string) => handleLibraryVoiceCommandRef.current(text),
    });

    return () => {
      registerVoiceHandlers("Library", {});
    };
  }, [setCurrentScreenId, registerVoiceHandlers, navigation]);

  // 화면 진입 안내 (음성 명령 안내 포함)
  useEffect(() => {
    const msg = `${displayName} 학생의 서재 화면입니다. 상단의 말하기 버튼을 두 번 탭한 후, 영어 1, 사회문화 처럼 교재 이름을 말하면 해당 교재로 이동합니다.`;
    const timer = setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(msg);
    }, 500);
    return () => clearTimeout(timer);
  }, [displayName]);

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom"]}
    >
      <View style={styles.header}>
        <Text
          style={[
            styles.studentName,
            { fontSize: headerFontSize },
          ]}
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel={`${displayName} 학생의 서재`}
        >
          {displayName}
        </Text>

        {/* 오른쪽: 음성 명령 + 설정 버튼 */}
        <View style={styles.headerRight}>
          <SettingsButton
            onPress={handleSettingsPress}
            showLabel={true}
            accessibilityHint="재생 속도 및 화면 설정을 변경합니다."
          />

          <VoiceCommandButton
            style={commonStyles.headerVoiceButton}
            accessibilityHint="두 번 탭한 후 교재 이름을 말씀하세요. 예: 문학, 사회문화, 생물 1, 영어 1"
          />
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
            <Text style={styles.emptyText}>
              {loadingList
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

const createStyles = (colors: any, fontSize: (size: number) => number, isHighContrast: boolean) => {
  const isPrimaryColors = 'primary' in colors;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,

    },
    header: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: 3,
      borderBottomColor: isHighContrast ? COLORS.secondary.main : (isPrimaryColors ? colors.primary.main : colors.border.default),
      minHeight: HEADER_MIN_HEIGHT,
    },
    studentName: {
      fontSize: 40,
      fontWeight: "bold",
      color: colors.text.primary,
      height: HEADER_BTN_HEIGHT,
      lineHeight: HEADER_BTN_HEIGHT,
      textAlignVertical: "center",
    },
    // 오른쪽: 음성 명령 + 설정
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      // justifyContent: "space-between",
      height: HEADER_BTN_HEIGHT,
    },
    listContent: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 40,
    },
    materialButton: {
      backgroundColor: isPrimaryColors ? colors.primary.lightest : colors.background.elevated,
      borderRadius: 16,
      marginBottom: 20,
      paddingVertical: 20,
      paddingHorizontal: 24,
      borderWidth: 3,
      borderColor: isPrimaryColors ? colors.primary.main : colors.accent.primary,
      minHeight: 100,
      justifyContent: "center",
    },
    materialButtonLoading: {
      opacity: 0.7,
    },
    materialContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    materialTextContainer: {
      flex: 1,
    },
    subjectText: {
      fontSize: fontSize(26),
      fontWeight: "600",
      color: colors.text.primary,
      marginBottom: 4,
    },
    chapterText: {
      fontSize: fontSize(20),
      color: colors.text.secondary,
      marginBottom: 2,
    },
    chapterProgressText: {
      fontSize: fontSize(15),
      color: colors.text.tertiary || colors.text.secondary,
      marginTop: 2,
    },
    progressIndicator: {
      backgroundColor: colors.status.success,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginLeft: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    progressText: {
      fontSize: fontSize(14),
      color: isPrimaryColors ? colors.text.inverse : colors.text.primary,
      fontWeight: "600",
    },
    loadingText: {
      marginTop: 8,
      fontSize: fontSize(15),
      color: colors.text.tertiary || colors.text.secondary,
    },
    emptyContainer: {
      paddingTop: 40,
      alignItems: "center",
    },
    emptyText: {
      fontSize: 20,
      color: colors.text.secondary,
    },
  });
};
