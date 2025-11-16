import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useDoublePress } from '../hooks/useAccessibilityTriggers';

// @ts-ignore
import KeyEvent from 'react-native-keyevent';

type Props = {
  enabled: boolean;
  onVolumeUpDouble?: () => void;
  onVolumeDownDouble?: () => void;
};

const KEYCODE_VOLUME_UP = 24;
const KEYCODE_VOLUME_DOWN = 25;

export default function AndroidVolumeDoublePress({
  enabled,
  onVolumeUpDouble,
  onVolumeDownDouble,
}: Props) {
  const up = useDoublePress(350);
  const down = useDoublePress(350);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (keyEvent: { keyCode: number }) => {
      if (keyEvent.keyCode === KEYCODE_VOLUME_UP) up.mark();
      if (keyEvent.keyCode === KEYCODE_VOLUME_DOWN) down.mark();
    };

    KeyEvent.onKeyDownListener(handleKeyDown);

    return () => {
      try {
        KeyEvent.removeKeyDownListener();
      } catch {}
    };
  }, [enabled]);

  useEffect(() => {
    if (up.fired && onVolumeUpDouble) {
      onVolumeUpDouble();
      up.consume();
    }
  }, [up.fired]);

  useEffect(() => {
    if (down.fired && onVolumeDownDouble) {
      onVolumeDownDouble();
      down.consume();
    }
  }, [down.fired]);

  // 시각 요소 없음 (오버레이 X). 트리거 전용.
  return <View accessible={false} />;
}
