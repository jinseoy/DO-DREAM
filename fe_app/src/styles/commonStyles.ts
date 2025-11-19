import { StyleSheet } from "react-native";
import { COLORS, HIGH_CONTRAST_COLORS } from "../constants/colors";

type ThemeColors = typeof COLORS | typeof HIGH_CONTRAST_COLORS;

/**
 * 테마에 따른 공통 스타일 생성 함수
 * @param colors - 고대비 모드 여부에 따른 색상 객체
 */
export const createCommonStyles = (colors: ThemeColors) => StyleSheet.create({
  // 컨테이너
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },

  // 화면 상단 헤더 컨테이너
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.background?.elevated || colors.background.default,
    borderBottomWidth: 3, // 두꺼운 경계선 (접근성)
    borderBottomColor: 'primary' in colors ? colors.primary.main : colors.accent.primary,
  },
  headerBackButton: {
    padding: 0,
    minWidth: 88, // 충분한 터치 영역
    minHeight: 44,
  },
  headerVoiceButton: {
    padding: 0,
    minWidth: 88,
    minHeight: 44,
  },

  // 메인 버튼 (Primary)
  primaryButton: {
    backgroundColor: 'primary' in colors ? colors.primary.main : colors.accent.primary,
    borderWidth: 4,
    borderColor: 'primary' in colors ? colors.primary.dark : colors.border.focus,
    padding: 28,
    borderRadius: 16,
    minHeight: 130,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: 'button' in colors ? colors.button.primary.text : COLORS.common.white,
    fontSize: 26,
    fontWeight: "bold",
  },

  // 보조 버튼 (Secondary)
  secondaryButton: {
    backgroundColor: 'secondary' in colors ? colors.secondary.main : colors.accent.secondary,
    borderWidth: 4,
    borderColor: 'secondary' in colors ? colors.secondary.dark : colors.border.focus,
    padding: 28,
    borderRadius: 16,
    minHeight: 130,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.text.primary,
    fontSize: 26,
    fontWeight: "bold",
  },

  // 텍스트 스타일
  title: {
    fontSize: 52,
    fontWeight: "bold",
    color: 'primary' in colors ? colors.primary.main : colors.accent.primary,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 32,
    fontWeight: "600",
    color: colors.text.secondary,
    marginBottom: 12,
  },
  body: {
    fontSize: 20,
    color: colors.text.primary,
    lineHeight: 30,
  },
  smallText: {
    fontSize: 18,
    color: colors.text.tertiary || colors.text.secondary,
  },

  // 입력 필드
  input: {
    fontSize: 26,
    padding: 18,
    borderWidth: 3,
    borderColor: 'primary' in colors ? colors.border.main : colors.border.default,
    borderRadius: 12,
    backgroundColor: colors.background.default,
    color: colors.text.primary,
    minHeight: 60,
  },
  inputFocused: {
    borderColor: 'primary' in colors ? colors.primary.main : colors.border.focus,
    borderWidth: 4,
  },

  // 카드/박스
  card: {
    backgroundColor: 'primary' in colors ? colors.primary.lightest : colors.background.elevated,
    borderWidth: 2,
    borderColor: 'primary' in colors ? colors.primary.main : colors.border.focus,
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },

  // 여백
  marginBottom16: {
    marginBottom: 16,
  },
  marginBottom24: {
    marginBottom: 24,
  },
  marginBottom32: {
    marginBottom: 32,
  },

  // 중앙 정렬
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
});

/**
 * 기본 스타일 (고대비 모드 미적용)
 * 하위 호환성을 위해 유지
 */
export const commonStyles = createCommonStyles(COLORS);