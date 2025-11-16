import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { LoginScreenNavigationProp } from "../../navigation/navigationTypes";
import { useAuthStore } from "../../stores/authStore";
import { biometricUtil } from "../../utils/biometric";
import { accessibilityUtil } from "../../utils/accessibility";
import { getDeviceId, getDeviceSecret } from "../../services/appStorage";

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { loginWithBiometric, isLoading } = useAuthStore();
  const [biometricType, setBiometricType] = useState<string>("생체인증");
  const autoAuthStartedRef = useRef(false);

  useEffect(() => {
    // 1) 타입 확인 + 안내 멘트
    // 2) 안내가 끝나도록 약간의 지연 후 자동 인증 시작 (토크백 겹침 방지)
    const init = async () => {
      const type = await biometricUtil.getBiometricTypeDescription();
      setBiometricType(type);

      accessibilityUtil.announce(
        `${type} 로그인 화면입니다. ${type} 버튼을 눌러 로그인하세요.`
      );

      if (!autoAuthStartedRef.current) {
        autoAuthStartedRef.current = true;
        setTimeout(() => {
          handleBiometricLogin();
        }, 800); // TalkBack 안내와 겹치지 않게 지연
      }
    };

    init();
  }, []);

  const handleBiometricLogin = async () => {
    try {
      // 1. 저장된 기기 정보 확인
      const deviceId = getDeviceId();
      const deviceSecret = getDeviceSecret();

      if (!deviceId || !deviceSecret) {
        Alert.alert(
          "로그인 불가",
          "등록된 기기 정보가 없습니다. 회원가입을 먼저 진행해주세요."
        );
        accessibilityUtil.announceWithVibration(
          "등록된 정보가 없습니다. 회원가입을 먼저 진행해주세요",
          "warning"
        );
        navigation.replace("AuthStart");
        return;
      }

      // 2. 생체인증 가능 여부 확인
      const isAvailable = await biometricUtil.isSupported();
      if (!isAvailable) {
        Alert.alert("생체인증 불가", "이 기기는 생체인증을 지원하지 않습니다.");
        accessibilityUtil.announceWithVibration(
          "생체인증을 지원하지 않는 기기입니다",
          "error"
        );
        return;
      }

      // 3. 생체인증 등록 여부 확인
      const isEnrolled = await biometricUtil.isEnrolled();
      if (!isEnrolled) {
        Alert.alert(
          "생체인증 미등록",
          "기기에 생체인증이 등록되어 있지 않습니다."
        );
        accessibilityUtil.announceWithVibration(
          "기기에 생체인증을 먼저 등록해주세요",
          "warning"
        );
        return;
      }

      // 4. 생체인증 실행
      accessibilityUtil.announce(`${biometricType}을 진행해주세요`);
      const result = await biometricUtil.authenticate({
        promptMessage: `${biometricType}으로 인증하세요`,
        cancelLabel: "취소",
        disableDeviceFallback: true,
      });

      if (!result.success) {
        throw new Error(result.error || "생체인증 실패");
      }

      // 5. 로그인 API 호출 (Store에서 처리)
      accessibilityUtil.announce("로그인 중입니다");
      await loginWithBiometric();

      // 6. 성공
      accessibilityUtil.announceWithVibration("로그인 성공", "success");
      navigation.replace("Library");
    } catch (error: any) {
      console.error("[LoginScreen] Login failed:", error);
      accessibilityUtil.announceWithVibration(
        error?.message || "로그인 실패",
        "error"
      );
      Alert.alert("로그인 실패", error?.message || "로그인에 실패했습니다");
    }
  };

  return (
    <View style={styles.container}>
      <Text
        style={styles.title}
        accessible={false} // 버튼에서 읽으므로 중복 방지
      >
        로그인
      </Text>

      <Text style={styles.subtitle} accessible={false}>
        {biometricType}으로 로그인하세요
      </Text>

      <TouchableOpacity
        style={[styles.loginButton, isLoading && styles.buttonDisabled]}
        onPress={handleBiometricLogin}
        disabled={isLoading}
        accessibilityLabel={`${biometricType} 로그인`}
        accessibilityHint={`${biometricType}을 사용하여 로그인합니다`}
        accessibilityState={{ disabled: isLoading }}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#FFF" />
        ) : (
          <Text style={styles.loginButtonText}>{biometricType} 시작</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        disabled={isLoading}
        accessibilityLabel="뒤로 가기"
        accessibilityHint="이전 화면으로 돌아갑니다"
      >
        <Text style={styles.backButtonText}>뒤로 가기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 24,
    color: "#666",
    textAlign: "center",
    marginBottom: 64,
  },
  loginButton: {
    backgroundColor: "#007AFF",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    minHeight: 120,
    justifyContent: "center",
  },
  loginButtonText: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "bold",
  },
  buttonDisabled: {
    backgroundColor: "#CCC",
  },
  backButton: {
    marginTop: 24,
    padding: 20,
    alignItems: "center",
  },
  backButtonText: {
    color: "#666",
    fontSize: 20,
  },
});
