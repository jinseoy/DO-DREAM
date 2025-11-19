/**
 * 테마 컨텍스트 - 고대비 모드, 글자 크기 등 앱 전역 테마 설정 제공
 *
 * 사용법:
 * ```tsx
 * import { useTheme } from '@/contexts/ThemeContext';
 *
 * const MyComponent = () => {
 *   const { colors, fontSize, isHighContrast } = useTheme();
 *
 *   return (
 *     <Text style={{ color: colors.text.primary, fontSize: fontSize(16) }}>
 *       Hello World
 *     </Text>
 *   );
 * };
 * ```
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useAppSettingsStore } from '../stores/appSettingsStore';
import { COLORS, HIGH_CONTRAST_COLORS } from '../constants/colors';

// 테마 인터페이스
interface Theme {
  colors: typeof COLORS | typeof HIGH_CONTRAST_COLORS;
  isHighContrast: boolean;
  fontSizeScale: number;
  fontSize: (baseSize: number) => number;
}

// 컨텍스트 생성
const ThemeContext = createContext<Theme | undefined>(undefined);

// 프로바이더 Props
interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * 테마 프로바이더 - 앱 설정 스토어와 연동하여 테마 정보 제공
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // 앱 설정 스토어에서 설정 가져오기
  const settings = useAppSettingsStore((state) => state.settings);

  // 고대비 모드에 따른 색상 선택
  const colors = settings.highContrastMode ? HIGH_CONTRAST_COLORS : COLORS;

  // 글자 크기 스케일 적용 함수
  const fontSize = (baseSize: number): number => {
    return baseSize * settings.fontSizeScale;
  };

  const theme: Theme = {
    colors,
    isHighContrast: settings.highContrastMode,
    fontSizeScale: settings.fontSizeScale,
    fontSize,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * 테마 훅 - 컴포넌트에서 테마 정보에 접근
 *
 * @throws {Error} ThemeProvider 외부에서 사용 시 에러 발생
 *
 * @example
 * ```tsx
 * const { colors, fontSize } = useTheme();
 *
 * <View style={{ backgroundColor: colors.background.default }}>
 *   <Text style={{ fontSize: fontSize(14), color: colors.text.primary }}>
 *     안녕하세요
 *   </Text>
 * </View>
 * ```
 */
export const useTheme = (): Theme => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
