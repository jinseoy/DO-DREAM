import React, { useMemo } from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";

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
  const { colors, fontSize } = useTheme();
  const styles = useMemo(() => createStyles(colors, fontSize), [colors, fontSize]);

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

const createStyles = (colors: any, fontSize: (size: number) => number) => {
  const isPrimaryColors = 'primary' in colors;

  return StyleSheet.create({
    choiceButton: {
      backgroundColor: isPrimaryColors ? colors.primary.lightest : colors.background.elevated,
      borderRadius: 12,
      padding: 24,
      borderWidth: 3,
      borderColor: isPrimaryColors ? colors.primary.main : colors.accent.primary,
      minHeight: 100,
    },
    buttonContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    buttonText: {
      fontSize: fontSize(26),
      fontWeight: "700",
      color: colors.text.primary,
      flex: 1
    },
    buttonSubtext: {
      fontSize: fontSize(20),
      fontWeight: "600",
      color: colors.text.secondary,
      marginLeft: 12
    },
  });
};
