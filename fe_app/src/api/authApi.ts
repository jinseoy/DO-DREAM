import apiClient from './apiClient';
import type {
  StudentVerifyRequest,
  StudentRegisterRequest,
  AuthResponse,
  VerifyResponse,
} from '../types/authApiTypes';

const AUTH_ENDPOINTS = {
  VERIFY: '/api/auth/student/verify',       // 사전 인증 (학번/이름 확인)
  REGISTER: '/api/auth/student/register',   // 회원가입 (기기 등록)
};

export const authApi = {
  /**
   * 학생 사전 인증 (1단계)
   * 학번과 이름이 더미레지스트리에 있는지 확인
   */
  verify: async (data: StudentVerifyRequest): Promise<VerifyResponse> => {
    const response = await apiClient.post(AUTH_ENDPOINTS.VERIFY, data);
    return response.data;
  },

  /**
   * 학생 회원가입 (2단계)
   * 사전 인증 후 기기 정보와 생체인증 시크릿 등록
   */
  register: async (data: StudentRegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post(AUTH_ENDPOINTS.REGISTER, data);
    return response.data;
  },
};