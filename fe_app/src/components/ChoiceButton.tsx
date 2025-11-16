import React from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";

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
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    minHeight: 88,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  buttonText: { fontSize: 24, fontWeight: "600", color: "#333333", flex: 1 },
  buttonSubtext: { fontSize: 18, color: "#666666", marginLeft: 12 },
});
