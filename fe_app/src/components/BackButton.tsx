import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

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
};

export default function BackButton({ style, textStyle, onPress }: BackButtonProps) {
  const navigation = useNavigation();
  const handlePress = onPress || (() => navigation.goBack());

  return (
    <TouchableOpacity
      style={[styles.backButton, style]}
      onPress={handlePress}
      accessible={true}
      accessibilityLabel="뒤로가기"
      accessibilityRole="button"
      accessibilityHint="이전 화면으로 돌아갑니다"
    >
      <Text style={[styles.backButtonText, textStyle]}>← 뒤로</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 20,
    color: "#2196F3",
    fontWeight: "600",
  },
});