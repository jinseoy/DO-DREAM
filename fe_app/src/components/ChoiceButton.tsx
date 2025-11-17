import React from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { COLORS } from "../constants/colors";

interface ChoiceButtonProps {
  onPress: () => void;
  label: string;
  subLabel: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

export default function ChoiceButton({
  onPress,
  label,
  subLabel,
  accessibilityLabel,
  style,
}: ChoiceButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.choiceButton, style]}
      onPress={onPress}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <View style={styles.buttonContent}>
        <Text style={styles.buttonText}>{label}</Text>
        <Text style={styles.buttonSubtext}>{subLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  choiceButton: {
    backgroundColor: COLORS.primary.lightest, // 매우 밝은 남색 배경
    borderRadius: 12,
    padding: 24, // 터치 영역 증가
    borderWidth: 3, // 경계선 두께 증가 (접근성)
    borderColor: COLORS.primary.main, // 메인 남색 테두리
    minHeight: 100, // 최소 높이 증가
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  buttonText: {
    fontSize: 26, // 가독성 향상
    fontWeight: "700",
    color: COLORS.text.primary, // 검은색 텍스트 (충분한 대비)
    flex: 1
  },
  buttonSubtext: {
    fontSize: 20, // 가독성 향상
    fontWeight: "600",
    color: COLORS.text.secondary, // 회색 텍스트
    marginLeft: 12
  },
});
