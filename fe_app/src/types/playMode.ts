// 학습 모드 타입
export type PlayMode = 'single' | 'continuous' | 'repeat';

// 학습 모드 설정
export interface PlayModeSettings {
  mode: PlayMode;
  repeatCount?: number; // 반복 모드일 때 반복 횟수 (기본 2회)
}

// 학습 모드 설명
export const PlayModeDescriptions: Record<PlayMode, string> = {
  single: '한 섹션씩 - 한 섹션 읽고 정지합니다',
  continuous: '연속 재생 - 끝까지 자동으로 재생됩니다',
  repeat: '반복 재생 - 각 섹션을 반복한 후 다음으로 넘어갑니다',
};

// 학습 모드 아이콘
export const PlayModeIcons: Record<PlayMode, string> = {
  single: '⏯',
  continuous: '🔄',
  repeat: '🔁',
};

// 학습 모드 레이블
export const PlayModeLabels: Record<PlayMode, string> = {
  single: '한 섹션씩',
  continuous: '연속 재생',
  repeat: '반복 재생',
};