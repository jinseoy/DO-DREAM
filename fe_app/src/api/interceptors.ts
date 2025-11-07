// Request/Response 인터셉터 + 자동 토큰 갱신

import { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, saveAccessToken } from '../services/authStorage';
import { getDeviceId, getDeviceSecret } from '../services/appStorage';
import { accessibilityUtil } from '../utils/accessibility';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

/**
 * 대기 중인 요청들 처리
 */
const processQueue = (error: AxiosError | null, token: string | null = null) => {
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
  instance.interceptors.request.use(
    (config) => {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        console.log('[Interceptor] 401 detected, attempting token refresh...');

        if (originalRequest.url?.includes('/refresh')) {
          console.log('[Interceptor] Refresh token expired, user needs to re-login');
          
          accessibilityUtil.announceWithVibration(
            '로그인이 만료되었습니다. 다시 로그인해주세요.',
            'warning'
          );

          isRefreshing = false;
          processQueue(error, null);
          return Promise.reject(error);
        }

        if (isRefreshing) {
          console.log('[Interceptor] Already refreshing, adding to queue...');
          
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              console.log('[Interceptor] Retrying request with new token');
              return instance(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          console.log('[Interceptor] Starting token refresh...');

          const deviceId = getDeviceId();
          const deviceSecret = getDeviceSecret();

          if (!deviceId || !deviceSecret) {
            console.error('[Interceptor] No device info found');
            throw new Error('저장된 기기 정보가 없습니다');
          }

          console.log('[Interceptor] Device info loaded, calling refresh API...');

          const response = await instance.post('/api/auth/student/refresh', {
            deviceId,
            deviceSecret,
          });

          const newAccessToken = response.data?.accessToken;

          if (!newAccessToken || typeof newAccessToken !== 'string') {
            console.error('[Interceptor] Invalid token received:', newAccessToken);
            throw new Error('새 토큰을 받지 못했습니다');
          }

          console.log('[Interceptor] New token received, saving...');

          saveAccessToken(newAccessToken);
          console.log('[Interceptor] Token saved, processing queue...');

          processQueue(null, newAccessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          console.log('[Interceptor] Retrying original request');
          return instance(originalRequest);

        } catch (refreshError: any) {
          console.error('[Interceptor] Token refresh failed:', refreshError);
          console.error('[Interceptor] Error response:', refreshError.response?.data);

          // 대기 중인 요청들 모두 실패 처리
          processQueue(refreshError as AxiosError, null);

          // 사용자에게 안내
          accessibilityUtil.announceWithVibration(
            '로그인이 만료되었습니다. 다시 로그인해주세요.',
            'warning'
          );

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
};