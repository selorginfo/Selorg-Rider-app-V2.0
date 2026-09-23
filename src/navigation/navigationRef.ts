import {
  CommonActions,
  StackActions,
  createNavigationContainerRef,
} from '@react-navigation/native';
import type {RootStackParamList} from '../types/navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<Name extends keyof RootStackParamList>(
  name: Name,
  params?: RootStackParamList[Name],
) {
  if (navigationRef.isReady()) {
    // @ts-expect-error params typing is loose here on purpose
    navigationRef.navigate(name, params);
  }
}

export function replace<Name extends keyof RootStackParamList>(
  name: Name,
  params?: RootStackParamList[Name],
) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.replace(name as string, params));
  }
}

export function resetTo<Name extends keyof RootStackParamList>(
  name: Name,
  params?: RootStackParamList[Name],
) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: name as string,
            ...(params !== undefined ? {params} : {}),
          },
        ],
      }),
    );
  }
}
