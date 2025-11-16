// 공통 API 타입

/**
 * API 성공 응답 구조
 */
export interface ApiSuccessResponse<T = null> {
  code: string;
  message: string;
  status: 200 | 201;
  data: T;
  timestamp: string;
}

/**
 * API 에러 응답 구조
 */
export interface ApiErrorResponse<T = null> {
  code: string;
  message: string;
  status: number;
  data: T;
  timestamp: string;
}

export class ApiError extends Error {
  constructor(
    public message: string,
    public code?: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API 응답 타입 (성공 또는 에러)
 */
export type ApiResponse<T = null> = ApiSuccessResponse<T> | ApiErrorResponse;