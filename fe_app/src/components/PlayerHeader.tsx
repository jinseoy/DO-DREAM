import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import BackButton from "./BackButton";
import VoiceCommandButton from "./VoiceCommandButton";
import { commonStyles } from "../styles/commonStyles";
import { Material } from "../types/material";
import { Chapter } from "../types/chapter";

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
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <BackButton
          onPress={onBackPress}
          style={commonStyles.headerBackButton}
        />

        <View style={styles.headerRight}>
          <VoiceCommandButton
            style={commonStyles.headerVoiceButton}
            accessibilityHint="두 번 탭한 후 재생, 일시정지, 다음, 이전, 질문하기, 저장하기, 퀴즈 풀기, 설정 열기, 하나씩 모드, 연속 모드, 반복 모드, 뒤로 가기와 같은 명령을 말씀하세요"
            onBeforeListen={onBeforeListen}
          />

          <TouchableOpacity
            style={[
              styles.bookmarkHeaderButton,
              isBookmarked && styles.bookmarkHeaderButtonActive,
            ]}
            onPress={onToggleBookmark}
            accessible
            accessibilityLabel={
              isBookmarked ? "저장 해제하기" : "이 위치 저장하기"
            }
            accessibilityHint={
              isBookmarked
                ? "현재 위치의 저장을 해제합니다"
                : "현재 학습 위치를 북마크에 저장합니다"
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
        </View>
      </View>

      <View style={styles.headerInfo}>
        <Text style={styles.subjectText}>{material.subject}</Text>
        <Text style={styles.chapterTitle}>{chapter.title}</Text>
        <Text style={styles.modeIndicator}>
          모드: {UI_MODE_LABELS[playMode]}
        </Text>
      </View>
    </View>
  );
}

const HEADER_BTN_MIN_HEIGHT = 48;

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
  },
  headerTop: {
    ...commonStyles.headerContainer,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderBottomWidth: 0,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bookmarkHeaderButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#BDBDBD",
    backgroundColor: "#F6F6F6",
    minHeight: HEADER_BTN_MIN_HEIGHT,
    width: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  bookmarkHeaderButtonActive: {
    borderColor: "#43A047",
    backgroundColor: "#E8F5E9",
  },
  bookmarkHeaderButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
  },
  bookmarkHeaderButtonTextActive: { color: "#1B5E20" },
  headerInfo: { marginTop: 4 },
  subjectText: { fontSize: 18, color: "#666666", marginBottom: 4 },
  chapterTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 6,
  },
  modeIndicator: { fontSize: 15, color: "#2196F3", fontWeight: "600" },
});