import { AxiosResponse } from "axios";
import apiClient from "./apiClient";
import {
  SharedMaterialsResponse,
  MaterialJson,
} from "../types/api/materialApiTypes";

const MATERIAL_ENDPOINTS = {
  SHARED: "/api/materials/shared",
  JSON: (materialId: number | string) =>
    `/api/materials/shared/${materialId}/json`,
};

/**
 * 공유받은 학습 자료 목록 조회 (학생/앱)
 * GET /api/materials/shared
 *
 * - 앱을 완전히 종료했다가 다시 켤 때
 * - 교사가 새로운 자료를 공유해서 FCM 알림이 도착했을 때
 *   → 이 함수를 호출해서 최신 목록을 가져온다.
 */
export async function fetchSharedMaterials(): Promise<SharedMaterialsResponse> {
  const response: AxiosResponse<SharedMaterialsResponse> =
    await apiClient.get<SharedMaterialsResponse>(MATERIAL_ENDPOINTS.SHARED);

  return response.data;
}

/**
 * 특정 교재의 JSON(본문 + 퀴즈) 조회
 * GET /api/materials/shared/{materialId}/json
 *
 * - LibraryScreen에서 교재를 선택했을 때
 * - materialId 기준으로 텍스트/퀴즈 전체를 가져온다.
 */
export async function fetchMaterialJson(
  materialId: number
): Promise<MaterialJson> {
  const url = MATERIAL_ENDPOINTS.JSON(materialId);
  const response: AxiosResponse<MaterialJson> =
    await apiClient.get<MaterialJson>(url);

  return response.data;
}
