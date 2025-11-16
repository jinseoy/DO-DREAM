import axios, { AxiosInstance } from 'axios';
import { setupInterceptors } from './interceptors';

const API_BASE_URL = 'https://www.dodream.io.kr';

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true, // 쿠키를 주고받기 위해 추가
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
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