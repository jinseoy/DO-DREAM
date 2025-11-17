import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { accessibilityUtil } from '../../utils/accessibility';
import { biometricUtil } from '../../utils/biometric';
import { getDeviceId, getDeviceSecret } from '../../services/appStorage';
import { useAuthStore } from '../../stores/authStore';
import { AuthStartScreenNavigationProp } from '../../navigation/navigationTypes';
import { COLORS } from '../../constants/colors';

export default function AuthStartScreen() {
  const navigation = useNavigation<AuthStartScreenNavigationProp>();
  const { loginWithBiometric, isLoading } = useAuthStore();

  const [biometricType, setBiometricType] = useState<string>('생체인증');

  useEffect(() => {
    // 화면 진입 시 안내 + 생체인증 타입 파악(등록 여부 반영)
    const init = async () => {
      accessibilityUtil.announce(
        '두드림 앱입니다. 로그인 또는 회원가입을 선택하세요.'
      );

      const type = await biometricUtil.getBiometricTypeDescription();
      setBiometricType(type);
    };
    init();
  }, []);

  const handleLoginPress = async () => {
    try {
      accessibilityUtil.lightImpact();

      // 1) 저장된 기기 정보 확인
      const deviceId = getDeviceId();
      const deviceSecret = getDeviceSecret();
      if (!deviceId || !deviceSecret) {
        Alert.alert(
          '로그인 불가',
          '등록된 기기 정보가 없습니다. 회원가입을 먼저 진행해주세요.'
        );
        accessibilityUtil.announceWithVibration(
          '등록된 정보가 없습니다. 회원가입을 먼저 진행해주세요',
          'warning'
        );
        // 필요 시 회원가입 화면으로 바로 안내
        // navigation.navigate('Signup');
        return;
      }

      // 2) 생체인증 지원/등록 확인
      const supported = await biometricUtil.isSupported();
      if (!supported) {
        Alert.alert('생체인증 불가', '이 기기는 생체인증을 지원하지 않습니다.');
        accessibilityUtil.announceWithVibration(
          '생체인증을 지원하지 않는 기기입니다',
          'error'
        );
        return;
      }

      const enrolled = await biometricUtil.isEnrolled();
      if (!enrolled) {
        Alert.alert('생체인증 미등록', '기기에 생체인증이 등록되어 있지 않습니다.');
        accessibilityUtil.announceWithVibration(
          '기기에 생체인증을 먼저 등록해주세요',
          'warning'
        );
        return;
      }

      // 3) 생체인증 실행
      accessibilityUtil.announce(`${biometricType}을 진행해주세요`);
      const result = await biometricUtil.authenticate({
        promptMessage: `${biometricType}으로 인증하세요`,
        cancelLabel: '취소',
        disableDeviceFallback: true,
      });

      if (!result.success) {
        throw new Error(result.error || '생체인증 실패');
      }

      // 4) 로그인 처리 (스토어)
      accessibilityUtil.announce('로그인 중입니다');
      await loginWithBiometric();

      // 5) 성공 후 이동
      accessibilityUtil.announceWithVibration('로그인 성공', 'success');
      navigation.replace('Library');
    } catch (e: any) {
      console.error('[AuthStartScreen] biometric login failed:', e);
      accessibilityUtil.announceWithVibration(
        e?.message || '로그인 실패',
        'error'
      );
      Alert.alert('로그인 실패', e?.message || '로그인에 실패했습니다');
    }
  };

  const handleSignupPress = () => {
    accessibilityUtil.lightImpact();
    navigation.navigate('Signup');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* 앱 로고/제목 */}
        <View style={styles.header}>
          <Text
            style={styles.appName}
            accessible={true}
            accessibilityRole="header"
            accessibilityLabel="두드림"
          >
            두드림
          </Text>
          <Text style={styles.subtitle}>
            시각장애 학생을 위한{'\n'}학습 지원 서비스
          </Text>
        </View>

        {/* 버튼 영역 */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.loginButton,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleLoginPress}
            disabled={isLoading}
            accessible={true}
            accessibilityLabel="로그인"
            accessibilityRole="button"
            accessibilityHint={`${biometricType}으로 인증하여 로그인합니다`}
            accessibilityState={{ disabled: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator size="large" color="#FFF" />
            ) : (
              <>
                <Text style={styles.buttonText}>로그인</Text>
                <Text style={styles.buttonSubtext}>
                  {biometricType}으로 바로 로그인
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.signupButton]}
            onPress={handleSignupPress}
            accessible={true}
            accessibilityLabel="회원가입"
            accessibilityRole="button"
            accessibilityHint="학번과 이름을 입력하여 회원가입합니다"
          >
            <Text style={[styles.buttonText, styles.signupButtonText]}>회원가입</Text>
            <Text style={[styles.buttonSubtext, styles.signupButtonText]}>처음 사용하시나요?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-around',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  appName: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.primary.main, // #192B55 메인 남색
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 22, // 가독성을 위해 약간 크게
    color: COLORS.text.secondary, // 충분한 대비율
    textAlign: 'center',
    lineHeight: 34,
  },
  buttonSection: {
    gap: 20,
    marginBottom: 60,
  },
  button: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
    borderWidth: 4, // 경계선 두께 증가 (접근성)
  },
  loginButton: {
    backgroundColor: COLORS.primary.main, // 메인 남색
    borderColor: COLORS.primary.dark, // 더 진한 남색
  },
  signupButton: {
    backgroundColor: COLORS.secondary.main, // 서브 노란색
    borderColor: COLORS.secondary.dark, // 진한 노란색
  },
  signupButtonText: {
    color: COLORS.text.primary, // 검은색 (노란 배경에 높은 대비)
    opacity: 1,
  },
  buttonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text.inverse, // 흰색 (남색 배경용)
    marginBottom: 8,
  },
  buttonSubtext: {
    fontSize: 18,
    color: COLORS.text.inverse, // 흰색
    opacity: 0.95,
  },
  buttonDisabled: {
    backgroundColor: COLORS.primary.light,
    borderColor: COLORS.primary.lighter,
  },
});
