import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo,
  Dimensions,
  Platform,
  PermissionsAndroid,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { SplashScreenNavigationProp } from "../../navigation/navigationTypes";
import { useAuthStore } from "../../stores/authStore";
import { Video, AVPlaybackStatus, ResizeMode } from "expo-av";
import {
  getHasSeenSplash,
  saveHasSeenSplash,
  getHasAskedNotificationPermission,
  saveHasAskedNotificationPermission,
} from "../../services/appStorage";
import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  hasPermission,
  requestPermission,
  AuthorizationStatus,
} from "@react-native-firebase/messaging";

// 개발용 Mock 로그인 (테스트 완료 후 false로 변경)
const ENABLE_MOCK_LOGIN = false;
// 첫 실행 + 비스크린리더 사용자용 영상 재생 시간
const VIDEO_DURATION_MS = 5000;
// 스크린리더 사용자 또는 재실행 사용자 대기 시간
const SR_DURATION_MS = 2000;

// 앱 시작 시 한 번만 읽어두는 플래그
const hasSeenSplashOnceRefInit = getHasSeenSplash();

// 전체 스크린 너비, 높이 구하기
const windowWidth = Dimensions.get("window").width;
const windowHeight = Dimensions.get("window").height;
const screenWidth = Dimensions.get("screen").width;
const screenHeight = Dimensions.get("screen").height;

export default function SplashScreen() {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const { accessToken, setAccessToken, setStudent } = useAuthStore();
  const videoRef = useRef<Video | null>(null);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  const hasSeenSplashOnceRef = useRef<boolean>(hasSeenSplashOnceRefInit);

  // 알림 권한 안내 여부 (MMKV에서 즉시 읽음)
  const [hasAskedNotificationPermission, setHasAskedNotificationPermission] =
    useState<boolean>(() => getHasAskedNotificationPermission());

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

  // 스크린리더 상태 확인 + TalkBack용 멘트 안내
  useEffect(() => {
    const announceIfNeeded = (enabled: boolean) => {
      setIsScreenReaderEnabled(enabled);

      if (enabled) {
        const isFirstRun = !hasSeenSplashOnceRef.current;
        const message = isFirstRun
          ? "두드림을 시작합니다. 잠시 후 학습 준비 화면으로 이동합니다."
          : "두드림을 실행합니다.";

        AccessibilityInfo.announceForAccessibility(message);
      }
    };

    AccessibilityInfo.isScreenReaderEnabled().then(announceIfNeeded);

    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      (enabled) => {
        announceIfNeeded(enabled);
      }
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  /**
   * 첫 실행 시 알림 권한을 한 번만 요청
   * - OS 시스템 팝업만 사용
   * - 시각장애인을 위해 사전 음성 안내 포함
   */
  const requestNotificationPermissionWithAnnouncement =
    useCallback(async () => {
      try {
        AccessibilityInfo.announceForAccessibility(
          "두드림 알림을 보내기 위한 권한을 요청합니다. 잠시 후 뜨는 팝업에서 허용 또는 허용 안함을 선택해 주세요."
        );

        if (Platform.OS === "android") {
          if (Platform.Version >= 33) {
            const result = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );

            const granted = result === PermissionsAndroid.RESULTS.GRANTED;

            if (granted) {
              AccessibilityInfo.announceForAccessibility(
                "알림이 허용되었습니다. 앞으로 두드림에서 학습 알림을 보내드릴게요."
              );
            } else {
              AccessibilityInfo.announceForAccessibility(
                "알림이 허용되지 않았습니다. 나중에 설정에서 변경할 수 있습니다."
              );
            }
          } else {
            AccessibilityInfo.announceForAccessibility(
              "이 기기에서는 별도 알림 권한 없이 알림을 보낼 수 있습니다."
            );
          }
        } else {
          const app = getApp();
          const msg = getMessaging(app);

          const currentStatus = await hasPermission(msg);
          const alreadyEnabled =
            currentStatus === AuthorizationStatus.AUTHORIZED ||
            currentStatus === AuthorizationStatus.PROVISIONAL;

          if (alreadyEnabled) {
            AccessibilityInfo.announceForAccessibility(
              "이미 알림 권한이 허용되어 있습니다. 앞으로 두드림에서 학습 알림을 보내드릴게요."
            );
          } else {
            const authStatus = await requestPermission(msg);
            const enabled =
              authStatus === AuthorizationStatus.AUTHORIZED ||
              authStatus === AuthorizationStatus.PROVISIONAL;

            if (enabled) {
              AccessibilityInfo.announceForAccessibility(
                "알림이 허용되었습니다. 앞으로 두드림에서 학습 알림을 보내드릴게요."
              );
            } else {
              AccessibilityInfo.announceForAccessibility(
                "알림이 허용되지 않았습니다. 나중에 설정에서 변경할 수 있습니다."
              );
            }
          }
        }
      } catch (e) {
        console.warn("[SplashScreen] Notification permission error:", e);
        AccessibilityInfo.announceForAccessibility(
          "알림 설정 중 오류가 발생했습니다. 나중에 다시 시도해 주세요."
        );
      } finally {
        saveHasAskedNotificationPermission(true);
        setHasAskedNotificationPermission(true);
      }
    }, []);

  // Mock 로그인 + 타이머 / 첫 실행 여부 처리
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const run = async () => {
      console.log("[SplashScreen] Mounted (Video version)");
      console.log(
        "[SplashScreen] AccessToken:",
        accessToken ? "EXISTS" : "NULL"
      );
      console.log(
        "[SplashScreen] hasSeenSplashOnce:",
        hasSeenSplashOnceRef.current
      );
      console.log(
        "[SplashScreen] isScreenReaderEnabled:",
        isScreenReaderEnabled
      );
      console.log(
        "[SplashScreen] hasAskedNotificationPermission:",
        hasAskedNotificationPermission
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

      // 첫 실행 + 아직 권한 요청/안내를 한 적이 없다면 시스템 팝업 한 번 요청
      if (isFirstRun && !hasAskedNotificationPermission) {
        await requestNotificationPermissionWithAnnouncement();
      }

      const effectiveDuration = isFirstRun
        ? isScreenReaderEnabled
          ? SR_DURATION_MS
          : VIDEO_DURATION_MS
        : SR_DURATION_MS;

      console.log(
        "[SplashScreen] effectiveDuration:",
        effectiveDuration,
        "(isFirstRun:",
        isFirstRun,
        ", SR:",
        isScreenReaderEnabled,
        ")"
      );

      timer = setTimeout(() => {
        console.log(
          "[SplashScreen] Timer fired → navigateNext(), effectiveDuration:",
          effectiveDuration
        );
        navigateNext();
      }, effectiveDuration);
    };

    run();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [
    accessToken,
    isScreenReaderEnabled,
    navigateNext,
    setAccessToken,
    setStudent,
    hasAskedNotificationPermission,
    requestNotificationPermissionWithAnnouncement,
  ]);

  const handleSkip = () => {
    console.log("[SplashScreen] Skip button pressed → navigateNext()");
    navigateNext();
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    if (status.didJustFinish) {
      console.log("[SplashScreen] Video finished");
    }
  };

  const isFirstRun = !hasSeenSplashOnceRef.current;
  const showSkipButton = isFirstRun && !isScreenReaderEnabled;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {showSkipButton && (
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
            shouldPlay={true}
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
    backgroundColor: "#27394F",
    width: "100%",
    height: "100%",
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
    objectFit: "cover" as any,
    paddingVertical: 50,
    width: screenWidth,
    height: screenHeight,
  },
  video: {
    flex: 1,
    width: "100%",
    aspectRatio: 9 / 16,
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
