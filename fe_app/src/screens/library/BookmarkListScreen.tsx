import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  AccessibilityInfo,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  BookmarkListScreenNavigationProp,
  BookmarkListScreenRouteProp,
} from "../../navigation/navigationTypes";
import ttsService from "../../services/ttsService";
import * as Haptics from "expo-haptics";
import { TriggerContext } from "../../triggers/TriggerContext";
import BackButton from "../../components/BackButton";
import VoiceCommandButton from "../../components/VoiceCommandButton";
import { createCommonStyles } from "../../styles/commonStyles";
import { buildChaptersFromMaterialJson } from "../../utils/materialJsonMapper";
import type { Chapter } from "../../types/chapter";
import { fetchAllBookmarks, toggleBookmark } from "../../api/bookmarkApi";
import type { BookmarkListItem } from "../../types/api/bookmarkApiTypes";
import SectionRenderer from "../../components/SectionRenderer";
import { useTheme } from "../../contexts/ThemeContext";
import { parseDocument } from "htmlparser2";
import {
  HEADER_BTN_HEIGHT,
  HEADER_MIN_HEIGHT,
} from "../../constants/dimensions";
import { COLORS } from "../../constants/colors";
import { Element, Node, DataNode } from "domhandler";
import { textContent, isTag, findOne } from "domutils";
import type { Section } from "../../types/chapter";

// HTML 엔티티 디코딩
function decodeEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// 텍스트 정리
function clean(text: string): string {
  return decodeEntities(text ?? "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// <li> 변환
function convertLi(liNode: Element): string {
  const strongNode = findOne(
    (el: Node) => isTag(el) && el.name === "strong",
    liNode.children
  );

  let title = "";
  if (strongNode && isTag(strongNode)) {
    title = clean(textContent(strongNode));
  }

  const bodyNodes = liNode.children.filter((n) => n !== strongNode);
  const body = clean(textContent(bodyNodes as any));

  return `${title}\n${body}`.trim();
}

// HTML 전체 파싱
function parseHTMLForBookmark(html: string, baseId: number): Section[] {
  if (!html) return [];
  const root = parseDocument(html);

  const sections: Section[] = [];
  let curId = baseId;
  const genId = () => curId++;

  function walk(node: Node) {
    if (node.type === "text") {
      const txt = clean((node as DataNode).data);
      if (txt) {
        sections.push({ id: genId(), type: "paragraph", text: txt });
      }
      return;
    }

    if (isTag(node)) {
      const tag = node.name.toLowerCase();
      const children = node.children ?? [];

      if (/^h[1-6]$/.test(tag)) {
        const txt = clean(textContent(node));
        if (txt) {
          sections.push({ id: genId(), type: "heading", text: txt });
        }
        return;
      }

      if (tag === "p") {
        const txt = clean(textContent(node));
        if (txt) {
          sections.push({ id: genId(), type: "paragraph", text: txt });
        }
        return;
      }

      if (tag === "li") {
        const txt = convertLi(node);
        if (txt) {
          sections.push({ id: genId(), type: "list", text: txt });
        }
        return;
      }

      if (tag === "br") {
        sections.push({ id: genId(), type: "paragraph", text: "\n" });
        return;
      }

      children.forEach(walk);
      return;
    }

    (node as any).children?.forEach(walk);
  }

  root.children.forEach(walk);

  return sections.filter((s) => s.text.trim().length > 0);
}

export default function BookmarkListScreen() {
  const navigation = useNavigation<BookmarkListScreenNavigationProp>();
  const route = useRoute<BookmarkListScreenRouteProp>();
  const { material } = route.params;

  const { colors, fontSize: themeFont, isHighContrast } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, themeFont, isHighContrast),
    [colors, themeFont, isHighContrast]
  );
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);

  // 뷰 모델 타입 확장
  type BookmarkViewItem = BookmarkListItem & {
    sectionType: "heading" | "paragraph" | "list";
  };

  type BookmarksByChapter = {
    [chapterId: string]: BookmarkViewItem[];
  };
  const [bookmarksByChapter, setBookmarksByChapter] =
    useState<BookmarksByChapter>({});
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // JSON → chapter 변환 (북마크 카드 상단 챕터 정보용)
  const chaptersFromJson: Chapter[] = useMemo(() => {
    const anyMaterial: any = material;
    const json = anyMaterial?.json;
    if (json && Array.isArray(json.chapters)) {
      return buildChaptersFromMaterialJson(material.id, json);
    }
    return [];
  }, [material]);

  // TriggerContext 사용
  const { setCurrentScreenId, registerVoiceHandlers } =
    useContext(TriggerContext);

  // 서버에서 북마크 전체 로드 → 현재 material + chapterId 필터
  const loadBookmarks = useCallback(async () => {
    try {
      const all = await fetchAllBookmarks();

      const materialBookmarks = all.filter((b) => b.materialId === material.id);

      const groupedByChapter: BookmarksByChapter = materialBookmarks.reduce(
        (acc, bookmark) => {
          const viewItem: BookmarkViewItem = {
            ...bookmark,
            sectionType: "paragraph",
          };
          if (!acc[bookmark.titleId]) {
            acc[bookmark.titleId] = [];
          }
          acc[bookmark.titleId].push(viewItem);
          return acc;
        },
        {} as BookmarksByChapter
      );

      setBookmarksByChapter(groupedByChapter);
    } catch (error) {
      console.error("[BookmarkListScreen] 저장 목록 로드 실패:", error);
      AccessibilityInfo.announceForAccessibility(
        "저장된 내용을 불러오지 못했습니다."
      );
    }
  }, [material.id]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  // 화면 진입 안내
  useEffect(() => {
    const count = Object.values(bookmarksByChapter).reduce(
      (sum, b) => sum + b.length,
      0
    );
    const announcement =
      count > 0
        ? `저장된 내용 화면입니다. 지금 저장된 내용이 ${count}개 있습니다. 항목을 탭하면 그 위치로 이동하고, 길게 누르면 내용을 들을 수 있습니다.`
        : "저장된 내용 화면입니다. 아직 저장한 내용이 없습니다.";

    const timer = setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(announcement);
    }, 500);

    return () => clearTimeout(timer);
  }, [bookmarksByChapter]);

  // 복습 모드 종료 시 TTS 정지
  useEffect(() => {
    return () => {
      if (isReviewMode) {
        ttsService.stop();
      }
    };
  }, [isReviewMode]);

  const handleGoBack = useCallback(() => {
    if (isReviewMode) {
      ttsService.stop();
    }
    AccessibilityInfo.announceForAccessibility("이전 화면으로 이동합니다.");
    navigation.goBack();
  }, [navigation, isReviewMode]);
  // 단일 북마크 재생
  const handlePlayBookmark = async (bookmark: BookmarkViewItem) => {
    try {
      await ttsService.initialize(
        [
          {
            id: 0,
            text: bookmark.contents,
            type: bookmark.sectionType ?? "paragraph",
          },
        ],
        0,
        {
          rate: 1.0,
          playMode: "single",

          onStart: () => {
            setIsPlaying(true);
          },

          onDone: () => {
            setIsPlaying(false);
            AccessibilityInfo.announceForAccessibility("재생이 끝났습니다.");
          },

          onError: (error) => {
            console.error("TTS Error:", error);
            setIsPlaying(false);
            AccessibilityInfo.announceForAccessibility(
              "음성 재생 중 오류가 발생했습니다."
            );
          },
        }
      );

      await ttsService.play();

      AccessibilityInfo.announceForAccessibility(
        `저장된 내용을 재생합니다. 제목: ${bookmark.title}`
      );
      Haptics.selectionAsync();
    } catch (error) {
      console.error("[Bookmark] Play error:", error);
      AccessibilityInfo.announceForAccessibility(
        "저장된 내용을 재생할 수 없습니다."
      );
    }
  };

  // 복습 모드 시작 (저장된 contents 순서대로)
  const handleStartReviewMode = useCallback(async () => {
    const bookmarks = Object.values(bookmarksByChapter).flat();
    if (bookmarks.length === 0) {
      AccessibilityInfo.announceForAccessibility("저장된 내용이 없습니다.");
      return;
    }
    if (bookmarks.length === 0) {
      AccessibilityInfo.announceForAccessibility("저장된 내용이 없습니다.");
      return;
    }

    setIsReviewMode(true);
    setCurrentReviewIndex(0);

    try {
      // 북마크들을 섹션 구조와 동일하게 재생할 수 있도록 SectionRenderer 규칙 대비
      const sections = bookmarks.map((b, idx) => ({
        id: idx,
        text: textContent(parseDocument(b.contents)),
        type: b.sectionType ?? "paragraph",
      }));

      await ttsService.initialize(sections, 0, {
        rate: 1.0,
        playMode: "repeat",
        repeatCount: 2,

        pauseSettings: {
          heading: 3000,
          paragraph: 3000,
          formula: 3000,
          imageDescription: 3000,
          default: 3000,
        },

        onStart: () => {
          setIsPlaying(true);
        },

        onSectionChange: (index) => {
          setCurrentReviewIndex(index);
          AccessibilityInfo.announceForAccessibility(
            `${index + 1}번째 저장된 내용입니다. 총 ${bookmarks.length}개 중`
          );
        },

        onDone: () => {
          setIsPlaying(false);
          setIsReviewMode(false);
          setCurrentReviewIndex(0);
          AccessibilityInfo.announceForAccessibility(
            "저장된 내용을 모두 들었습니다."
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },

        onError: (error) => {
          console.error("TTS Error:", error);
          setIsPlaying(false);
          setIsReviewMode(false);
          AccessibilityInfo.announceForAccessibility(
            "음성 재생 중 오류가 발생했습니다."
          );
        },
      });

      await ttsService.play();

      AccessibilityInfo.announceForAccessibility(
        "복습 모드를 시작합니다. 저장된 내용을 순서대로 두 번씩 재생합니다."
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("[ReviewMode] Start error:", error);
      setIsReviewMode(false);

      AccessibilityInfo.announceForAccessibility(
        "복습 모드를 시작할 수 없습니다."
      );
    }
  }, [bookmarksByChapter]);

  // 복습 모드 중지
  const handleStopReviewMode = useCallback(async () => {
    await ttsService.stop();
    setIsPlaying(false);
    setIsReviewMode(false);
    setCurrentReviewIndex(0);

    AccessibilityInfo.announceForAccessibility("복습 모드를 중지했습니다.");
    Haptics.selectionAsync();
  }, []);

  // 저장 삭제
  const handleDeleteBookmark = (bookmark: BookmarkViewItem) => {
    Alert.alert("저장 삭제", `${bookmark.title} 항목을 삭제하시겠습니까?`, [
      {
        text: "취소",
        onPress: () =>
          AccessibilityInfo.announceForAccessibility("취소했습니다."),
        style: "cancel",
      },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await toggleBookmark({
              materialId: bookmark.materialId,
              titleId: bookmark.titleId,
            });

            setBookmarksByChapter((prev: BookmarksByChapter) => {
              const newBookmarksByChapter = { ...prev };
              const chapterId = bookmark.titleId;

              if (newBookmarksByChapter[chapterId]) {
                newBookmarksByChapter[chapterId] = newBookmarksByChapter[
                  chapterId
                ].filter(
                  (b: BookmarkViewItem) => b.bookmarkId !== bookmark.bookmarkId
                );
                if (newBookmarksByChapter[chapterId].length === 0) {
                  delete newBookmarksByChapter[chapterId];
                }
              }
              return newBookmarksByChapter;
            });

            AccessibilityInfo.announceForAccessibility(
              "저장된 내용을 삭제했습니다."
            );

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            console.error("[Bookmark] 삭제 실패:", error);

            AccessibilityInfo.announceForAccessibility("삭제에 실패했습니다.");
          }
        },
      },
    ]);
  };

  // 저장된 항목을 눌러 해당 챕터로 이동
  const handleGoToSection = (bookmark: BookmarkViewItem) => {
    if (isReviewMode) {
      AccessibilityInfo.announceForAccessibility(
        "복습 모드를 먼저 중지해 주세요."
      );
      return;
    }

    navigation.navigate("Player", {
      material,
      chapterId: Number(bookmark.titleId),
      fromStart: false,
      initialSectionIndex: 0,
    });
  };

  // 날짜 포맷
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${month}/${day} ${hours}:${minutes}`;
  };

  // sectionType 라벨
  const getSectionTypeLabel = (type: string) => {
    switch (type) {
      case "heading":
        return "제목";
      case "paragraph":
        return "본문";
      case "list":
        return "목록";
      default:
        return "내용";
    }
  };

  // 음성 명령 등록
  useEffect(() => {
    setCurrentScreenId("BookmarkList");

    registerVoiceHandlers("BookmarkList", {
      playPause: () => {
        if (isReviewMode) handleStopReviewMode();
        else handleStartReviewMode();
      },
      goBack: handleGoBack,
    });

    return () => {
      registerVoiceHandlers("BookmarkList", {});
    };
  }, [
    setCurrentScreenId,
    registerVoiceHandlers,
    handleGoBack,
    handleStartReviewMode,
    handleStopReviewMode,
    isReviewMode,
  ]);
  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더: 뒤로가기 / 타이틀 / 음성 명령 버튼 */}
      <View style={[commonStyles.headerContainer, styles.header]}>
        <BackButton
          onPress={handleGoBack}
          style={commonStyles.headerBackButton}
        />

        <View style={styles.headerTitle}>
          <Text
            style={styles.titleText}
            accessible={true}
            accessibilityRole="header"
          >
            저장 목록
          </Text>
        </View>

        <View style={styles.headerRight}>
          <VoiceCommandButton
            style={[commonStyles.headerVoiceButton]}
            accessibilityHint="두 번 탭한 뒤 복습 시작, 복습 중지, 뒤로 가기라고 말해 보세요."
          />
        </View>
      </View>

      {/* 챕터 정보 */}
      <View style={styles.infoSection}>
        <Text style={styles.materialTitle} accessibilityRole="text">
          {material.title}
        </Text>
        <Text style={styles.itemCount}>
          총{" "}
          {Object.values(bookmarksByChapter).reduce(
            (sum, b) => sum + b.length,
            0
          )}
          개의 저장된 내용
        </Text>
      </View>

      {/* 저장된 목록 리스트 */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.listArea}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        accessible={false}
      >
        {Object.keys(bookmarksByChapter).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text
              style={styles.emptyText}
              accessible={true}
              accessibilityRole="text"
            >
              저장한 내용이 없습니다
            </Text>
            <Text
              style={styles.emptyHint}
              accessible={true}
              accessibilityRole="text"
            >
              학습 중 중요한 부분에서{"\n"}저장 버튼을 눌러 보세요
            </Text>
          </View>
        ) : (
          Object.entries(bookmarksByChapter).map(([chapId, bookmarks]) => {
            const chapter = chaptersFromJson.find(
              (c) => c.chapterId === Number(chapId)
            );

            return (
              <View key={chapId} style={styles.chapterGroup}>
                {/* <Text style={styles.chapterTitle}>{chapter?.title || `챕터 ${chapId}`}</Text> */}
                {bookmarks.map((bookmark, index) => {
                  const isActive = isReviewMode && currentReviewIndex === index; // TODO: 복습모드 인덱스 계산 로직 수정 필요

                  return (
                    <View
                      key={bookmark.bookmarkId}
                      style={[
                        styles.bookmarkCard,
                        isActive && styles.activeBookmarkCard,
                      ]}
                    >
                      {/* 북마크 내용을 누르면 이동 / 길게 누르면 재생 */}
                      <TouchableOpacity
                        style={styles.bookmarkContent}
                        onPress={() => handleGoToSection(bookmark)}
                        onLongPress={() => handlePlayBookmark(bookmark)}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`저장된 내용: ${
                          bookmark.title
                        }. ${formatDate(bookmark.createdAt)}.`}
                        accessibilityHint="탭하면 해당 위치로 이동하고, 길게 누르면 내용을 들을 수 있습니다."
                      >
                        {/* 상단 번호 + 타입 */}
                        <View style={styles.bookmarkHeader}>
                          <Text style={styles.sectionNumber}>#{chapId}</Text>
                          {/* <Text style={styles.sectionTypeBadge}>
                            {getSectionTypeLabel(bookmark.sectionType)}
                          </Text> */}
                        </View>

                        {/* 제목 */}
                        <Text style={styles.bookmarkTitle}>
                          {bookmark.title}
                        </Text>

                        {/* 하단 날짜 */}
                        <View style={styles.metaContainer}>
                          <Text style={styles.dateText}>
                            {formatDate(bookmark.createdAt)}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* 삭제 버튼 */}
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteBookmark(bookmark)}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel="저장 삭제"
                        accessibilityHint="두 번 탭하면 이 저장된 내용을 삭제합니다."
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <Text style={styles.deleteButtonText}>삭제</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* 하단: 복습 모드 버튼 */}
      {Object.keys(bookmarksByChapter).length > 0 && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.reviewButton,
              isReviewMode && styles.reviewButtonActive,
            ]}
            onPress={
              isReviewMode ? handleStopReviewMode : handleStartReviewMode
            }
            accessible={true}
            accessibilityLabel={
              isReviewMode ? "복습 모드 중지" : "복습 모드 시작"
            }
            accessibilityRole="button"
            accessibilityHint={
              isReviewMode
                ? "복습을 멈춥니다."
                : "저장된 내용을 순서대로 두 번씩 들을 수 있습니다."
            }
          >
            {isReviewMode ? (
              <>
                <Text style={styles.reviewButtonText}>복습 중지</Text>
                <Text style={styles.reviewButtonSubtext}>2회씩 반복 중</Text>
              </>
            ) : (
              <>
                <Text style={styles.reviewButtonText}>복습 모드</Text>
                <Text style={styles.reviewButtonSubtext}>2회씩 반복 재생</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
const createStyles = (
  colors: any,
  fontSize: (size: number) => number,
  isHighContrast: boolean
) => {
  const isPrimaryColors = "primary" in colors;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },

    header: {
      borderBottomWidth: 3,
      borderBottomColor: isHighContrast
        ? COLORS.secondary.main
        : isPrimaryColors
        ? colors.primary.main
        : colors.border.default,
      minHeight: HEADER_MIN_HEIGHT,
    },
    headerTitle: {
      alignItems: "center",
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      height: HEADER_BTN_HEIGHT,
    },
    titleText: {
      fontSize: fontSize(28),
      fontWeight: "bold",
      color: colors.text.primary,
    },
    countText: {
      fontSize: fontSize(22),
      color: colors.text.secondary,
      marginTop: 4,
    },

    /* -------------------------
     * Chapter Info
     * (infoSection from QuestionListScreen)
     * ------------------------- */
    infoSection: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 2,
      borderBottomColor: isHighContrast
        ? COLORS.secondary.main
        : isPrimaryColors
        ? colors.primary.main
        : colors.border.default,
      backgroundColor: colors.background.elevated || colors.background.default,
    },
    materialTitle: {
      fontSize: fontSize(26),
      fontWeight: "bold",
      color: colors.text.primary,
      marginBottom: 8,
    },
    itemCount: {
      fontSize: fontSize(17),
      color: colors.text.secondary,
    },

    /* -------------------------
     * List Area
     * ------------------------- */
    listArea: {
      flex: 1,
    },
    listContent: {
      padding: 16,
    },

    /* -------------------------
     * Empty
     * ------------------------- */
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 80,
    },
    emptyText: {
      fontSize: fontSize(28),
      fontWeight: "bold",
      color: colors.text.tertiary || colors.text.secondary,
      marginBottom: 12,
    },
    emptyHint: {
      fontSize: fontSize(24),
      color: isPrimaryColors ? colors.border.main : colors.border.default,
      textAlign: "center",
      lineHeight: 34,
    },

    chapterGroup: {
      marginBottom: 24,
    },

    chapterTitle: {
      fontSize: fontSize(22),
      fontWeight: "bold",
      color: colors.text.secondary,
      marginBottom: 16,
      paddingBottom: 8,
      borderBottomWidth: 2,
      borderBottomColor: isPrimaryColors
        ? colors.border.light
        : colors.border.default,
    },

    /* -------------------------
     * Bookmark Card
     * ------------------------- */
    bookmarkCard: {
      backgroundColor: isPrimaryColors
        ? colors.primary.default
        : colors.background.elevated,
      borderRadius: 12,
      marginBottom: 20,
      borderWidth: 2,
      borderColor: isPrimaryColors ? colors.primary.main : colors.accent.primary,
      overflow: "hidden",
    },
    activeBookmarkCard: {
      borderColor: colors.status.success,
      backgroundColor: isPrimaryColors
        ? colors.status.successLight
        : colors.background.elevated,
    },
    bookmarkContent: {
      flex: 1,
      padding: 16,
    },

    bookmarkHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    sectionNumber: {
      fontSize: fontSize(24),
      fontWeight: "bold",
      color: isPrimaryColors ? colors.secondary.dark : colors.accent.secondary,
    },
    sectionTypeBadge: {
      fontSize: fontSize(18),
      color: colors.text.secondary,
      backgroundColor: isPrimaryColors
        ? colors.secondary.lightest
        : colors.background.elevated,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 8,
      fontWeight: "600",
    },

    bookmarkTitle: {
      fontSize: fontSize(24),
      fontWeight: "700",
      color: colors.text.primary,
      marginBottom: 8,
    },

    /* SectionRenderer Wrapper */
    sectionRendererWrapper: {
      marginTop: 6,
      marginBottom: 16,
    },

    bookmarkText: {
      fontSize: fontSize(20),
      lineHeight: 34,
      color: colors.text.secondary,
      fontWeight: "500",
    },

    metaContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 12,
    },
    dateText: {
      fontSize: fontSize(15),
      color: colors.text.tertiary || colors.text.secondary,
    },

    /* -------------------------
     * Delete Button
     * ------------------------- */
    deleteButton: {
      backgroundColor: colors.status.error,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
      borderTopWidth: 2,
      borderTopColor: isPrimaryColors
        ? colors.border.light
        : colors.border.default,
    },
    deleteButtonText: {
      fontSize: fontSize(16),
      fontWeight: "700",
      color: isPrimaryColors ? colors.text.inverse : colors.text.primary,
    },

    /* -------------------------
     * Bottom review controls
     * ------------------------- */
    bottomContainer: {
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderTopWidth: 3,
      borderTopColor: isPrimaryColors
        ? colors.border.light
        : colors.border.default,
      backgroundColor: colors.background.elevated || colors.background.default,
    },

    reviewButton: {
      backgroundColor: colors.status.success,
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
      minHeight: 100,
      justifyContent: "center",
      borderWidth: 3,
      borderColor: colors.status.success,
    },
    reviewButtonActive: {
      backgroundColor: colors.status.error,
      borderColor: colors.status.error,
    },
    reviewButtonText: {
      fontSize: fontSize(30),
      fontWeight: "bold",
      color: isPrimaryColors ? colors.text.inverse : colors.text.primary,
      marginBottom: 8,
    },
    reviewButtonSubtext: {
      fontSize: fontSize(22),
      color: isPrimaryColors
        ? colors.status.successLight
        : colors.text.secondary,
      fontWeight: "700",
    },

    /* -------------------------
     * Error text
     * ------------------------- */
    errorText: {
      fontSize: fontSize(26),
      color: colors.text.secondary,
      fontWeight: "600",
    },
  });
};
