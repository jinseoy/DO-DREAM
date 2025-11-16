/**
 * POST /api/bookmarks/toggle 요청 바디
 */
export interface BookmarkToggleRequest {
  materialId: number;
  titleId: string;
}

/**
 * POST /api/bookmarks/toggle 응답
 */
export interface BookmarkToggleResponse {
  bookmarkId: number;
  message: string;
  bookmarked: boolean;
}

/**
 * GET /api/bookmarks 응답 아이템
 */
export interface BookmarkListItem {
  bookmarkId: number;
  materialId: number;
  materialTitle: string;
  titleId: string;
  title: string;
  contents: string;
  createdAt: string; // ISO string
}

/**
 * GET /api/bookmarks/material/{materialId} 응답
 */
export interface BookmarksByMaterialResponse {
  materialId: number;
  bookmarkedTitleIds: string[];
}
