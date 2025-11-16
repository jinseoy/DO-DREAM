import { Platform } from "react-native";
import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  getToken as modularGetToken,
  onTokenRefresh as modularOnTokenRefresh,
} from "@react-native-firebase/messaging";
import { fcmApi } from "../api/fcmApi";

type InitOptions = { registerOnInit?: boolean };

let isInitialized = false;

/**
 * FCM 초기화 함수
 * - 내부적으로 onTokenRefresh 리스너를 한 번만 등록
 * - 옵션에 따라 초기 토큰 등록 여부 결정
 * - 실제 서버 등록은 accessToken이 있을 때만 수행 (401 방지)
 */
export async function initFcm(
  getAccessToken: () => string | null,
  options: InitOptions = { registerOnInit: true }
) {
  try {
    if (isInitialized) {
      console.log(
        "[FCM] 이미 초기화되어 있어 initFcm를 다시 실행하지 않습니다."
      );
      return;
    }
    isInitialized = true;

    const app = getApp();
    const msg = getMessaging(app);

    // 앱 시작 시 한 번 토큰 등록 (옵션)
    if (options.registerOnInit) {
      await registerFcmToken(getAccessToken);
    }

    // 토큰이 새로 발급될 때마다 재등록
    modularOnTokenRefresh(msg, async (newToken) => {
      try {
        await postToken(newToken, getAccessToken());
        console.log("[FCM] 새 토큰이 발급되어 서버에 재등록 완료");
      } catch (e) {
        console.error("[FCM] 새 토큰 등록 중 오류 발생:", e);
      }
    });
  } catch (error) {
    console.error("[FCM] initFcm 실행 중 오류:", error);
    isInitialized = false; // 실패 시 다시 시도할 수 있게 롤백
  }
}

/**
 * 현재 기기의 FCM 토큰을 가져와 서버에 등록
 * - 여러 번 호출해도 서버에서 중복 처리됨
 */
export async function registerFcmToken(getAccessToken: () => string | null) {
  try {
    const app = getApp();
    const msg = getMessaging(app);
    const token = await modularGetToken(msg);

    if (!token) {
      console.warn("[FCM] 등록 가능한 토큰이 없습니다.");
      return;
    }

    await postToken(token, getAccessToken());
    console.log("[FCM] FCM 토큰 서버 등록 완료");
  } catch (error) {
    console.error("[FCM] registerFcmToken 실행 중 오류:", error);
  }
}

/**
 * 서버에 토큰 등록 요청
 * - OS 종류(ANDROID/IOS)를 함께 전송
 * - accessToken이 없으면 서버 호출을 아예 하지 않음 (401 방지)
 */
async function postToken(token: string, accessToken: string | null) {
  // const { accessToken } = useAuthStore.getState(); // 순환 참조의 원인

  if (!accessToken) {
    console.log(
      "[FCM] accessToken이 없어 FCM 토큰 서버 등록을 건너뜁니다. 로그인 후 다시 시도됩니다."
    );
    return;
  }

  const deviceType = Platform.OS === "ios" ? "IOS" : "ANDROID";
  await fcmApi.registerToken({ token, deviceType });
}
