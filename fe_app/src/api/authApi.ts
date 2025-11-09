import apiClient from './apiClient';
import type {
  StudentVerifyRequest,
  StudentRegisterRequest,
  StudentLoginRequest,
  AuthResponse,
  VerifyResponse,
} from '../types/authApiTypes';

const AUTH_ENDPOINTS = {
  VERIFY: '/api/auth/student/verify',       // 사전 인증 (학번/이름 확인)
  REGISTER: '/api/auth/student/register',   // 회원가입 (기기 등록)
  LOGIN: '/api/auth/student/login',         // 로그인
  REFRESH: '/api/auth/student/refresh',     // 토큰 재발급
  LOGOUT: '/api/auth/student/logout',       // 로그아웃 [향후]
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

  /**
   * 학생 로그인
   * 기기 시크릿으로 로그인 (AccessToken 반환, RefreshToken은 쿠키)
   */
  login: async (data: StudentLoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post(AUTH_ENDPOINTS.LOGIN, data);
    return response.data;
  },

  /**
   * 학생 토큰 재발급
   * 쿠키에 담긴 Refresh Token으로 Access Token을 재발급하고, Refresh Token을 회전
   */
  refresh: async (data: StudentLoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post(AUTH_ENDPOINTS.REFRESH, data);
    return response.data;
  },

  /**
   * 로그아웃 (향후 구현 예정)
   */
  logout: async (): Promise<void> => {
    await apiClient.post(AUTH_ENDPOINTS.LOGOUT);
  },
};