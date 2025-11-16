import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  AccessibilityInfo,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppSettingsStore } from "../stores/appSettingsStore";
import { PlayMode } from "../types/playMode";
import * as Haptics from "expo-haptics";

interface PlayerSettingsModalProps {
  visible: boolean;
  currentPlayMode: PlayMode;
  onPlayModeChange: (mode: PlayMode) => void;
  onClose: () => void;
}

export default function PlayerSettingsModal({
  visible,
  currentPlayMode,
  onPlayModeChange,
  onClose,
}: PlayerSettingsModalProps) {
  const insets = useSafeAreaInsets();
  const { settings, setTTSRate } = useAppSettingsStore();

  // TalkBack / VoiceOver 사용 여부
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // 스크린리더 활성화 상태 감지
  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isScreenReaderEnabled()
      .then((enabled) => {
        if (isMounted) {
          setIsScreenReaderEnabled(enabled);
        }
      })
      .catch(() => {
        // 상태 못 가져와도 치명적이지 않음
      });

    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      (enabled: boolean) => {
        setIsScreenReaderEnabled(enabled);
      }
    );

    return () => {
      isMounted = false;
      // @ts-ignore
      if (subscription && typeof subscription.remove === "function") {
        // @ts-ignore
        subscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        AccessibilityInfo.announceForAccessibility(
          "학습 옵션 메뉴가 열렸습니다. 재생 모드와 속도를 변경할 수 있습니다."
        );
      }, 300);
    }
  }, [visible]);

  const handlePlayModeChange = (mode: PlayMode) => {
    onPlayModeChange(mode);
    Haptics.selectionAsync();
    const modeLabels: Record<PlayMode, string> = {
      single: "한 섹션씩",
      continuous: "연속 재생",
      repeat: "반복 재생",
    };
    AccessibilityInfo.announceForAccessibility(
      `${modeLabels[mode]} 모드로 변경되었습니다`
    );
  };

  const handleSpeedChange = (speed: number) => {
    setTTSRate(speed);
    Haptics.selectionAsync();
    AccessibilityInfo.announceForAccessibility(
      `재생 속도가 ${speed.toFixed(1)}배로 변경되었습니다`
    );
  };

  const handleClose = () => {
    Haptics.selectionAsync();
    AccessibilityInfo.announceForAccessibility("학습 옵션 메뉴를 닫습니다");
    onClose();
  };

  const speedOptions = [0.5, 0.8, 1.0, 1.2, 1.5, 2.0];

  // 현재 ttsRate와 가장 가까운 speedOption을 찾습니다.
  const findClosestSpeed = (rate: number, options: number[]) => {
    return options.reduce((prev, curr) => {
      return Math.abs(curr - rate) < Math.abs(prev - rate) ? curr : prev;
    });
  };

  const selectedSpeed = findClosestSpeed(settings.ttsRate, speedOptions);

  const playModeOptions: Array<{
    key: PlayMode;
    label: string;
    description: string;
  }> = [
    {
      key: "single",
      label: "한 섹션씩",
      description: "섹션을 하나씩 끊어서 재생합니다",
    },
    {
      key: "continuous",
      label: "연속 재생",
      description: "챕터 전체를 이어서 재생합니다",
    },
    {
      key: "repeat",
      label: "반복 재생",
      description: "현재 섹션을 반복해서 재생합니다",
    },
  ];

  // 스크린리더가 켜져 있을 때는 하단 버튼이 내비게이션 바에 가리지 않도록
  // 추가 여백을 확보합니다.
  // const scrollBottomPadding = isScreenReaderEnabled ? 120 : 32;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent={false}
      accessibilityViewIsModal={true}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={handleClose}
        accessible={false}
      >
        <Pressable
          style={[
            styles.modalContent,
            {
              paddingBottom: insets.bottom,
            },
          ]}
          onStartShouldSetResponder={() => true} // 모달 내부 터치 시 닫힘 방지
        >
          {/* 헤더 */}
          <View style={styles.modalHeader}>
            <Text
              style={styles.modalTitle}
              accessible={true}
              accessibilityRole="header"
            >
              학습 옵션
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              accessible={true}
              accessibilityLabel="닫기"
              accessibilityRole="button"
            >
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 32 },
            ]}
          >
            {/* 1. 재생 속도 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>재생 속도</Text>
              <View style={styles.speedGrid}>
                {speedOptions.map((speed) => (
                  <TouchableOpacity
                    key={speed}
                    style={[
                      styles.speedButton,
                      selectedSpeed === speed && styles.speedButtonActive,
                    ]}
                    onPress={() => handleSpeedChange(speed)}
                    accessible={true}
                    accessibilityLabel={`${speed.toFixed(1)}배속`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedSpeed === speed }}
                  >
                    <Text
                      style={[
                        styles.speedButtonText,
                        selectedSpeed === speed && styles.speedButtonTextActive,
                      ]}
                    >
                      {speed.toFixed(1)}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 구분선 */}
            <View style={styles.divider} />

            {/* 2. 재생 모드 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>재생 모드</Text>
              {playModeOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.optionButton,
                    currentPlayMode === option.key && styles.optionButtonActive,
                  ]}
                  onPress={() => handlePlayModeChange(option.key)}
                  accessible={true}
                  accessibilityLabel={option.label}
                  accessibilityHint={option.description}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: currentPlayMode === option.key,
                  }}
                >
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionLabel,
                        currentPlayMode === option.key &&
                          styles.optionLabelActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.optionDescription,
                        currentPlayMode === option.key &&
                          styles.optionDescriptionActive,
                      ]}
                    >
                      {option.description}
                    </Text>
                  </View>
                  {currentPlayMode === option.key && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  // 모달 높이 및 하단 여백 조정 (useSafeAreaInsets로 동적 처리)
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "95%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333333",
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    minHeight: 48,
    minWidth: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#424242",
  },
  scrollView: {},
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333333",
    marginBottom: 16,
  },
  divider: {
    height: 2,
    backgroundColor: "#E0E0E0",
    marginVertical: 8,
  },

  // 재생 모드 옵션
  optionButton: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    minHeight: 80,
    justifyContent: "center",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  optionButtonActive: {
    backgroundColor: "#E3F2FD",
    borderColor: "#2196F3",
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: "#424242",
    marginBottom: 4,
  },
  optionLabelActive: {
    color: "#0D47A1",
  },
  optionDescription: {
    fontSize: 16,
    fontWeight: "500",
    color: "#757575",
  },
  optionDescriptionActive: {
    color: "#1976D2",
  },
  checkmark: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2196F3",
    marginLeft: 12,
  },
  speedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  speedButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    height: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  speedButtonActive: {
    backgroundColor: "#E3F2FD",
    borderColor: "#2196F3",
  },
  speedButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#424242",
  },
  speedButtonTextActive: {
    color: "#0D47A1",
  },
});
