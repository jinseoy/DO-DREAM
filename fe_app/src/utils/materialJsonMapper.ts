import { Chapter, Section } from "../types/chapter";
import type { MaterialJson, MaterialJsonChapter } from "../types/api/materialApiTypes";

/**
 * HTML 엔티티를 디코딩
 */
function decodeHTMLEntities(text: string): string {
  if (!text) return "";

  let result = text;
  result = result.replace(/&nbsp;/g, " ");
  result = result.replace(/&lt;/g, "<");
  result = result.replace(/&gt;/g, ">");
  result = result.replace(/&amp;/g, "&");
  result = result.replace(/&quot;/g, '"');
  result = result.replace(/&#39;/g, "'");
  result = result.replace(/&apos;/g, "'");

  return result;
}

/**
 * HTML 태그를 제거하고 텍스트만 추출
 * 단, <br>, </li>, </p> 등은 줄바꿈으로 변환
 */
function htmlToPlainText(html: string): string {
  if (!html) return "";

  let text = html;

  // 줄바꿈이 필요한 태그들
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/ul>/gi, "\n");
  text = text.replace(/<\/ol>/gi, "\n");

  // 나머지 모든 태그 제거
  text = text.replace(/<[^>]+>/g, "");

  // HTML 엔티티 디코딩
  text = decodeHTMLEntities(text);

  // 연속된 공백을 하나로
  text = text.replace(/[ \t]+/g, " ");
  
  // 연속된 줄바꿈을 최대 2개로
  text = text.replace(/\n{3,}/g, "\n\n");
  
  // 각 줄의 앞뒤 공백 제거
  text = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0) // 빈 줄 제거
    .join("\n");

  return text.trim();
}

/**
 * HTML 문자열을 섹션 단위로 분할
 * 
 * 분할 규칙:
 * - <h1>~<h6> 태그를 섹션 구분자로 사용
 * - 각 heading과 다음 heading 사이의 모든 내용을 하나의 섹션으로 묶음
 * - 예: <h3>(1) 제목</h3><p>내용1</p><p>내용2</p> → 하나의 섹션
 */
function parseHTMLToSections(html: string, sectionIdBase: number): Section[] {
  if (!html) return [];

  const sections: Section[] = [];
  let currentId = sectionIdBase;

  // heading 태그의 위치를 찾기 위한 정규식
  // [\s\S]를 사용하여 줄바꿈 포함 모든 문자 매칭
  const headingRegex = /<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi;
  
  // heading 태그의 위치를 찾음
  const headingMatches: Array<{ start: number; end: number; tag: string }> = [];
  let match;
  
  // exec를 사용하여 모든 매치 찾기
  const regex = new RegExp(headingRegex.source, headingRegex.flags);
  while ((match = regex.exec(html)) !== null) {
    headingMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      tag: match[0],
    });
  }

  console.log(`[materialJsonMapper] HTML 길이: ${html.length}, heading 개수: ${headingMatches.length}`);

  // heading이 없는 경우: 전체를 하나의 섹션으로
  if (headingMatches.length === 0) {
    const plainText = htmlToPlainText(html);
    if (plainText) {
      sections.push({
        id: currentId++,
        text: plainText,
        type: "paragraph",
      });
    }
    return sections;
  }

  // heading 이전에 내용이 있는 경우 (첫 번째 섹션)
  if (headingMatches.length > 0 && headingMatches[0].start > 0) {
    const beforeFirstHeading = html.substring(0, headingMatches[0].start);
    const plainText = htmlToPlainText(beforeFirstHeading);
    
    if (plainText) {
      sections.push({
        id: currentId++,
        text: plainText,
        type: "paragraph",
      });
      console.log(`[materialJsonMapper] heading 이전 섹션 추가: ${plainText.substring(0, 50)}...`);
    }
  }

  // 각 heading과 다음 heading 사이의 내용을 하나의 섹션으로 묶음
  for (let i = 0; i < headingMatches.length; i++) {
    const currentHeading = headingMatches[i];
    const nextHeading = headingMatches[i + 1];

    // 현재 heading부터 다음 heading 전까지의 HTML 추출
    const sectionHTML = nextHeading
      ? html.substring(currentHeading.start, nextHeading.start)
      : html.substring(currentHeading.start);

    // HTML을 plain text로 변환
    const plainText = htmlToPlainText(sectionHTML);

    if (plainText) {
      sections.push({
        id: currentId++,
        text: plainText,
        type: "paragraph",
      });
      console.log(`[materialJsonMapper] 섹션 ${i + 1} 추가: ${plainText.substring(0, 50)}...`);
    } else {
      console.warn(`[materialJsonMapper] 섹션 ${i + 1} 텍스트가 비어있음`);
    }
  }

  console.log(`[materialJsonMapper] 총 ${sections.length}개 섹션 생성`);

  return sections;
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

  console.log(`[materialJsonMapper] 챕터 ${chapterNumber} 빌드 시작: ${chapterJson.title}`);

  // HTML을 plain text로 변환 (전체 content 저장용)
  const plainContent = htmlToPlainText(chapterJson.content || "");

  // Section ID 베이스
  let sectionIdBase = chapterNumber * 1000;

  const sections: Section[] = [];

  // 1) 챕터 제목을 heading 섹션으로
  sections.push({
    id: sectionIdBase++,
    text: chapterJson.title,
    type: "heading",
  });

  // 2) HTML content를 heading 기준으로 섹션 분할
  const contentSections = parseHTMLToSections(
    chapterJson.content || "",
    sectionIdBase
  );
  sections.push(...contentSections);

  console.log(`[materialJsonMapper] 챕터 ${chapterNumber} 완료: 총 ${sections.length}개 섹션`);

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
 * type === "content"인 챕터만 필터링하여 변환합니다.
 * type === "quiz"인 챕터는 제외됩니다.
 */
export function buildChaptersFromMaterialJson(
  materialId: number | string,
  json: MaterialJson
): Chapter[] {
  if (!json || !Array.isArray(json.chapters)) {
    console.error("[materialJsonMapper] Invalid json structure");
    return [];
  }

  console.log(`[materialJsonMapper] MaterialJson 변환 시작: materialId=${materialId}`);

  // type === "content"인 챕터만 필터링
  const contentChapters = json.chapters.filter(
    (chapterJson) => chapterJson.type === "content"
  );

  console.log(`[materialJsonMapper] 총 ${contentChapters.length}개의 content 챕터 발견`);

  const result = contentChapters.map((chapterJson, index) =>
    buildChapterFromJson(materialId, chapterJson, index)
  );

  console.log(`[materialJsonMapper] 변환 완료: ${result.length}개 챕터`);

  return result;
}