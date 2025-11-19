import React, { useMemo } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";

type BackButtonProps = {
  /**
   * 버튼 스타일을 화면별로 조금씩 바꾸고 싶을 때
   */
  style?: StyleProp<ViewStyle>;

  /**
   * 버튼 내부 텍스트 스타일
   */
  textStyle?: StyleProp<TextStyle>;

  /**
   * 기본 goBack() 외에 다른 동작이 필요할 때 전달하는 함수
   */
  onPress?: () => void;

  /**
   * 접근성 힌트 (선택 사항)
   */
  accessibilityHint?: string;
};

export default function BackButton({
  style,
  textStyle,
  onPress,
  accessibilityHint = "이전 화면으로 돌아갑니다.",
}: BackButtonProps) {
  const navigation = useNavigation();
  const { colors, fontSize } = useTheme();
  const styles = useMemo(() => createStyles(colors, fontSize), [colors, fontSize]);
  const handlePress = onPress || (() => navigation.goBack());

  return (
    <TouchableOpacity
      style={[styles.backButton, style]}
      onPress={handlePress}
      accessible={true}
      accessibilityLabel="뒤로가기"
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.backButtonText, textStyle]}>←   뒤로</Text>
    </TouchableOpacity>
  );
}

const createStyles = (colors: any, fontSize: (size: number) => number) => {
  const isPrimaryColors = 'primary' in colors;

  return StyleSheet.create({
    backButton: {
      paddingVertical: 12,
      paddingRight: 16,
      alignSelf: "flex-start",
      minHeight: 48,
      justifyContent: "center",
    },
    backButtonText: {
      fontSize: fontSize(22),
      color: isPrimaryColors ? colors.primary.main : colors.accent.secondary,
      fontWeight: "700",
    },
  });
};