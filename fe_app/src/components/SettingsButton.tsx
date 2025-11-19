import React, { useMemo } from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

interface SettingsButtonProps {
  onPress: () => void;
  style?: ViewStyle;
  showLabel?: boolean;
  accessibilityHint?: string;
}

export default function SettingsButton({
  onPress,
  style,
  showLabel = false,
  accessibilityHint = "재생 속도 및 화면 설정을 변경합니다.",
}: SettingsButtonProps) {
  const { colors, fontSize } = useTheme();
  const styles = useMemo(() => createStyles(colors, fontSize), [colors, fontSize]);

  return (
    <TouchableOpacity
      style={[styles.settingsButton, style]}
      onPress={onPress}
      accessible={true}
      accessibilityLabel={showLabel ? "사용자 설정" : "설정"}
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={styles.settingsIcon}>
        {showLabel ? "설정" : "⚙️"}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any, fontSize: (size: number) => number) => {
  const isPrimaryColors = 'primary' in colors;

  return StyleSheet.create({
    settingsButton: {
      minWidth: 56,
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isPrimaryColors ? colors.primary.lightest : colors.background.elevated,
      borderColor: isPrimaryColors ? colors.primary.main : colors.accent.secondary,
      borderRadius: 12,
      borderWidth: 3,
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginRight: 4,
    },
    settingsIcon: {
      fontSize: 18,
      color: isPrimaryColors ? colors.primary.main : colors.accent.secondary,
      fontWeight: "bold",
    },
  });
};
