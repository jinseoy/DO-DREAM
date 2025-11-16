/**
 * 인증 전용 저장소
 * - Access Token
 * - Refresh Token
 * - Student Info (로그인 사용자 정보)
 * - Biometric Enabled (생체인증 사용 여부)
 */
import { storage } from "./appStorage";

/**
 * 인증 관련 Storage Keys
 */
const AUTH_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  BIOMETRIC_ENABLED: "biometric_enabled",
  STUDENT_INFO: "student_info",
};

/**
 * Access Token 저장
 */
export const saveAccessToken = (token: string): void => {
  try {
    if (!token || token === "undefined" || typeof token !== "string") {
      console.error("[AuthStorage] Invalid access token:", token);
      throw new Error("Invalid access token");
    }

    storage.set(AUTH_KEYS.ACCESS_TOKEN, token);
    console.log("[AuthStorage] Access token saved successfully");
  } catch (error) {
    console.error("[AuthStorage] Failed to save access token:", error);
    throw error;
  }
};

/**
 * Access Token 조회
 */
export const getAccessToken = (): string | null => {
  try {
    const token = storage.getString(AUTH_KEYS.ACCESS_TOKEN);
    return token ?? null;
  } catch (error) {
    console.error("[AuthStorage] Failed to get access token:", error);
    return null;
  }
};

/**
 * Access Token 삭제
 */
export const removeAccessToken = (): void => {
  try {
    storage.delete(AUTH_KEYS.ACCESS_TOKEN);
    console.log("[AuthStorage] Access token removed");
  } catch (error) {
    console.error("[AuthStorage] Failed to remove access token:", error);
  }
};

/**
 * 생체인증 사용 여부 저장
 */
export const saveBiometricEnabled = (enabled: boolean): void => {
  try {
    storage.set(AUTH_KEYS.BIOMETRIC_ENABLED, enabled);
    console.log("[AuthStorage] Biometric enabled:", enabled);
  } catch (error) {
    console.error("[AuthStorage] Failed to save biometric enabled:", error);
  }
};

/**
 * 생체인증 사용 여부 조회
 */
export const isBiometricEnabled = (): boolean => {
  try {
    return storage.getBoolean(AUTH_KEYS.BIOMETRIC_ENABLED) ?? false;
  } catch (error) {
    console.error("[AuthStorage] Failed to get biometric enabled:", error);
    return false;
  }
};

/**
 * 학생 정보 저장 (로그인 시)
 */
export const saveStudentInfo = (studentInfo: object): void => {
  try {
    if (!studentInfo) {
      console.error("[AuthStorage] Invalid student info:", studentInfo);
      throw new Error("Invalid student info");
    }

    storage.set(AUTH_KEYS.STUDENT_INFO, JSON.stringify(studentInfo));
    console.log("[AuthStorage] Student info saved");
  } catch (error) {
    console.error("[AuthStorage] Failed to save student info:", error);
    throw error;
  }
};

/**
 * 학생 정보 조회
 */
export const getStudentInfo = <T = any>(): T | null => {
  try {
    const data = storage.getString(AUTH_KEYS.STUDENT_INFO);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("[AuthStorage] Failed to get student info:", error);
    return null;
  }
};

/**
 * 학생 정보 삭제
 */
export const removeStudentInfo = (): void => {
  try {
    storage.delete(AUTH_KEYS.STUDENT_INFO);
    console.log("[AuthStorage] Student info removed");
  } catch (error) {
    console.error("[AuthStorage] Failed to remove student info:", error);
  }
};

/**
 * 로그아웃 시 인증 데이터 모두 삭제
 * (생체인증 설정은 유지)
 */
export const clearAuthData = (): void => {
  try {
    removeAccessToken();
    removeStudentInfo();
    console.log("[AuthStorage] Auth data cleared");
  } catch (error) {
    console.error("[AuthStorage] Failed to clear auth data:", error);
  }
};

/**
 * 로그인 여부 확인 (토큰 존재 여부)
 */
export const isLoggedIn = (): boolean => {
  const token = getAccessToken();
  return token !== null && token.length > 0;
};
