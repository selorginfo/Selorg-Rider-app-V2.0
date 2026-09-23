import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types/navigation';

export type AppNav = NativeStackNavigationProp<RootStackParamList>;

/** Typed navigation for stack screens. */
export function useAppNavigation(): AppNav {
  return useNavigation<AppNav>();
}
