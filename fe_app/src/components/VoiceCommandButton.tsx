import React, { useCallback, useContext } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  AccessibilityInfo,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { TriggerContext } from "../triggers/TriggerContext";

type VoiceCommandButtonProps = {
  /**
   * 버튼 레이블 (시각적으로 보이는 텍스트)
   * 기본값: "음성 명령"
   */
  label?: string;

  /**
   * 인식 중일 때 버튼 안에 표시할 텍스트
   * 기본값: "듣는 중…"
   */
  listeningLabel?: string;

  /**
   * 스크린리더용 힌트 문구
   * 각 화면에서 상황에 맞게 전달
   */
  accessibilityHint?: string;

  /**
   * 버튼 스타일을 화면별로 조금씩 바꾸고 싶을 때
   */
  style?: StyleProp<ViewStyle>;

  /**
   * 버튼 내부 텍스트 스타일
   */
  textStyle?: StyleProp<TextStyle>;

  /**
   * 음성 인식 시작 전에 해야 하는 작업
   *  - 예: QuizScreen에서 TTS(Speech) 정지
   */
  onBeforeListen?: () => void | Promise<void>;
};

export default function VoiceCommandButton({
  label = "음성 명령",
  listeningLabel = "듣는 중…",
  accessibilityHint,
  style,
  textStyle,
  onBeforeListen,
}: VoiceCommandButtonProps) {
  const {
    startVoiceCommandListening,
    stopVoiceCommandListening,
    isVoiceCommandListening,
  } = useContext(TriggerContext);

  const handlePress = useCallback(async () => {
    // 이미 듣는 중이면 → 종료(토글)
    if (isVoiceCommandListening) {
      AccessibilityInfo.announceForAccessibility(
        "음성 명령 듣기를 종료합니다."
      );
      await stopVoiceCommandListening();
      return;
    }

    // 아직 안 듣는 중이면 → 시작
    try {
      if (onBeforeListen) {
        await onBeforeListen();
      }
    } catch (e) {
      console.warn("[VoiceCommandButton] onBeforeListen 실행 중 오류:", e);
    }

    AccessibilityInfo.announceForAccessibility(
      "음성 명령을 말씀해 주세요."
    );
    await startVoiceCommandListening();
  }, [
    isVoiceCommandListening,
    onBeforeListen,
    startVoiceCommandListening,
    stopVoiceCommandListening,
  ]);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isVoiceCommandListening && styles.buttonActive,
        style,
      ]}
      onPress={handlePress}
      accessible={true}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityHint={
        accessibilityHint ??
        "두 번 탭한 후 화면에서 안내한 명령어를 말씀하세요. 예: 재생, 일시정지, 다음, 이전, 질문하기, 뒤로 가기 등."
      }
    >
      <Text
        style={[
          styles.buttonText,
          isVoiceCommandListening && styles.buttonTextActive,
          textStyle,
        ]}
      >
        {isVoiceCommandListening ? listeningLabel : label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FF5722",
    backgroundColor: "#FFF3E0",
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonActive: {
    borderColor: "#C62828",
    backgroundColor: "#FFCDD2",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E64A19",
  },
  buttonTextActive: {
    color: "#B71C1C",
  },
});