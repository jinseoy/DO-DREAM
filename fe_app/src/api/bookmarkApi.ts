import { AxiosResponse } from "axios";
import apiClient from "./apiClient";
import {
  BookmarkToggleRequest,
  BookmarkToggleResponse,
  BookmarkListItem,
  BookmarksByMaterialResponse,
} from "../types/api/bookmarkApiTypes";

const BOOKMARK_ENDPOINTS = {
  TOGGLE: "/api/bookmarks/toggle",
  LIST_ALL: "/api/bookmarks",
  BY_MATERIAL: (materialId: number | string) =>
    `/api/bookmarks/material/${materialId}`,
};

/**
 * 북마크 토글
 * POST /api/bookmarks/toggle
 *
 * - 이미 북마크된 (materialId, titleId)이면 → 삭제
 * - 아니면 → 등록
 */
export async function toggleBookmark(
  payload: BookmarkToggleRequest
): Promise<BookmarkToggleResponse> {
  const response: AxiosResponse<BookmarkToggleResponse> =
    await apiClient.post<BookmarkToggleResponse>(
      BOOKMARK_ENDPOINTS.TOGGLE,
      payload
    );

  return response.data;
}

/**
 * 전체 북마크 목록 조회
 * GET /api/bookmarks
 *
 * - 마이페이지나 "전체 북마크 모아보기" 화면에서 사용 가능
 */
export async function fetchAllBookmarks(): Promise<BookmarkListItem[]> {
  const response: AxiosResponse<BookmarkListItem[]> =
    await apiClient.get<BookmarkListItem[]>(BOOKMARK_ENDPOINTS.LIST_ALL);

  return response.data;
}

/**
 * 특정 자료의 북마크 목록 조회
 * GET /api/bookmarks/material/{materialId}
 *
 * - 자료 JSON을 불러올 때 같이 호출해서
 *   각 챕터(titleId)가 북마크됐는지 여부를 캐싱하는 용도
 */
export async function fetchBookmarksByMaterial(
  materialId: number
): Promise<BookmarksByMaterialResponse> {
  const url = BOOKMARK_ENDPOINTS.BY_MATERIAL(materialId);
  const response: AxiosResponse<BookmarksByMaterialResponse> =
    await apiClient.get<BookmarksByMaterialResponse>(url);

  return response.data;
}
