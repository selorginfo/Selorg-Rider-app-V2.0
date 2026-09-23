import {useMemo} from 'react';
import {useWindowDimensions, type ViewStyle} from 'react-native';

/** Design reference width (typical phone). Used only for mild scaling, not device locks. */
const BASE_WIDTH = 390;

export type LayoutInfo = {
  width: number;
  height: number;
  shortest: number;
  longest: number;
  isLandscape: boolean;
  /** Narrow phone (e.g. SE-class). */
  isCompact: boolean;
  /** Tablet-class shortest side. */
  isTablet: boolean;
  /** Mild horizontal scale factor, clamped. */
  scale: number;
  /** Max readable content width for forms / stacked chrome on large screens. */
  contentMaxWidth: number;
  /** Horizontal page gutter. */
  gutter: number;
};

export function getLayout(width: number, height: number): LayoutInfo {
  const shortest = Math.min(width, height);
  const longest = Math.max(width, height);
  const isLandscape = width > height;
  const isCompact = shortest < 360;
  const isTablet = shortest >= 600;
  const rawScale = width / BASE_WIDTH;
  const scale = Math.min(1.2, Math.max(0.85, rawScale));
  const contentMaxWidth = isTablet ? 560 : isLandscape && width >= 700 ? 520 : width;
  const gutter = isTablet ? 28 : isCompact ? 14 : 16;
  return {
    width,
    height,
    shortest,
    longest,
    isLandscape,
    isCompact,
    isTablet,
    scale,
    contentMaxWidth,
    gutter,
  };
}

/** Hook: live window layout for responsive screens. */
export function useLayout(): LayoutInfo {
  const {width, height} = useWindowDimensions();
  return useMemo(() => getLayout(width, height), [width, height]);
}

/** Scale a design px value mildly by layout.scale. */
export function ms(size: number, scale: number): number {
  return Math.round(size * scale);
}

/** Media / capture / map band height from window fraction with clamps. */
export function mediaBandHeight(
  windowHeight: number,
  fraction: number,
  min: number,
  max: number,
): number {
  return Math.round(Math.min(max, Math.max(min, windowHeight * fraction)));
}

/** Centered column that respects tablet max content width. */
export function contentColumnStyle(layout: LayoutInfo): ViewStyle {
  return {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  };
}

/** Minimum accessible touch target (pts). */
export const MIN_TOUCH = 44;
