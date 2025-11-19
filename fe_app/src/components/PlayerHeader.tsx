import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import BackButton from "./BackButton";
import VoiceCommandButton from "./VoiceCommandButton";
import { createCommonStyles } from "../styles/commonStyles";
import { Material } from "../types/material";
import { Chapter } from "../types/chapter";
import { useTheme } from "../contexts/ThemeContext";

type PlayModeKey = "single" | "continuous" | "repeat";

const UI_MODE_LABELS: Record<PlayModeKey, string> = {
  continuous: "연속",
  repeat: "반복",
  single: "한 섹션씩",
};

interface PlayerHeaderProps {
  material: Material;
  chapter: Chapter;
  playMode: PlayModeKey;
  isBookmarked: boolean;
  onBackPress: () => void;
  onToggleBookmark: () => void;
  onBeforeListen: () => void;
}

export default function PlayerHeader({
  material,
  chapter,
  playMode,
  isBookmarked,
  onBackPress,
  onToggleBookmark,
  onBeforeListen,
}: PlayerHeaderProps) {
  const { colors, fontSize } = useTheme();
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);

  const styles = useMemo(() => createStyles(colors, fontSize), [colors, fontSize]);

  return (
    <View style={styles.header}>
      {/* 상단: 뒤로 / 음성 명령 / 저장하기 */}
      <View style={styles.headerTop}>
        <BackButton
          onPress={onBackPress}
          style={commonStyles.headerBackButton}
          accessibilityHint="교재 듣기 화면입니다. 음성 명령 버튼으로 재생, 일시정지, 다음, 이전 등의 명령을 사용할 수 있습니다."
        />

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[
              styles.bookmarkHeaderButton,
              isBookmarked && styles.bookmarkHeaderButtonActive,
            ]}
            onPress={onToggleBookmark}
            accessible
            accessibilityLabel={isBookmarked ? "저장 해제하기" : "현재 챕터 저장하기"}
            accessibilityHint={
              isBookmarked
                ? "현재 챕터의 저장을 해제합니다."
                : "현재 학습 위치를 저장합니다."
            }
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.bookmarkHeaderButtonText,
                isBookmarked && styles.bookmarkHeaderButtonTextActive,
              ]}
            >
              {isBookmarked ? "저장 해제" : "저장하기"}
            </Text>
          </TouchableOpacity>

          <VoiceCommandButton
            style={commonStyles.headerVoiceButton}
            accessibilityHint="두 번 탭한 후 재생, 일시정지, 다음, 이전, 질문하기, 저장하기, 퀴즈 풀기, 설정 열기, 한 섹션씩 모드, 연속 모드, 반복 모드, 뒤로 가기와 같은 명령을 말씀하세요."
            onBeforeListen={onBeforeListen}
          />
        </View>
      </View>

      {/* 하단: 과목 / 챕터 제목 / 모드 표시 */}
      <View style={styles.headerInfo}>
        <Text style={styles.subjectText}>{material.subject}</Text>
        <Text
          style={styles.chapterTitle}
          accessibilityRole="header"
          accessibilityLabel={`${material.subject} ${chapter.title}, 현재 모드 ${UI_MODE_LABELS[playMode]} 모드`}
        >
          {chapter.title}
        </Text>
        <Text style={styles.modeIndicator}>
          모드: {UI_MODE_LABELS[playMode]}
        </Text>
      </View>
    </View>
  );
}

const HEADER_BTN_MIN_HEIGHT = 52;

const createStyles = (colors: any, fontSize: (size: number) => number) => {
  const isPrimaryColors = 'primary' in colors;
  const isHighContrast = 'button' in colors;

  return StyleSheet.create({
    header: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      borderBottomWidth: 2,
      borderBottomColor: isPrimaryColors ? colors.border.light : colors.border.default,
      backgroundColor: colors.background.default,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 0,
      paddingVertical: 0,
      borderBottomWidth: 0,
      minHeight: 56,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    bookmarkHeaderButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 3,
      borderColor: isPrimaryColors ? colors.status.info : colors.status.info,
      backgroundColor: isPrimaryColors ? colors.status.infoLight : colors.background.elevated,
      minHeight: HEADER_BTN_MIN_HEIGHT,
      minWidth: 100,
      justifyContent: "center",
      alignItems: "center",
    },
    bookmarkHeaderButtonActive: {
      borderColor: isPrimaryColors ? "#43A047" : colors.status.success,
      backgroundColor: isPrimaryColors ? "#E8F5E9" : colors.background.elevated,
    },
    bookmarkHeaderButtonText: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text.primary,
    },
    bookmarkHeaderButtonTextActive: {
      color: isPrimaryColors ? "#1B5E20" : colors.status.success,
    },
    headerInfo: {
      marginTop: 8,
    },
    subjectText: {
      fontSize: 18,
      color: colors.text.secondary,
      marginBottom: 4,
    },
    chapterTitle: {
      fontSize: fontSize(24),
      fontWeight: "bold",
      color: colors.text.primary,
      marginBottom: 6,
    },
    modeIndicator: {
      fontSize: fontSize(15),
      color: isPrimaryColors ? colors.status.info : colors.status.info,
      fontWeight: "600",
    },
  });
};
