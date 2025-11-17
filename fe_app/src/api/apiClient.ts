import axios, { AxiosInstance } from 'axios';
import { setupInterceptors } from './interceptors';

const API_BASE_URL = 'https://www.dodream.io.kr';

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: false, // React Native에서는 쿠키 대신 Authorization 헤더 사용
      timeout: 300000, // RAG API는 응답 생성에 시간이 걸릴 수 있으므로 5분으로 증가
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // 인터셉터 설정
    setupInterceptors(this.instance);
  }

  getInstance(): AxiosInstance {
    return this.instance;
  }
}

export const apiClient = new ApiClient();
export default apiClient.getInstance();