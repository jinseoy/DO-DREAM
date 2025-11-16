import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './navigationTypes';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<Name extends keyof RootStackParamList>(
  ...args: undefined extends RootStackParamList[Name]
    ? [name: Name]
    : [name: Name, params: RootStackParamList[Name]]
) {
  if (navigationRef.isReady()) {
    // @ts-expect-error - react-navigation 내부 제네릭 호환
    navigationRef.navigate(...args);
  }
}
