import { storage, getStudentId } from './storage';
import { Bookmark, BookmarkCreateInput } from '../types/bookmark';

// Storage Keys
const BOOKMARK_KEY = (bookmarkId: string) => `bookmark_${bookmarkId}`;
const BOOKMARK_LIST_KEY = (materialId: string, chapterId: string) => 
  `bookmark_list_${materialId}_${chapterId}`;
const ALL_BOOKMARKS_KEY = 'all_bookmarks_ids';

/**
 * 북마크 생성
 */
export const createBookmark = (input: BookmarkCreateInput): Bookmark => {
  try {
    const studentId = getStudentId() || 'unknown';
    const bookmarkId = `${input.materialId}_${input.chapterId}_${input.sectionIndex}_${Date.now()}`;
    
    // 섹션 텍스트를 최대 100자로 제한
    const truncatedText = input.sectionText.length > 100 
      ? input.sectionText.substring(0, 100) + '...'
      : input.sectionText;

    const bookmark: Bookmark = {
      id: bookmarkId,
      studentId,
      materialId: input.materialId,
      chapterId: input.chapterId,
      sectionId: input.sectionId,
      sectionIndex: input.sectionIndex,
      sectionText: truncatedText,
      sectionType: input.sectionType,
      createdAt: new Date().toISOString(),
      repeatCount: 0,
    };

    // 개별 북마크 저장
    storage.set(BOOKMARK_KEY(bookmarkId), JSON.stringify(bookmark));

    // 챕터별 북마크 리스트에 추가
    const listKey = BOOKMARK_LIST_KEY(input.materialId, input.chapterId);
    const existingList = storage.getString(listKey);
    const bookmarkIds: string[] = existingList ? JSON.parse(existingList) : [];
    bookmarkIds.push(bookmarkId);
    storage.set(listKey, JSON.stringify(bookmarkIds));

    // 전체 북마크 ID 리스트에 추가 (전체 조회용)
    const allBookmarksIds = storage.getString(ALL_BOOKMARKS_KEY);
    const allIds: string[] = allBookmarksIds ? JSON.parse(allBookmarksIds) : [];
    if (!allIds.includes(bookmarkId)) {
      allIds.push(bookmarkId);
      storage.set(ALL_BOOKMARKS_KEY, JSON.stringify(allIds));
    }

    console.log('[Bookmark] Created:', bookmarkId);
    return bookmark;
  } catch (error) {
    console.error('[Bookmark] Failed to create bookmark:', error);
    throw error;
  }
};

/**
 * 북마크 조회 (단일)
 */
export const getBookmark = (bookmarkId: string): Bookmark | null => {
  try {
    const data = storage.getString(BOOKMARK_KEY(bookmarkId));
    if (!data) return null;
    
    return JSON.parse(data) as Bookmark;
  } catch (error) {
    console.error('[Bookmark] Failed to get bookmark:', error);
    return null;
  }
};

/**
 * 챕터별 북마크 목록 조회
 */
export const getBookmarksByChapter = (
  materialId: string, 
  chapterId: string
): Bookmark[] => {
  try {
    const listKey = BOOKMARK_LIST_KEY(materialId, chapterId);
    const data = storage.getString(listKey);
    if (!data) return [];

    const bookmarkIds: string[] = JSON.parse(data);
    const bookmarks: Bookmark[] = [];

    for (const id of bookmarkIds) {
      const bookmark = getBookmark(id);
      if (bookmark) {
        bookmarks.push(bookmark);
      }
    }

    // sectionIndex 순으로 정렬
    return bookmarks.sort((a, b) => a.sectionIndex - b.sectionIndex);
  } catch (error) {
    console.error('[Bookmark] Failed to get bookmarks by chapter:', error);
    return [];
  }
};

/**
 * 전체 북마크 조회 (모든 교재, 모든 챕터)
 */
export const getAllBookmarks = (): Bookmark[] => {
  try {
    const allBookmarksIds = storage.getString(ALL_BOOKMARKS_KEY);
    if (!allBookmarksIds) return [];

    const ids: string[] = JSON.parse(allBookmarksIds);
    const bookmarks: Bookmark[] = [];

    for (const id of ids) {
      const bookmark = getBookmark(id);
      if (bookmark) {
        bookmarks.push(bookmark);
      }
    }

    // 최신순으로 정렬
    return bookmarks.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('[Bookmark] Failed to get all bookmarks:', error);
    return [];
  }
};

/**
 * 북마크 삭제
 */
export const deleteBookmark = (bookmarkId: string): boolean => {
  try {
    const bookmark = getBookmark(bookmarkId);
    if (!bookmark) {
      console.warn('[Bookmark] Bookmark not found:', bookmarkId);
      return false;
    }

    // 개별 북마크 삭제
    storage.remove(BOOKMARK_KEY(bookmarkId));

    // 챕터별 리스트에서 제거
    const listKey = BOOKMARK_LIST_KEY(bookmark.materialId, bookmark.chapterId);
    const existingList = storage.getString(listKey);
    if (existingList) {
      const bookmarkIds: string[] = JSON.parse(existingList);
      const filtered = bookmarkIds.filter(id => id !== bookmarkId);
      if (filtered.length > 0) {
        storage.set(listKey, JSON.stringify(filtered));
      } else {
        storage.remove(listKey);
      }
    }

    // 전체 북마크 ID 리스트에서 제거
    const allBookmarksIds = storage.getString(ALL_BOOKMARKS_KEY);
    if (allBookmarksIds) {
      const allIds: string[] = JSON.parse(allBookmarksIds);
      const filtered = allIds.filter(id => id !== bookmarkId);
      if (filtered.length > 0) {
        storage.set(ALL_BOOKMARKS_KEY, JSON.stringify(filtered));
      } else {
        storage.remove(ALL_BOOKMARKS_KEY);
      }
    }

    console.log('[Bookmark] Deleted:', bookmarkId);
    return true;
  } catch (error) {
    console.error('[Bookmark] Failed to delete bookmark:', error);
    return false;
  }
};

/**
 * 특정 섹션이 북마크되어 있는지 확인
 */
export const isBookmarked = (
  materialId: string,
  chapterId: string,
  sectionIndex: number
): boolean => {
  try {
    const bookmarks = getBookmarksByChapter(materialId, chapterId);
    return bookmarks.some(b => b.sectionIndex === sectionIndex);
  } catch (error) {
    console.error('[Bookmark] Failed to check if bookmarked:', error);
    return false;
  }
};

/**
 * 특정 섹션의 북마크 ID 가져오기
 */
export const getBookmarkIdBySection = (
  materialId: string,
  chapterId: string,
  sectionIndex: number
): string | null => {
  try {
    const bookmarks = getBookmarksByChapter(materialId, chapterId);
    const bookmark = bookmarks.find(b => b.sectionIndex === sectionIndex);
    return bookmark ? bookmark.id : null;
  } catch (error) {
    console.error('[Bookmark] Failed to get bookmark ID by section:', error);
    return null;
  }
};

/**
 * 북마크 재생 횟수 증가
 */
export const incrementBookmarkRepeatCount = (bookmarkId: string): boolean => {
  try {
    const bookmark = getBookmark(bookmarkId);
    if (!bookmark) return false;

    bookmark.repeatCount = (bookmark.repeatCount || 0) + 1;
    storage.set(BOOKMARK_KEY(bookmarkId), JSON.stringify(bookmark));

    console.log('[Bookmark] Incremented repeat count:', bookmarkId, bookmark.repeatCount);
    return true;
  } catch (error) {
    console.error('[Bookmark] Failed to increment repeat count:', error);
    return false;
  }
};

/**
 * 챕터의 모든 북마크 삭제
 */
export const deleteBookmarksByChapter = (
  materialId: string,
  chapterId: string
): boolean => {
  try {
    const bookmarks = getBookmarksByChapter(materialId, chapterId);
    
    for (const bookmark of bookmarks) {
      deleteBookmark(bookmark.id);
    }

    console.log('[Bookmark] Deleted all bookmarks for chapter:', chapterId);
    return true;
  } catch (error) {
    console.error('[Bookmark] Failed to delete bookmarks by chapter:', error);
    return false;
  }
};

/**
 * 모든 북마크 삭제
 */
export const clearAllBookmarks = (): boolean => {
  try {
    const allBookmarks = getAllBookmarks();
    
    for (const bookmark of allBookmarks) {
      storage.remove(BOOKMARK_KEY(bookmark.id));
    }

    // 모든 리스트 키 삭제
    const allKeys = storage.getAllKeys();
    allKeys.forEach((key: string) => {
      if (key.startsWith('bookmark_list_') || key === ALL_BOOKMARKS_KEY) {
        storage.remove(key);
      }
    });

    console.log('[Bookmark] Cleared all bookmarks');
    return true;
  } catch (error) {
    console.error('[Bookmark] Failed to clear all bookmarks:', error);
    return false;
  }
};