import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { SplashScreenNavigationProp } from "../../navigation/navigationTypes";
import { useAuthStore } from "../../stores/authStore";

export default function SplashScreen() {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const { accessToken } = useAuthStore();

  useEffect(() => {
    console.log('[SplashScreen] Mounted');
    console.log('[SplashScreen] AccessToken:', accessToken ? 'EXISTS' : 'NULL');

    // 2초 후 자동 이동
    const timer = setTimeout(() => {
      if (accessToken) {
        console.log('[SplashScreen] Navigating to Library');
        navigation.replace("Library");
      } else {
        console.log('[SplashScreen] Navigating to AuthStart');
        navigation.replace("AuthStart");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [accessToken, navigation]);

  const handleSkip = () => {
    console.log('[SplashScreen] Skip button pressed');
    
    if (accessToken) {
      navigation.replace("Library");
    } else {
      navigation.replace("AuthStart");
    }
  };

  return (
    <View
      style={styles.container}
      accessible={false} // 스크린리더 무시
      importantForAccessibility="no-hide-descendants"
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          accessible={true}
          accessibilityLabel="건너뛰기"
          accessibilityRole="button"
          accessibilityHint="스플래시 화면을 건너뜁니다"
        >
          <Text style={styles.skipText}>건너뛰기</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../../assets/male.png")}
              style={styles.logo}
            />
            <Image
              source={require("../../../assets/female.png")}
              style={styles.logo}
            />
          </View>

          <Text style={styles.appName}>두드림</Text>
          <Text style={styles.tagline}>
            시각장애 학생을 위한{"\n"}학습 지원 서비스
          </Text>
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
  logoContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: "contain",
  },
  appName: {
    fontSize: 72,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  tagline: {
    fontSize: 20,
    color: "#ffffff",
    textAlign: "center",
    opacity: 0.9,
    lineHeight: 32,
  },
});