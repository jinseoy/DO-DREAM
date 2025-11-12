import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  findNodeHandle,
  AccessibilityInfo,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { SignupScreenNavigationProp } from "../../navigation/navigationTypes";
import { useAuthStore } from "../../stores/authStore";
import { biometricUtil } from "../../utils/biometric";
import { accessibilityUtil } from "../../utils/accessibility";
import { asrService } from "../../services/asrService";

type Step = "input" | "verify" | "biometric" | "complete";
type VoiceField = "studentNumber" | "name" | null;

export default function SignupScreen() {
  const navigation = useNavigation<SignupScreenNavigationProp>();
  const { verifyStudent, registerStudent, isLoading } = useAuthStore();

  // 입력 상태
  const [studentNumber, setStudentNumber] = useState("");
  const [name, setName] = useState("");

  // 단계 상태
  const [currentStep, setCurrentStep] = useState<Step>("input");

  // 음성 입력 상태
  const [voiceTarget, setVoiceTarget] = useState<VoiceField>(null);
  const [voiceListening, setVoiceListening] = useState(false);
  const asrOffRef = useRef<(() => void) | null>(null);

  // 화면 진입 시 음성 안내
  useEffect(() => {
    accessibilityUtil.announce(
      "회원가입 화면입니다. 학번과 이름을 입력해주세요."
    );
  }, []);

  // 음성 입력 핸들러
  const startVoiceFor = async (target: VoiceField) => {
    try {
      // 기존 구독 제거
      if (asrOffRef.current) asrOffRef.current();

      // 구독
      asrOffRef.current = asrService.on((text, isFinal) => {
        if (!text) return;
        if (target === "studentNumber") {
          // 숫자만 추출
          const digits = text.replace(/[^0-9]/g, "");
          if (!isFinal) {
            setStudentNumber(digits);
          } else {
            setStudentNumber(digits);
            stopVoice(false);
            accessibilityUtil.announceWithVibration("학번 입력이 완료되었습니다", "success");
          }
        } else if (target === "name") {
          if (!isFinal) {
            setName(text.trim());
          } else {
            setName(text.trim());
            stopVoice(false);
            accessibilityUtil.announceWithVibration("이름 입력이 완료되었습니다", "success");
          }
        }
      });

      await asrService.start({ lang: "ko-KR", interimResults: true, continuous: true, autoRestart: true });
      setVoiceTarget(target);
      setVoiceListening(true);

      const label = target === "studentNumber" ? "학번" : "이름";
      AccessibilityInfo.announceForAccessibility(`${label} 음성 입력을 시작합니다. 말씀하세요.`);
    } catch {
      AccessibilityInfo.announceForAccessibility("마이크 권한이 필요합니다.");
    }
  };

  const stopVoice = async (announce = true) => {
    await asrService.stop();
    if (asrOffRef.current) { asrOffRef.current(); asrOffRef.current = null; }
    setVoiceListening(false);
    setVoiceTarget(null);
    if (announce) AccessibilityInfo.announceForAccessibility("음성 입력을 종료했습니다.");
  };

  useEffect(() => {
    return () => {
      asrService.abort();
      if (asrOffRef.current) asrOffRef.current();
    };
  }, []);

  // Step 1: 학번/이름 입력
  const handleInputComplete = async () => {
    if (!studentNumber.trim() || !name.trim()) {
      Alert.alert("입력 오류", "학번과 이름을 모두 입력해주세요.");
      accessibilityUtil.announceWithVibration(
        "학번과 이름을 입력해주세요",
        "warning"
      );
      return;
    }

    setCurrentStep("verify");
    // 학번을 한 자리씩 읽도록 공백으로 구분
    const studentNumberSpaced = studentNumber.split("").join(" ");
    // accessibilityUtil.announce(
    //   `입력하신 정보를 확인해주세요. 학번 ${studentNumberSpaced}, 이름 ${name}. 맞으면 확인 버튼을 탭하세요.`
    // );
  };

  // Step 2: 정보 확인 및 사전 인증
  const handleVerify = async () => {
    try {
      accessibilityUtil.announce("학번과 이름을 확인하고 있습니다");

      // 1단계: 사전 인증 (백엔드에 학번/이름 확인)
      const isVerified = await verifyStudent(studentNumber, name);

      if (!isVerified) {
        Alert.alert("인증 실패", "학번과 이름이 일치하지 않습니다.");
        accessibilityUtil.announceWithVibration(
          "학번과 이름이 일치하지 않습니다",
          "error"
        );
        setCurrentStep("input");
        return;
      }

      // 인증 성공 → 생체인증 등록으로
      accessibilityUtil.announceWithVibration(
        "인증되었습니다. 생체인증을 등록해주세요",
        "success"
      );
      setCurrentStep("biometric");

      // 자동으로 생체인증 프롬프트
      setTimeout(() => {
        handleBiometricRegister();
      }, 1000);
    } catch (error: any) {
      Alert.alert("오류", error.message || "인증에 실패했습니다");
      accessibilityUtil.announceWithVibration("인증에 실패했습니다", "error");
      setCurrentStep("input");
    }
  };

  // Step 3: 생체인증 등록 및 회원가입 완료
  const handleBiometricRegister = async () => {
    try {
      // 1. 생체인증 가능 여부 확인
      const isAvailable = await biometricUtil.isSupported();
      if (!isAvailable) {
        Alert.alert("생체인증 불가", "이 기기는 생체인증을 지원하지 않습니다.");
        accessibilityUtil.announceWithVibration(
          "생체인증을 지원하지 않는 기기입니다",
          "error"
        );
        return;
      }

      // 2. 생체인증 등록 여부 확인
      const isEnrolled = await biometricUtil.isEnrolled();
      if (!isEnrolled) {
        Alert.alert(
          "생체인증 미등록",
          "기기에 생체인증이 등록되어 있지 않습니다. 설정에서 등록 후 다시 시도해주세요."
        );
        accessibilityUtil.announceWithVibration(
          "기기에 생체인증을 먼저 등록해주세요",
          "warning"
        );
        return;
      }

      // 3. 생체인증 실행
      accessibilityUtil.announce("생체인증을 진행해주세요");
      const result = await biometricUtil.authenticate({
        promptMessage: "생체인증을 등록하세요",
        cancelLabel: "취소",
      });

      if (!result.success) {
        throw new Error(result.error || "생체인증 실패");
      }

      // 4. 회원가입 API 호출 (2단계: 기기 정보 등록)
      accessibilityUtil.announce("회원가입을 진행하고 있습니다");
      await registerStudent(studentNumber, name);

      setCurrentStep("complete");
      accessibilityUtil.announceWithVibration(
        "회원가입이 완료되었습니다",
        "success"
      );

      setTimeout(() => {
        navigation.replace("Library");
      }, 1500);
    } catch (error: any) {
      Alert.alert("회원가입 실패", error.message || "회원가입에 실패했습니다");
      accessibilityUtil.announceWithVibration(
        "회원가입에 실패했습니다",
        "error"
      );
      setCurrentStep("verify");
    }
  };

  // Step별 렌더링
  const renderStepContent = () => {
    switch (currentStep) {
      case "input":
        // isLoading 상태에 따라 버튼 레이블 동적 변경
        const inputButtonLabel = isLoading
          ? "다음 단계로 처리 중입니다. 잠시 기다려주세요."
          : "다음";

        return (
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.contentContainer}>
                <Text style={styles.title}>회원가입</Text>
                <Text style={styles.subtitle}>학번과 이름을 입력해주세요</Text>

                {/* 학번 입력 */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>학번</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      value={studentNumber}
                      onChangeText={setStudentNumber}
                      placeholder="학번을 입력하세요"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      accessibilityLabel="학번 입력"
                      accessibilityHint="숫자로 학번을 입력하세요"
                    />
                    <TouchableOpacity
                      style={[
                        styles.voiceButton,
                        voiceListening && voiceTarget === "studentNumber" && { backgroundColor: "#FFCDD2", borderColor: "#E53935" }
                      ]}
                      onPress={
                        voiceListening && voiceTarget === "studentNumber"
                          ? () => stopVoice(true)
                          : () => startVoiceFor("studentNumber")
                      }
                      accessibilityLabel={voiceListening && voiceTarget === "studentNumber" ? "학번 음성 입력 중지" : "학번 음성 입력"}
                      accessibilityHint="음성으로 학번을 입력합니다"
                      accessibilityRole="button"
                    >
                      <Text style={styles.voiceButtonText}>입력</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 이름 입력 */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>이름</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      value={name}
                      onChangeText={setName}
                      placeholder="이름을 입력하세요"
                      placeholderTextColor="#999"
                      accessibilityLabel="이름 입력"
                      accessibilityHint="한글로 이름을 입력하세요"
                    />
                    <TouchableOpacity
                      style={[
                        styles.voiceButton,
                        voiceListening && voiceTarget === "name" && { backgroundColor: "#FFCDD2", borderColor: "#E53935" }
                      ]}
                      onPress={
                        voiceListening && voiceTarget === "name"
                          ? () => stopVoice(true)
                          : () => startVoiceFor("name")
                      }
                      accessibilityLabel={voiceListening && voiceTarget === "name" ? "이름 음성 입력 중지" : "이름 음성 입력"}
                      accessibilityHint="음성으로 이름을 입력합니다"
                      accessibilityRole="button"
                    >
                      <Text style={styles.voiceButtonText}>입력</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 다음 버튼 */}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (!studentNumber || !name) && styles.buttonDisabled,
                  ]}
                  onPress={handleInputComplete}
                  disabled={!studentNumber || !name || isLoading}
                  // 로딩 상태에 따라 Label 변경
                  accessibilityLabel={inputButtonLabel}
                  accessibilityHint="입력한 정보를 확인합니다"
                  accessibilityState={{ disabled: !studentNumber || !name }}
                >
                  {isLoading ? (
                    // ActivityIndicator 접근성 비활성화
                    <ActivityIndicator color="#FFF" accessible={false} />
                  ) : (
                    // Text 접근성 비활성화
                    <Text style={styles.primaryButtonText} accessible={false}>다음</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        );

      case "verify":
        // isLoading 상태에 따라 버튼 레이블 동적 변경
        const verifyButtonLabel = isLoading
          ? "정보 확인 중입니다. 잠시 기다려주세요."
          : "확인";

        return (
          <View style={styles.container}>
            <Text style={styles.title}>정보 확인</Text>
            {/* <Text style={styles.subtitle}>입력하신 정보가 맞나요?</Text> */}

            <View
              style={styles.infoBox}
              accessible={true}
              accessibilityLabel={`학번 ${studentNumber.split("").join(" ")}`}
            >
              <Text style={styles.infoLabel}>학번</Text>
              <Text style={styles.infoValue}>{studentNumber}</Text>
            </View>

            <View
              style={styles.infoBox}
              accessible={true}
              accessibilityLabel={`이름 ${name}`}
            >
              <Text style={styles.infoLabel}>이름</Text>
              <Text style={styles.infoValue}>{name}</Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleVerify}
              disabled={isLoading}
              // 로딩 상태에 따라 Label 변경
              accessibilityLabel={verifyButtonLabel}
              accessibilityHint="정보를 확인하고 생체인증을 등록합니다"
            >
              {isLoading ? (
                // ActivityIndicator 접근성 비활성화
                <ActivityIndicator color="#FFF" accessible={false} />
              ) : (
                // Text 접근성 비활성화
                <Text style={styles.primaryButtonText} accessible={false}>확인</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setCurrentStep("input")}
              disabled={isLoading}
              accessibilityLabel="수정"
              accessibilityHint="입력 화면으로 돌아갑니다"
            >
              <Text style={styles.secondaryButtonText}>수정</Text>
            </TouchableOpacity>
          </View>
        );

      case "biometric":
        return (
          <View style={styles.container}>
            <Text style={styles.title}>생체인증 등록</Text>
            <Text style={styles.subtitle}>
              로그인 시 사용할 생체인증을 등록해주세요
            </Text>

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>등록 중...</Text>
              </View>
            )}
          </View>
        );

      case "complete":
        return (
          <View style={styles.container}>
            <Text style={styles.title}>회원가입 완료!</Text>
            <Text style={styles.subtitle}>환영합니다</Text>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.screen}>{renderStepContent()}</SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    minHeight: "100%",
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 36,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginBottom: 48,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    fontSize: 24,
    padding: 16,
    borderWidth: 2,
    borderColor: "#DDD",
    borderRadius: 12,
    backgroundColor: "#FFF",
  },
  voiceButton: {
    width: 56,
    height: 56,
    marginLeft: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 12,
    backgroundColor: "#F0F8FF",
  },
  voiceButtonText: {
    fontSize: 28,
  },
  primaryButton: {
    backgroundColor: "#007AFF",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
    minHeight: 88,
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: "#F0F0F0",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    minHeight: 88,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#333",
    fontSize: 24,
    fontWeight: "bold",
  },
  buttonDisabled: {
    backgroundColor: "#CCC",
  },
  infoBox: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 28,
    fontWeight: "600",
  },
  loadingContainer: {
    alignItems: "center",
    marginTop: 48,
  },
  loadingText: {
    fontSize: 20,
    color: "#666",
    marginTop: 16,
  },
});