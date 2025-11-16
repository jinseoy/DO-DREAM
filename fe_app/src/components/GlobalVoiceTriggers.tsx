import React, { useContext } from 'react';
import { Platform, AccessibilityInfo } from 'react-native';
import * as Haptics from 'expo-haptics';
import MagicTapCatcher from './MagicTapCatcher';
import AndroidVolumeDoublePress from './AndroidVolumeDoublePress';
import { TriggerContext } from '../triggers/TriggerContext';

type Props = {
  onVoiceCommand: () => void;
  /**
   * TalkBack(스크린리더) 켜져 있어도 Android 볼륨 더블프레스를 허용할지 여부
   * - 기본값: true (요청사항 반영)
   * - 사용자 옵션으로, 끄고 싶으면 false로 변경
   */
  allowWithScreenReaderOn?: boolean;
};

export default function GlobalVoiceTriggers({
  onVoiceCommand
}: Props) {
  const { mode, getPlayPause } = useContext(TriggerContext);

  const fireVoice = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    AccessibilityInfo.announceForAccessibility('질문하기로 이동합니다');
    onVoiceCommand();
  };

  const firePlayPause = () => {
    const fn = getPlayPause();
    if (fn) fn();
    // 재생/정지 토글은 내부 핸들러에서 announce/haptic 처리
  };

  // iOS: Magic Tap 라우팅
  const onMagicTap = () => {
    if (mode === 'playpause') firePlayPause();
    else fireVoice();
  };

  // Android: TalkBack ON이어도 트리거 허용(옵션)
  //  - 업 더블: 질문(전역)
  //  - 다운 더블: 재생/정지 (playpause 모드에서만)
  const androidOverlay =
    Platform.OS === 'android' ? (
      <AndroidVolumeDoublePress
        // TalkBack ON/OFF와 상관없이 항상 작동
        enabled={true}
        onVolumeUpDouble={fireVoice}
        onVolumeDownDouble={mode === 'playpause' ? firePlayPause : undefined}
      />
    ) : null;

  return (
    <MagicTapCatcher
      onMagicTap={onMagicTap} // iOS VoiceOver Magic Tap
      style={{ position: 'absolute', inset: 0, backgroundColor: 'transparent' }}
      pointerEvents="none" // 화면 조작 방해 없음 (접근성 액션만 수신)
    >
      {androidOverlay}
    </MagicTapCatcher>
  );
}
