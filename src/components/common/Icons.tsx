import React from 'react';
import Svg, {Circle, Path, Rect} from 'react-native-svg';
import {colors} from '../../theme';

interface IconProps {
  size?: number;
  color?: string;
}

/* ---- bottom tab icons (verbatim paths from the HTML) ---- */

export const HomeIcon = ({size = 22, color = colors.textFaint}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 11 12 4l8 7"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6 10v9h12v-9"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const BoxIcon = ({size = 22, color = colors.textFaint}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 8 12 4l9 4-9 4-9-4Z"
      stroke={color}
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
    <Path
      d="M3 8v8l9 4 9-4V8"
      stroke={color}
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
  </Svg>
);

export const BarChartIcon = ({
  size = 22,
  color = colors.textFaint,
}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 19V10M12 19V5M19 19v-6"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
    />
  </Svg>
);

export const ClockIcon = ({size = 22, color = colors.textFaint}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={1.8} />
    <Path
      d="M12 7.5V12l3 2"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

export const UserIcon = ({size = 22, color = colors.textFaint}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8} r={3.4} stroke={color} strokeWidth={1.8} />
    <Path
      d="M5.5 19a6.5 6.5 0 0 1 13 0"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

/* ---- misc ---- */

export const CheckIcon = ({
  size = 14,
  color = colors.white,
  strokeWidth = 2.2,
}: IconProps & {strokeWidth?: number}) => (
  <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <Path
      d="M3 7.5 6 10.5 11 4"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const BigCheckIcon = ({size = 52, color = colors.white}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 52 52" fill="none">
    <Path
      d="M14 27 22 35 38 17"
      stroke={color}
      strokeWidth={4.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const CrossIcon = ({size = 34, color = colors.danger}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 34 34" fill="none">
    <Path
      d="M11 11 23 23M23 11 11 23"
      stroke={color}
      strokeWidth={3.4}
      strokeLinecap="round"
    />
  </Svg>
);

export const ClockMiniIcon = ({
  size = 12,
  color = colors.primary,
}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
    <Circle cx={6} cy={6} r={5} stroke={color} strokeWidth={1.4} />
    <Path
      d="M6 3.2V6l1.8 1.1"
      stroke={color}
      strokeWidth={1.4}
      strokeLinecap="round"
    />
  </Svg>
);

export const CalendarIcon = ({size = 20, color = colors.slate}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Rect
      x={3}
      y={4}
      width={14}
      height={13}
      rx={2}
      stroke={color}
      strokeWidth={1.5}
    />
    <Path
      d="M3 8h14M7 2.5v3M13 2.5v3"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

export const BoxSmallIcon = ({size = 17, color = colors.info}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M3 6.5 10 3l7 3.5v7L10 17l-7-3.5v-7Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  </Svg>
);

export const ClockSmallIcon = ({
  size = 17,
  color = colors.purpleIcon,
}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Circle cx={10} cy={10} r={7.5} stroke={color} strokeWidth={1.5} />
    <Path
      d="M10 5.5V10l3 1.8"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

export const CalendarSmallIcon = ({
  size = 17,
  color = colors.amber,
}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Rect
      x={3}
      y={4}
      width={14}
      height={13}
      rx={2}
      stroke={color}
      strokeWidth={1.5}
    />
    <Path
      d="M3 8h14M7 2.5v3M13 2.5v3"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

export const SendIcon = ({size = 18, color = colors.white}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 12 20 4l-4 16-4-7-8-1Z" fill={color} />
  </Svg>
);

export const PhoneIcon = ({size = 16, color = colors.primary}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7.2 3.8h2.6l1.2 3.1-1.6 1.1a12.4 12.4 0 0 0 5.6 5.6l1.1-1.6 3.1 1.2v2.6c0 .7-.6 1.4-1.3 1.5-7.2.9-13.3-5.2-12.4-12.4.1-.7.8-1.3 1.7-1.5Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ChatIcon = ({size = 16, color = colors.primary}: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H10l-4 3.2V16H7.5A2.5 2.5 0 0 1 5 13.5v-7Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </Svg>
);

export const CloseIcon = ({
  size = 20,
  color = colors.ink,
  strokeWidth = 2.2,
}: IconProps & {strokeWidth?: number}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 6l12 12M18 6 6 18"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </Svg>
);

export const FileDocIcon = ({
  size = 22,
  color = colors.ink,
  strokeWidth = 1.8,
}: IconProps & {strokeWidth?: number}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <Path
      d="M14 3.5V8h4.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </Svg>
);

export const UploadArrowIcon = ({
  size = 14,
  color = colors.white,
  strokeWidth = 2.2,
}: IconProps & {strokeWidth?: number}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 16V6M7.5 10.5 12 6l4.5 4.5M5 18h14"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ChevronRightIcon = ({
  size = 18,
  color = colors.textMuted,
  strokeWidth = 2,
}: IconProps & {strokeWidth?: number}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 6l6 6-6 6"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const LogoutIcon = ({
  size = 20,
  color = colors.danger,
  strokeWidth = 2,
}: IconProps & {strokeWidth?: number}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
