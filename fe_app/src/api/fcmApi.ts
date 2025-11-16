import apiClient from "./apiClient";
import type {
  FcmRegisterRequest,
  FcmRegisterResponse,
  FcmDeleteResponse,
} from "../types/api/fcmApiTypes";

const FCM_ENDPOINTS = {
  REGISTER_TOKEN: "/api/fcm/token",
};

export const fcmApi = {
  /**
   * FCM 토큰 등록/갱신
   */
  registerToken: async (
    data: FcmRegisterRequest
  ): Promise<FcmRegisterResponse> => {
    const response = await apiClient.post(FCM_ENDPOINTS.REGISTER_TOKEN, data);
    return response.data;
  },

  /**
   * FCM 토큰 삭제 (로그아웃 시)
   * DELETE /api/fcm/token?token=...
   */
  deleteToken: async (token: string): Promise<FcmDeleteResponse> => {
    const response = await apiClient.delete(FCM_ENDPOINTS.REGISTER_TOKEN, {
      params: { token },
    });
    return response.data;
  },
};

export default fcmApi;
