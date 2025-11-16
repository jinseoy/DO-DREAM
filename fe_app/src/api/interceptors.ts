// Request/Response 인터셉터 + 자동 토큰 갱신 (기기 자동 로그인 방식)

import { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAccessToken, saveAccessToken } from "../services/authStorage";
import { getDeviceId, getDeviceSecret } from "../services/appStorage";
import { accessibilityUtil } from "../utils/accessibility";

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

/**
 * 인증 관련 URL 여부 체크
 * - 이 URL들에는 Authorization 헤더를 붙이지 않는다.
 */
const isAuthUrl = (url?: string): boolean => {
  if (!url) return false;
  return (
    url.includes("/api/auth/student/login") ||
    url.includes("/api/auth/student/register") ||
    url.includes("/api/auth/student/verify") ||
    url.includes("/api/auth/student/logout") ||
    url.includes("/api/auth/student/refresh")
  );
};

/**
 * 대기 중인 요청들 처리
 */
const processQueue = (
  error: AxiosError | null,
  token: string | null = null
) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

export const setupInterceptors = (instance: AxiosInstance) => {
  // ✅ 요청 인터셉터: AccessToken 자동 헤더 부착 (auth URL 제외)
  instance.interceptors.request.use(
    (config) => {
      const url = config.url;

      // 로그인/회원가입 등 auth 엔드포인트에는 토큰 붙이지 않음
      if (isAuthUrl(url)) {
        return config;
      }

      const token = getAccessToken();
      if (token) {
        if (!config.headers) {
          (config as any).headers = {};
        }
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 응답 인터셉터: 401 → 기기 자동 로그인으로 토큰 갱신
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      // 401이 아니거나, 요청 정보가 없으면 그대로 reject
      if (error.response?.status !== 401 || !originalRequest) {
        return Promise.reject(error);
      }

      // 이미 한 번 재시도한 요청이면 더 이상 건드리지 않음
      if (originalRequest._retry) {
        return Promise.reject(error);
      }

      const url = originalRequest.url ?? "";

      // ✅ 인증 관련 API 자체(login/register/verify/logout)는
      //    여기서 자동 복구를 시도하지 않고 그대로 에러 반환
      if (isAuthUrl(url)) {
        return Promise.reject(error);
      }

      console.log(
        "[Interceptor] 401 detected, attempting auto re-authentication..."
      );

      // 이미 다른 요청이 토큰 갱신 중이면 큐에 쌓았다가 처리
      if (isRefreshing) {
        console.log(
          "[Interceptor] Already refreshing, adding request to queue..."
        );

        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token && originalRequest.headers) {
              (
                originalRequest.headers as any
              ).Authorization = `Bearer ${token}`;
            }
            console.log(
              "[Interceptor] Retrying request with refreshed token from queue"
            );
            return instance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // 여기서부터는 실제 토큰 갱신 담당
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        let newAccessToken: string | null = null;

        // 1차 시도: 기기 정보 기반 자동 로그인
        try {
          const deviceId = getDeviceId();
          const deviceSecret = getDeviceSecret();

          if (!deviceId || !deviceSecret) {
            console.error(
              "[Interceptor] No device credentials found for auto-login"
            );
            throw new Error(
              "기기 정보가 없어 자동 로그인을 수행할 수 없습니다."
            );
          }

          console.log(
            "[Interceptor] Trying auto-login with stored device credentials..."
          );

          const loginResponse = await instance.post("/api/auth/student/login", {
            deviceId,
            deviceSecret,
          });

          const accessToken = (loginResponse as any).data?.accessToken;

          if (!accessToken || typeof accessToken !== "string") {
            console.error(
              "[Interceptor] Auto-login response does not contain a valid accessToken:",
              (loginResponse as any).data
            );
            throw new Error(
              "자동 로그인에 실패했습니다. 유효한 토큰이 없습니다."
            );
          }

          newAccessToken = accessToken;
          console.log(
            "[Interceptor] Auto-login successful, new accessToken acquired."
          );
        } catch (autoLoginError) {
          console.error("[Interceptor] Auto-login failed:", autoLoginError);
          throw autoLoginError;
        }

        // 새 토큰 저장 및 큐 처리
        if (!newAccessToken) {
          throw new Error("새 토큰을 받지 못했습니다.");
        }

        saveAccessToken(newAccessToken);
        console.log("[Interceptor] New token saved, processing queue...");

        processQueue(null, newAccessToken);

        if (!originalRequest.headers) {
          (originalRequest as any).headers = {};
        }
        (
          originalRequest.headers as any
        ).Authorization = `Bearer ${newAccessToken}`;

        console.log("[Interceptor] Retrying original request with new token");
        return instance(originalRequest);
      } catch (finalError) {
        console.error("[Interceptor] Unable to recover from 401:", finalError);

        // 대기 중인 요청들 모두 실패 처리
        processQueue(finalError as AxiosError, null);

        // 접근성 안내: 진짜로 복구 불가할 때만 사용자에게 재로그인 요청
        accessibilityUtil.announceWithVibration(
          "로그인이 만료되었습니다. 다시 로그인해주세요.",
          "warning"
        );

        return Promise.reject(finalError);
      } finally {
        isRefreshing = false;
      }
    }
  );
};
