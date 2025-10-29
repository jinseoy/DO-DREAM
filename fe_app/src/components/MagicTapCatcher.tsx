import React from "react";
import { View, ViewProps } from "react-native";

type Props = ViewProps & {
  onMagicTap?: () => void;
};

export default function MagicTapCatcher({ onMagicTap, ...rest }: Props) {
  return (
    <View
      accessible
      accessibilityActions={[{ name: "magicTap" }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "magicTap" && onMagicTap) onMagicTap();
      }}
      {...rest}
    />
  );
}
