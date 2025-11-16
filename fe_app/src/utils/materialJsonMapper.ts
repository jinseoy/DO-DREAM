import { Chapter, Section } from "../types/chapter";
import type { MaterialJson, MaterialJsonChapter } from "../types/api/materialApiTypes";

/**
 * 아주 간단한 HTML → 텍스트 변환기
 * - <br>, <li>, <p> 등은 줄바꿈으로 치환
 * - 나머지 태그는 제거
 * - &nbsp; 같은 기본 엔티티 일부 치환
 *
 * 추후 필요하면 정교한 파서로 교체 가능.
 */
function htmlToPlainText(html: string): string {
  if (!html) return "";

  let text = html;

  // 줄바꿈으로 바꾸고 싶은 태그들
  text = text.replace(/<\/(p|div|h[1-6]|li|ul|ol)>/gi, "\n");
  text = text.replace(/<(br|br\/)>/gi, "\n");

  // 나머지 태그 제거
  text = text.replace(/<[^>]+>/g, "");

  // HTML 엔티티 몇 개만 기본 치환
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // 연속 공백/줄바꿈 정리
  text = text.replace(/\s+\n/g, "\n");
  text = text.replace(/\n\s+/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

/**
 * 단일 챕터 JSON → Chapter 도메인 타입으로 변환
 */
function buildChapterFromJson(
  materialId: number | string,
  chapterJson: MaterialJsonChapter,
  index: number
): Chapter {
  const materialIdStr = String(materialId);

  // JSON의 id가 "1", "2" 처럼 들어오므로 숫자로 파싱, 실패하면 index 기반
  const chapterNumber =
    Number(chapterJson.id) && !Number.isNaN(Number(chapterJson.id))
      ? Number(chapterJson.id)
      : index + 1;

  const plainContent = htmlToPlainText(chapterJson.content || "");

  const sections: Section[] = [];

  let sectionIdBase = chapterNumber * 1000;

  // 1) 챕터 제목을 heading 섹션으로
  sections.push({
    id: sectionIdBase++,
    text: chapterJson.title,
    type: "heading",
  });

  // 2) 본문 전체를 하나의 paragraph 섹션으로 (추후 더 잘게 쪼개도 됨)
  if (plainContent.length > 0) {
    sections.push({
      id: sectionIdBase++,
      text: plainContent,
      type: "paragraph",
    });
  }

  return {
    chapterId: chapterNumber,
    materialId: materialIdStr,
    chapterNumber,
    title: chapterJson.title,
    content: plainContent,
    sections,
  };
}

/**
 * MaterialJson 전체 → Chapter 배열로 변환
 *
 * 현재는 content/quiz 구분 없이 모두 Chapter로 만들어서
 * TTS로 읽을 수 있도록 한다.
 * 나중에 필요하면 type === "quiz" 인 챕터는 따로 Quiz 도메인으로 분리 가능.
 */
export function buildChaptersFromMaterialJson(
  materialId: number | string,
  json: MaterialJson
): Chapter[] {
  if (!json || !Array.isArray(json.chapters)) return [];

  return json.chapters.map((chapterJson, index) =>
    buildChapterFromJson(materialId, chapterJson, index)
  );
}
