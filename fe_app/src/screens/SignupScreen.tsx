import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { biometricUtil } from "../utils/biometric";
import { accessibilityUtil } from "../utils/accessibility";
import { useAuthStore } from "../stores/authStore";
import * as Speech from "expo-speech";

type SignupScreenNavigationProp = NativeStackNavigationProp<any>;

export default function SignupScreen() {
  const navigation = useNavigation<SignupScreenNavigationProp>();
  const { signup } = useAuthStore();

  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "input" | "confirm" | "biometric"
  >("input");

  // 음성 입력 상태
  const [isListeningStudentId, setIsListeningStudentId] = useState(false);
  const [isListeningName, setIsListeningName] = useState(false);

  useEffect(() => {
    accessibilityUtil.announce(
      "회원가입 화면입니다. 학번과 이름을 입력하거나 음성으로 말씀해주세요."
    );
  }, []);

  const handleGoBack = () => {
    navigation.goBack();
  };

  // 음성 입력 시작 (학번)
  const handleVoiceInputStudentId = async () => {
    setIsListeningStudentId(true);
    accessibilityUtil.announce("학번을 말씀해주세요");

    // TODO: 실제 음성 인식 구현
    // 지금은 TTS로 안내만
    await Speech.speak("학번을 말씀해주세요");

    // 3초 후 음성 입력 종료 (실제로는 음성 인식 결과가 오면 종료)
    setTimeout(() => {
      setIsListeningStudentId(false);
      // TODO: 음성 인식 결과를 studentId에 설정
      accessibilityUtil.announce("음성 입력이 종료되었습니다");
    }, 3000);
  };

  // 음성 입력 시작 (이름)
  const handleVoiceInputName = async () => {
    setIsListeningName(true);
    accessibilityUtil.announce("이름을 말씀해주세요");

    await Speech.speak("이름을 말씀해주세요");

    setTimeout(() => {
      setIsListeningName(false);
      accessibilityUtil.announce("음성 입력이 종료되었습니다");
    }, 3000);
  };

  // 입력 확인
  const handleConfirmInput = () => {
    if (!studentId.trim() || !name.trim()) {
      accessibilityUtil.announceWithVibration(
        "학번과 이름을 모두 입력해주세요",
        "error"
      );
      Alert.alert("입력 오류", "학번과 이름을 모두 입력해주세요");
      return;
    }

    // 입력 내용 확인
    const confirmMessage = `입력하신 정보는 학번 ${studentId}, 이름 ${name}입니다. 맞으면 확인을 눌러주세요.`;

    accessibilityUtil.speak({
      text: confirmMessage,
      onDone: () => {
        setCurrentStep("confirm");
      },
    });
  };

  // 백엔드 인증 및 생체인증 등록
  const handleSignup = async () => {
    setIsLoading(true);

    try {
      // TODO: 백엔드 API 호출 - 학번/이름 인증
      // const response = await signupApi({ studentId, name });

      accessibilityUtil.announceWithVibration("인증 성공", "success");

      // 생체인증 단계로 이동
      setCurrentStep("biometric");
      setIsLoading(false);

      // 생체인증 등록 안내
      await accessibilityUtil.speak({
        text: "이제 생체 인증을 등록합니다",
      });

      // 잠시 후 자동으로 생체인증 시작
      setTimeout(() => {
        handleBiometricRegistration();
      }, 1000);
    } catch (error) {
      setIsLoading(false);
      console.error("[Signup] Verification error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "학번 또는 이름이 등록되지 않았습니다. 담당 선생님께 문의해주세요.";

      accessibilityUtil.announceWithVibration(errorMessage, "error");

      Alert.alert("인증 실패", errorMessage, [{ text: "확인" }]);
      setCurrentStep("input");
    }
  };

  // 생체인증 등록
  const handleBiometricRegistration = async () => {
    try {
      // 생체인증 사용 가능 확인
      const { available, reason } = await biometricUtil.canUseBiometric();

      if (!available) {
        accessibilityUtil.announceWithVibration(
          reason || "생체인증을 사용할 수 없습니다.",
          "error"
        );

        Alert.alert(
          "생체인증 불가",
          reason || "생체인증을 사용할 수 없습니다.",
          [
            {
              text: "확인",
              onPress: () => navigation.goBack(),
            },
          ]
        );
        return;
      }

      const biometricType = await biometricUtil.getBiometricTypeDescription();

      // 생체인증 실행
      const result = await biometricUtil.authenticate({
        promptMessage: `${biometricType}를 등록하세요`,
        cancelLabel: "취소",
      });

      if (result.success) {
        // 생체인증 등록 성공
        accessibilityUtil.announceWithVibration(
          "생체인증이 등록되었습니다. 회원가입이 완료되었습니다.",
          "success"
        );

        // TODO: 실제 회원가입 완료 처리
        // 임시: 더미 데이터로 회원가입
        const dummyStudent = {
          id: 1,
          studentId: studentId,
          name: name,
          grade: 1,
          classNumber: 1,
        };

        signup("dummy-access-token-" + Date.now(), dummyStudent);

        Alert.alert(
          "회원가입 완료",
          "회원가입이 완료되었습니다. 이제 로그인하여 서비스를 이용하세요.",
          [
            {
              text: "확인",
              onPress: () => navigation.replace("Library"),
            },
          ]
        );
      } else {
        // 생체인증 실패
        accessibilityUtil.announceWithVibration(
          result.error || "생체인증 등록에 실패했습니다.",
          "error"
        );

        Alert.alert(
          "생체인증 실패",
          result.error ||
            "생체인증 등록에 실패했습니다. 다시 시도하시겠습니까?",
          [
            {
              text: "다시 시도",
              onPress: () => handleBiometricRegistration(),
            },
            {
              text: "취소",
              onPress: () => setCurrentStep("input"),
              style: "cancel",
            },
          ]
        );
      }
    } catch (error) {
      console.error("[Signup] Biometric registration error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "생체인증 등록 중 오류가 발생했습니다.";

      accessibilityUtil.announceWithVibration(errorMessage, "error");

      Alert.alert("오류", errorMessage, [{ text: "확인" }]);
      setCurrentStep("input");
    }
  };

  // 입력 단계 렌더링
  const renderInputStep = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title} accessible={true} accessibilityRole="header">
          회원가입
        </Text>
        <Text style={styles.subtitle}>학번과 이름을 입력해주세요</Text>
      </View>

      <View style={styles.inputSection}>
        {/* 학번 입력 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label} accessible={true}>
            학번
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={studentId}
              onChangeText={setStudentId}
              placeholder="예: 20240101"
              placeholderTextColor="#999999"
              keyboardType="numeric"
              maxLength={10}
              accessible={true}
              accessibilityLabel="학번 입력"
              accessibilityHint="숫자로 된 학번을 입력하세요"
            />
            <TouchableOpacity
              style={styles.voiceButton}
              onPress={handleVoiceInputStudentId}
              disabled={isListeningStudentId}
              accessible={true}
              accessibilityLabel="음성으로 학번 입력"
              accessibilityRole="button"
            >
              <Text style={styles.voiceButtonText}>
                {isListeningStudentId ? "🎤..." : "🎤"}
              </Text>
            </TouchableOpacity>
          </View>
          {/* {studentId.length > 0 && (
            <Text style={styles.confirmText} accessible={true}>
              입력: {studentId}
            </Text>
          )} */}
        </View>

        {/* 이름 입력 */}
        <View style={styles.inputGroup}>
          <Text style={styles.label} accessible={true}>
            이름
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="예: 홍길동"
              placeholderTextColor="#999999"
              maxLength={20}
              accessible={true}
              accessibilityLabel="이름 입력"
              accessibilityHint="본명을 입력하세요"
            />
            <TouchableOpacity
              style={styles.voiceButton}
              onPress={handleVoiceInputName}
              disabled={isListeningName}
              accessible={true}
              accessibilityLabel="음성으로 이름 입력"
              accessibilityRole="button"
            >
              <Text style={styles.voiceButtonText}>
                {isListeningName ? "🎤..." : "🎤"}
              </Text>
            </TouchableOpacity>
          </View>
          {/* {name.length > 0 && (
            <Text style={styles.confirmText} accessible={true}>
              입력: {name}
            </Text>
          )} */}
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!studentId || !name) && styles.submitButtonDisabled,
          ]}
          onPress={handleConfirmInput}
          disabled={!studentId || !name}
          accessible={true}
          accessibilityLabel="다음"
          accessibilityRole="button"
          accessibilityHint="입력한 정보를 확인합니다"
          accessibilityState={{ disabled: !studentId || !name }}
        >
          <Text style={styles.submitButtonText}>다음</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // 확인 단계 렌더링
  const renderConfirmStep = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title} accessible={true} accessibilityRole="header">
          정보 확인
        </Text>
        <Text style={styles.subtitle}>입력하신 정보를 확인해주세요</Text>
      </View>

      <View style={styles.confirmSection}>
        <View style={styles.confirmCard}>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>학번</Text>
            <Text style={styles.confirmValue} accessible={true}>
              {studentId}
            </Text>
          </View>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>이름</Text>
            <Text style={styles.confirmValue} accessible={true}>
              {name}
            </Text>
          </View>
        </View>

        <View style={styles.confirmButtonGroup}>
          <TouchableOpacity
            style={[styles.submitButton, styles.confirmButton]}
            onPress={handleSignup}
            disabled={isLoading}
            accessible={true}
            accessibilityLabel="확인"
            accessibilityRole="button"
            accessibilityHint="정보가 맞으면 확인을 눌러주세요"
          >
            {isLoading ? (
              <ActivityIndicator size="large" color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>확인</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, styles.cancelButton]}
            onPress={() => setCurrentStep("input")}
            disabled={isLoading}
            accessible={true}
            accessibilityLabel="수정하기"
            accessibilityRole="button"
          >
            <Text style={[styles.submitButtonText, styles.cancelButtonText]}>
              수정하기
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  // 생체인증 등록 단계 렌더링
  const renderBiometricStep = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title} accessible={true} accessibilityRole="header">
          생체인증 등록
        </Text>
        <Text style={styles.subtitle}>
          로그인에 사용할{"\n"}생체 인증을 등록하세요
        </Text>
      </View>

      <View style={styles.biometricSection}>
        <Text style={styles.biometricIcon}>🔐</Text>
        <ActivityIndicator size="large" color="#192b55" />
        <Text style={styles.biometricText} accessible={true}>
          생체 인증을 진행 중입니다...
        </Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            accessible={true}
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>← 뒤로</Text>
          </TouchableOpacity>

          <View style={styles.content}>
            {currentStep === "input" && renderInputStep()}
            {currentStep === "confirm" && renderConfirmStep()}
            {currentStep === "biometric" && renderBiometricStep()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    paddingTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 20,
    color: "#2196F3",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    color: "#666666",
    textAlign: "center",
    lineHeight: 32,
  },
  inputSection: {
    gap: 32,
  },
  inputGroup: {
    gap: 12,
  },
  label: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 20,
    fontSize: 24,
    color: "#333333",
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  voiceButton: {
    backgroundColor: "#fec73d",
    borderRadius: 12,
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fec73d",
  },
  voiceButtonText: {
    fontSize: 36,
  },
  confirmText: {
    fontSize: 20,
    color: "#192b55",
    marginTop: 8,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#192b55",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    minHeight: 88,
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#192b55",
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: "#CCCCCC",
    borderColor: "#999999",
  },
  submitButtonText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
  },
  confirmSection: {
    gap: 32,
  },
  confirmCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    padding: 32,
    gap: 24,
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  confirmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confirmLabel: {
    fontSize: 24,
    color: "#666666",
    fontWeight: "600",
  },
  confirmValue: {
    fontSize: 28,
    color: "#333333",
    fontWeight: "bold",
  },
  confirmButtonGroup: {
    gap: 16,
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
  },
  cancelButton: {
    backgroundColor: "#ffffff",
    borderColor: "#e0e0e0",
  },
  cancelButtonText: {
    color: "#666666",
  },
  biometricSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
  },
  biometricIcon: {
    fontSize: 96,
  },
  biometricText: {
    fontSize: 24,
    color: "#666666",
    textAlign: "center",
  },
});
