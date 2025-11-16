/**
 * FCM 토큰 등록/갱신 요청
 * POST /api/fcm/token
 */
export type DeviceType = 'ANDROID' | 'IOS';

export interface FcmRegisterRequest {
  token: string;
  deviceType: DeviceType;
}

/**
 * FCM 토큰 등록/갱신 응답
 */
export interface FcmRegisterResponse {
  success: boolean;
  message?: string;
  tokenInfo?: {
    deviceId: number;
    userId: number;
    deviceType: string;
    registeredAt: string;
    lastUsedAt: string;
  };
}

/**
 * FCM 토큰 삭제 응답
 */
export type FcmDeleteResponse = FcmRegisterResponse;
