import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { SplashScreenNavigationProp } from "../../navigation/navigationTypes";
import { useAuthStore } from "../../stores/authStore";
import { Video, AVPlaybackStatus, ResizeMode } from "expo-av";
import {
  getHasSeenSplash,
  saveHasSeenSplash,
} from "../../services/appStorage";

// 개발용 Mock 로그인 (테스트 완료 후 false로 변경)
const ENABLE_MOCK_LOGIN = false;
const VIDEO_DURATION_MS = 4000; // 첫 실행 + 비스크린리더 사용자용 영상 재생 시간
const SR_DURATION_MS = 1000; // 스크린리더 사용자 또는 재실행 사용자 대기 시간

// 앱 시작 시 한 번만 읽어두는 플래그
const hasSeenSplashOnceRefInit = getHasSeenSplash();

export default function SplashScreen() {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const { accessToken, setAccessToken, setStudent } = useAuthStore();
  const videoRef = useRef<Video | null>(null);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  const hasSeenSplashOnceRef = useRef<boolean>(hasSeenSplashOnceRefInit);

  const navigateNext = useCallback(() => {
    // 처음 스플래시를 통과할 때만 플래그 저장
    if (!hasSeenSplashOnceRef.current) {
      saveHasSeenSplash(true);
      hasSeenSplashOnceRef.current = true;
    }

    if (ENABLE_MOCK_LOGIN) {
      navigation.replace("Library");
      return;
    }

    if (accessToken) {
      navigation.replace("Library");
    } else {
      navigation.replace("AuthStart");
    }
  }, [navigation, accessToken]);

  // 스크린리더 상태 확인 (첫 실행일 때만 의미 있음)
  useEffect(() => {
    if (hasSeenSplashOnceRef.current) return; // 이미 본 적 있으면 SR 여부 상관없이 1초만 기다릴 거라 굳이 체크 안 해도 됨

    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      setIsScreenReaderEnabled(enabled);

      if (enabled) {
        AccessibilityInfo.announceForAccessibility(
          "두드림을 실행합니다. 잠시만 기다려 주세요."
        );
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      (enabled) => {
        setIsScreenReaderEnabled(enabled);
      }
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  // Mock 로그인 + 타이머 / 첫 실행 여부 처리
  useEffect(() => {
    console.log("[SplashScreen] Mounted (Video version)");
    console.log(
      "[SplashScreen] AccessToken:",
      accessToken ? "EXISTS" : "NULL"
    );
    console.log(
      "[SplashScreen] hasSeenSplashOnce:",
      hasSeenSplashOnceRef.current
    );

    if (ENABLE_MOCK_LOGIN && !accessToken) {
      console.log("[SplashScreen] Mock login enabled - injecting fake data");

      setAccessToken("mock-access-token-for-development-12345");
      setStudent({
        id: 1,
        studentNumber: "2024001",
        name: "테스트학생",
        createdAt: new Date().toISOString(),
      });

      console.log("[SplashScreen] Mock login complete");
    }

    const isFirstRun = !hasSeenSplashOnceRef.current;

    // 첫 실행: SR 켜져 있으면 1초, 아니면 4초
    // 재실행: SR 여부와 상관없이 1초
    const effectiveDuration = isFirstRun
      ? isScreenReaderEnabled
        ? SR_DURATION_MS
        : VIDEO_DURATION_MS
      : SR_DURATION_MS;

    const timer = setTimeout(() => {
      console.log(
        "[SplashScreen] Timer fired → navigateNext(), effectiveDuration:",
        effectiveDuration
      );
      navigateNext();
    }, effectiveDuration + 500);

    return () => clearTimeout(timer);
  }, [
    accessToken,
    isScreenReaderEnabled,
    navigateNext,
    setAccessToken,
    setStudent,
  ]);

  const handleSkip = () => {
    console.log("[SplashScreen] Skip button pressed → navigateNext()");
    navigateNext();
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    const isFirstRun = !hasSeenSplashOnceRef.current;

    // 첫 실행 + 스크린리더 OFF + 영상이 끝까지 재생된 경우
    if (status.didJustFinish && !isScreenReaderEnabled && isFirstRun) {
      console.log("[SplashScreen] Video finished → navigateNext()");
      navigateNext();
    }
  };

  const isFirstRun = !hasSeenSplashOnceRef.current;

  return (
    <View
      style={styles.container}
      accessible={false} // 스크린리더 포커스 안 줌 (순수 장식 화면)
      importantForAccessibility="no-hide-descendants"
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* 첫 실행 + 스크린리더 OFF일 때만 '건너뛰기' 노출 */}
        {isFirstRun && !isScreenReaderEnabled && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            accessible={true}
            accessibilityLabel="건너뛰기"
            accessibilityRole="button"
            accessibilityHint="스플래시 화면을 건너뛰고 다음 화면으로 이동합니다"
          >
            <Text style={styles.skipText}>건너뛰기</Text>
          </TouchableOpacity>
        )}

        <View style={styles.content}>
          <Video
            ref={videoRef}
            style={styles.video}
            source={require("../../../assets/splash_9-16.mp4")}
            resizeMode={ResizeMode.COVER}
            isLooping={false}
            // 첫 실행 + 스크린리더 OFF 일 때만 실제 재생
            shouldPlay={isFirstRun && !isScreenReaderEnabled}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          />

          {ENABLE_MOCK_LOGIN && (
            <View style={styles.mockBadge}>
              <Text style={styles.mockBadgeText}>Mock Login Mode</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#192B55",
  },
  safeArea: {
    flex: 1,
  },
  skipButton: {
    position: "absolute",
    top: 20,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 18,
    color: "#ffffff",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  video: {
    width: "100%",
    aspectRatio: 9/16,
  },
  mockBadge: {
    position: "absolute",
    bottom: 40,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 0, 0, 0.8)",
    borderRadius: 8,
  },
  mockBadgeText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});