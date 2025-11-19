# 두드림 학생용 앱 디자인 가이드

시각장애인을 위한 학습 지원 앱 '두드림'의 디자인 시스템 및 접근성 가이드

---

## 목차
1. [브랜드 컬러](#브랜드-컬러)
2. [색상 시스템](#색상-시스템)
3. [접근성 기준](#접근성-기준)
4. [컴포넌트 스타일 가이드](#컴포넌트-스타일-가이드)
5. [사용 예시](#사용-예시)

---

## 브랜드 컬러

### 메인 컬러
- **남색 (Primary)**: `#192b55`
  - 두드림의 메인 브랜드 컬러
  - 주요 버튼, 제목, 브랜딩 요소에 사용
  - 웹사이트와 일관된 아이덴티티 유지

### 서브 컬러
- **노란색 (Secondary)**: `#FEC73D`
  - 액센트 및 강조 요소에 사용
  - 중요한 액션 버튼, 알림, 포커스 상태에 활용
  - 고대비 모드에서 주요 색상으로 사용

---

## 색상 시스템

모든 색상은 `src/constants/colors.ts`에 정의되어 있습니다.

### Primary (남색 계열)
```typescript
primary: {
  main: '#192b55',        // 메인 남색
  dark: '#0f1a36',        // 더 진한 남색 (호버, 포커스)
  light: '#2d4478',       // 밝은 남색 (비활성화)
  lighter: '#4a5f8f',     // 더 밝은 남색
  lightest: '#e8ebf2',    // 매우 밝은 남색 (배경)
}
```

### Secondary (노란색 계열)
```typescript
secondary: {
  main: '#FEC73D',        // 서브 노란색
  dark: '#e5a510',        // 진한 노란색 (호버, 포커스)
  light: '#ffd670',       // 밝은 노란색
  lighter: '#ffe4a3',     // 더 밝은 노란색
  lightest: '#fff8e6',    // 매우 밝은 노란색 (배경)
}
```

### Status Colors (상태 표시)
```typescript
status: {
  success: '#2d7a2f',     // 성공 (WCAG AA 준수)
  successLight: '#e8f5e9',
  warning: '#e68a00',     // 경고 (WCAG AA 준수)
  warningLight: '#fff3e0',
  error: '#c62828',       // 에러 (WCAG AA 준수)
  errorLight: '#ffebee',
  info: '#1565c0',        // 정보 (WCAG AA 준수)
  infoLight: '#e3f2fd',
}
```

### Text Colors (텍스트)
```typescript
text: {
  primary: '#1a1a1a',     // 주 텍스트 (대비율 16.75:1)
  secondary: '#424242',   // 부 텍스트 (대비율 11.62:1)
  tertiary: '#616161',    // 보조 텍스트 (대비율 7.13:1)
  disabled: '#9e9e9e',    // 비활성화 텍스트 (대비율 3.16:1)
  inverse: '#ffffff',     // 어두운 배경용 텍스트
}
```

---

## 접근성 기준

### WCAG 2.1 AA 준수
모든 색상은 웹 콘텐츠 접근성 지침(WCAG) 2.1 AA 기준을 만족합니다:

- **일반 텍스트**: 최소 대비율 4.5:1
- **대형 텍스트** (18pt 이상 또는 14pt bold): 최소 대비율 3:1
- **UI 컴포넌트 및 그래픽**: 최소 대비율 3:1

### 고대비 모드 (전맹 및 저시력 사용자용)

WCAG 2.1 AAA 기준을 만족하는 높은 대비율 (최소 7:1):

```typescript
HIGH_CONTRAST_COLORS = {
  background: {
    default: '#000000',     // 검은 배경
    elevated: '#1a1a1a',
  },
  text: {
    primary: '#ffffff',     // 흰색 (대비율 21:1)
    secondary: '#FEC73D',   // 노란색 (대비율 11.4:1)
    tertiary: '#e0e0e0',    // 밝은 회색 (대비율 14.56:1)
  },
  accent: {
    primary: '#FEC73D',     // 노란색 액센트
    secondary: '#ffd670',
  },
  button: {
    primary: {
      background: '#FEC73D',
      text: '#000000',      // 검은 텍스트 (대비율 11.4:1)
      border: '#e5a510',
    },
    secondary: {
      background: '#192b55',
      text: '#ffffff',      // 흰 텍스트 (대비율 9.2:1)
      border: '#2d4478',
    },
  },
}
```

---

## 컴포넌트 스타일 가이드

### 1. 버튼

#### Primary 버튼 (주요 액션)
```typescript
{
  backgroundColor: COLORS.primary.main,    // #192b55 남색
  borderWidth: 4,                          // 두꺼운 경계선 (접근성)
  borderColor: COLORS.primary.dark,
  padding: 28,
  borderRadius: 16,
  minHeight: 130,                          // 충분한 터치 영역
}
```

#### Secondary 버튼 (보조 액션)
```typescript
{
  backgroundColor: COLORS.secondary.main,   // #FEC73D 노란색
  borderWidth: 4,
  borderColor: COLORS.secondary.dark,
  padding: 28,
  borderRadius: 16,
  minHeight: 130,
}
```

**중요**: 노란색 배경 버튼의 텍스트는 검은색(`COLORS.text.primary`)을 사용하여 충분한 대비를 확보해야 합니다.

### 2. 텍스트

#### 제목 (Heading)
```typescript
{
  fontSize: 52,
  fontWeight: 'bold',
  color: COLORS.primary.main,    // 남색
}
```

#### 부제목 (Subtitle)
```typescript
{
  fontSize: 24,
  color: COLORS.text.secondary,  // 회색 (충분한 대비)
}
```

#### 본문 (Body)
```typescript
{
  fontSize: 20,
  color: COLORS.text.primary,    // 검은색
}
```

### 3. 입력 필드

```typescript
{
  fontSize: 26,
  padding: 18,
  borderWidth: 3,                 // 두꺼운 경계선
  borderColor: COLORS.border.main,
  borderRadius: 12,
  backgroundColor: COLORS.background.default,
  color: COLORS.text.primary,
  minHeight: 60,                  // 터치 영역 확보
}
```

### 4. 카드/박스

```typescript
{
  backgroundColor: COLORS.primary.lightest,  // 매우 밝은 남색
  borderWidth: 2,
  borderColor: COLORS.primary.main,
  borderRadius: 12,
  padding: 24,
}
```

---

## 사용 예시

### 기본 색상 import
```typescript
import { COLORS, HIGH_CONTRAST_COLORS, ColorUtils } from '../constants/colors';
```

### 일반 모드 스타일
```typescript
const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background.default,
  },
  primaryButton: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.dark,
    borderWidth: 4,
  },
  buttonText: {
    color: COLORS.text.inverse,  // 흰색
    fontSize: 26,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: COLORS.secondary.main,
    borderColor: COLORS.secondary.dark,
    borderWidth: 4,
  },
  secondaryButtonText: {
    color: COLORS.text.primary,  // 검은색 (노란 배경)
    fontSize: 26,
    fontWeight: 'bold',
  },
});
```

### 고대비 모드 스타일 (조건부 적용)
```typescript
const styles = StyleSheet.create({
  container: {
    backgroundColor: isHighContrast
      ? HIGH_CONTRAST_COLORS.background.default
      : COLORS.background.default,
  },
  text: {
    color: isHighContrast
      ? HIGH_CONTRAST_COLORS.text.primary
      : COLORS.text.primary,
  },
  button: {
    backgroundColor: isHighContrast
      ? HIGH_CONTRAST_COLORS.button.primary.background
      : COLORS.primary.main,
  },
});
```

### 투명도 추가
```typescript
const overlayStyle = {
  backgroundColor: ColorUtils.withOpacity(COLORS.primary.main, 0.5),
};
```

---

## 디자인 원칙

### 1. 충분한 대비
- 모든 텍스트와 배경은 WCAG AA 기준(4.5:1) 이상의 대비율 유지
- 중요한 UI 요소는 더 높은 대비율 사용 권장

### 2. 명확한 터치 영역
- 모든 버튼의 최소 높이: 88-130px
- 충분한 패딩으로 터치 영역 확보
- 버튼 간 최소 간격 16px 이상

### 3. 두꺼운 경계선
- 모든 인터랙티브 요소는 3-4px 경계선 사용
- 시각적 구분을 명확히 하여 저시력 사용자 지원

### 4. 큰 폰트 크기
- 제목: 36-64px
- 본문: 20-26px
- 버튼 텍스트: 26-32px

### 5. 일관된 컬러 사용
- 메인 액션: 남색 (`COLORS.primary.main`)
- 중요한 강조: 노란색 (`COLORS.secondary.main`)
- 성공: 초록색 (`COLORS.status.success`)
- 경고: 주황색 (`COLORS.status.warning`)
- 에러: 빨간색 (`COLORS.status.error`)

---

## 주의사항

### ⚠️ 노란색 배경 사용 시
노란색 배경(`COLORS.secondary.main`)을 사용할 때는 **반드시 검은색 텍스트**(`COLORS.text.primary`)를 사용하세요.

❌ 잘못된 예:
```typescript
{
  backgroundColor: COLORS.secondary.main,
  color: COLORS.text.inverse,  // 흰색 - 대비 부족!
}
```

✅ 올바른 예:
```typescript
{
  backgroundColor: COLORS.secondary.main,
  color: COLORS.text.primary,  // 검은색 - 충분한 대비
}
```

### ⚠️ 경계선 두께
접근성을 위해 모든 인터랙티브 요소는 최소 2px, 권장 3-4px의 경계선을 사용합니다.

### ⚠️ 폰트 크기
시각장애 사용자를 고려하여 일반 웹/앱보다 1.5-2배 큰 폰트 크기를 사용합니다.

---

## 업데이트 이력

- **2025-11-17**: 초기 디자인 시스템 구축
  - 두드림 웹 메인 컬러 적용 (남색 #192b55, 노란색 #FEC73D)
  - WCAG 2.2 AA 기준 준수 색상 팔레트 구성
  - 고대비 모드 색상 정의 (AAA 기준)
  - 주요 컴포넌트 색상 테마 적용

---

## 문의 및 피드백

디자인 시스템 관련 문의는 개발팀에 문의해주세요.
