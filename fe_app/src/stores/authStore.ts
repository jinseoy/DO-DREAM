import { create } from 'zustand';
import type { Student } from '../types/auth';
import { authApi } from '../api/authApi';
import {
  saveAccessToken,
  removeAccessToken,
  getAccessToken,
  saveStudentInfo,
  getStudentInfo,
  clearAuthData,
  saveBiometricEnabled,
  isBiometricEnabled as checkBiometricEnabled,
} from '../services/authStorage';
import {
  saveStudentNumber,
  getStudentNumber,
  saveDeviceId,
  getDeviceId,
  saveDeviceSecret,
  getDeviceSecret,
  savePlatform,
  clearDeviceInfo,
} from '../services/appStorage';
import {
  getDeviceId as generateDeviceId,
  getPlatform,
  generateDeviceSecret,
} from '../utils/deviceUtils';
import { registerFcmToken } from '../notifications/fcmService';

interface AuthState {
  student: Student | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean;
  
  setStudent: (student: Student | null) => void;
  setAccessToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  hydrate: () => void;
  verifyStudent: (studentNumber: string, name: string) => Promise<boolean>;
  registerStudent: (studentNumber: string, name: string) => Promise<void>;
  loginWithBiometric: () => Promise<void>;
  logout: () => Promise<void>;
  enableBiometric: (enabled: boolean) => void;
  checkBiometricStatus: () => boolean;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  student: null,
  accessToken: null,
  isLoading: false,
  error: null,
  isHydrated: false,

  setStudent: (student) => {
    set({ student });
    if (student) {
      saveStudentInfo(student);
      saveStudentNumber(student.studentNumber);
    }
  },

  setAccessToken: (accessToken) => {
    set({ accessToken });
    if (accessToken) {
      saveAccessToken(accessToken);
    } else {
      removeAccessToken();
    }
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  hydrate: () => {
    console.log('[AuthStore] Hydrating...');
    try {
      const token = getAccessToken();
      const studentInfo = getStudentInfo<Student>();
      
      if (token && studentInfo) {
        set({
          accessToken: token,
          student: studentInfo,
          isHydrated: true,
        });
        console.log('[AuthStore] Hydrated successfully');
      } else {
        set({ isHydrated: true });
        console.log('[AuthStore] No stored auth data');
      }
    } catch (error) {
      console.error('[AuthStore] Hydration error:', error);
      set({ isHydrated: true });
    }
  },

  verifyStudent: async (studentNumber: string, name: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    
    try {
      await authApi.verify({ studentNumber, name });
      set({ isLoading: false });
      console.log('[AuthStore] Student verified successfully');
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '학번과 이름을 확인할 수 없습니다';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      console.error('[AuthStore] Verify failed:', errorMessage);
      return false;
    }
  },

  registerStudent: async (studentNumber: string, name: string): Promise<void> => {
    set({ isLoading: true, error: null });
    
    try {
      // 1. 기기 정보 생성
      const deviceId = await generateDeviceId();
      const platform = getPlatform();
      const deviceSecret = await generateDeviceSecret(studentNumber);
      
      console.log('[AuthStore] Registering with device:', deviceId);
      
      // 2. 회원가입 API 호출
      const response = await authApi.register({
        studentNumber,
        name,
        deviceId,
        platform,
        deviceSecret,
      });
      
      console.log('[AuthStore] Register response type:', typeof response);
      console.log('[AuthStore] Register response:', response);
      
      if (typeof response !== 'object' || response === null) {
        console.log('[AuthStore] Response is not an object, trying login...');
        
        const loginResponse = await authApi.login({ deviceId, deviceSecret });
        
        console.log('[AuthStore] Login response:', loginResponse);
        
        if (typeof loginResponse !== 'object' || !loginResponse.accessToken) {
          throw new Error('로그인 응답이 올바르지 않습니다');
        }
        
        // Student 정보 구성
        const student: Student = {
          id: 0,
          studentNumber,
          name,
          createdAt: new Date().toISOString(),
        };
        
        // 상태 업데이트
        set({
          student,
          accessToken: loginResponse.accessToken,
          isLoading: false,
        });
        
        // 로컬 저장
        saveAccessToken(loginResponse.accessToken);
        saveStudentInfo(student);
        saveStudentNumber(studentNumber);
        saveDeviceId(deviceId);
        saveDeviceSecret(deviceSecret);
        savePlatform(platform);
        saveBiometricEnabled(true);
        
        console.log('[AuthStore] Registration successful (with auto-login)');
        // FCM 토큰 등록/갱신
        await registerFcmToken();
        return;
      }
      
      if (response.accessToken) {
        console.log('[AuthStore] Got accessToken from register');
        
        const student: Student = {
          id: 0,
          studentNumber,
          name,
          createdAt: new Date().toISOString(),
        };
        
        set({
          student,
          accessToken: response.accessToken,
          isLoading: false,
        });
        
        saveAccessToken(response.accessToken);
        saveStudentInfo(student);
        saveStudentNumber(studentNumber);
        saveDeviceId(deviceId);
        saveDeviceSecret(deviceSecret);
        savePlatform(platform);
        saveBiometricEnabled(true);
        
        console.log('[AuthStore] Registration successful');
        // FCM 토큰 등록/갱신
        await registerFcmToken();
      } else {
        console.log('[AuthStore] No accessToken in register, trying login...');
        
        const loginResponse = await authApi.login({ deviceId, deviceSecret });
        
        if (typeof loginResponse !== 'object' || !loginResponse.accessToken) {
          throw new Error('로그인 응답이 올바르지 않습니다');
        }
        
        const student: Student = {
          id: 0,
          studentNumber,
          name,
          createdAt: new Date().toISOString(),
        };
        
        set({
          student,
          accessToken: loginResponse.accessToken,
          isLoading: false,
        });
        
        saveAccessToken(loginResponse.accessToken);
        saveStudentInfo(student);
        saveStudentNumber(studentNumber);
        saveDeviceId(deviceId);
        saveDeviceSecret(deviceSecret);
        savePlatform(platform);
        saveBiometricEnabled(true);
        
        console.log('[AuthStore] Registration successful (with auto-login)');
        // FCM 토큰 등록/갱신
        await registerFcmToken();
      }
      
    } catch (error: any) {
      console.error('[AuthStore] Registration error:', error);
      console.error('[AuthStore] Error response:', error.response?.data);
      
      // 409 에러 처리 (이미 등록된 계정)
      if (error.response?.status === 409) {
        console.log('[AuthStore] 409 error - Account already registered');
        
        const customError = new Error('이미 가입된 계정입니다');
        (customError as any).code = 'ALREADY_REGISTERED';
        (customError as any).status = 409;
        
        set({ 
          error: '이미 가입된 계정입니다',
          isLoading: false 
        });
        
        throw customError;
      }
      
      // 500 에러 처리 (기존 로직 유지)
      if (error.response?.status === 500) {
        console.log('[AuthStore] 500 error - trying login (already registered)');
        
        try {
          const deviceId = getDeviceId();
          const deviceSecret = getDeviceSecret();
          
          if (deviceId && deviceSecret) {
            const loginResponse = await authApi.login({ deviceId, deviceSecret });
            
            if (typeof loginResponse === 'object' && loginResponse.accessToken) {
              const student: Student = {
                id: 0,
                studentNumber,
                name,
                createdAt: new Date().toISOString(),
              };
              
              set({
                student,
                accessToken: loginResponse.accessToken,
                isLoading: false,
              });
              
              saveAccessToken(loginResponse.accessToken);
              saveStudentInfo(student);
              saveStudentNumber(studentNumber);
              saveBiometricEnabled(true);
              
              console.log('[AuthStore] Logged in successfully (already registered)');
              // FCM 토큰 등록/갱신
              await registerFcmToken();
              return;
            }
          }
        } catch (loginError) {
          console.error('[AuthStore] Auto-login also failed:', loginError);
        }
      }
      
      const errorMessage = error.response?.data?.message || error.message || '회원가입에 실패했습니다';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      throw error;
    }
  },

  loginWithBiometric: async (): Promise<void> => {
    set({ isLoading: true, error: null });
    
    try {
      const deviceId = getDeviceId();
      const deviceSecret = getDeviceSecret();
      
      if (!deviceId || !deviceSecret) {
        throw new Error('저장된 기기 정보가 없습니다');
      }
      
      const response = await authApi.login({ deviceId, deviceSecret });
      
      if (typeof response !== 'object' || !response.accessToken) {
        throw new Error('로그인 응답이 올바르지 않습니다');
      }
      
      const studentInfo = getStudentInfo<Student>();
      
      if (!studentInfo) {
        throw new Error('저장된 학생 정보가 없습니다');
      }
      
      set({
        student: studentInfo,
        accessToken: response.accessToken,
        isLoading: false,
      });
      
      saveAccessToken(response.accessToken);
      console.log('[AuthStore] Login successful');
      // FCM 토큰 등록/갱신
      await registerFcmToken();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || '로그인에 실패했습니다';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      console.error('[AuthStore] Login failed:', errorMessage);
      throw error;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('[AuthStore] Logout API error:', error);
    } finally {
      set({
        student: null,
        accessToken: null,
        error: null,
      });
      clearAuthData();
      clearDeviceInfo();
    }
  },

  enableBiometric: (enabled) => {
    saveBiometricEnabled(enabled);
  },

  checkBiometricStatus: () => {
    return checkBiometricEnabled();
  },

  clear: () => {
    set({
      student: null,
      accessToken: null,
      isLoading: false,
      error: null,
    });
    clearAuthData();
    clearDeviceInfo();
  },
}));
