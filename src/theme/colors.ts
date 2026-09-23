/**
 * Colour tokens extracted verbatim from `Selorg Rider.dc.html`.
 * Keep these in sync with the design; never hardcode hex in components.
 */
export const colors = {
  // brand green
  primary: '#237227',
  primaryDark: '#1B5A1F',
  primaryTint: 'rgba(35,114,39,0.10)',
  primaryTint06: 'rgba(35,114,39,0.06)',
  primaryTint08: 'rgba(35,114,39,0.08)',
  primaryTint12: 'rgba(35,114,39,0.12)',
  primaryBorder: 'rgba(35,114,39,0.18)',
  primaryDisabled: '#C7D6C8',
  onPrimarySoft: '#CFE7D0',
  greenText: '#3f5b41',

  // bulk / purple
  bulk: '#4F39F6',
  bulkDark: '#3730D6',
  bulkTint: '#EFF1FF',
  bulkBorder: '#DCE0FF',
  bulkText: '#4F39F6',
  bulkOnDark: '#D6D9FF',
  incentiveA: '#4F39F6',
  incentiveB: '#9810FA',
  incentiveOnDark: '#E0E7FF',
  incentiveOnDark2: '#C6D2FF',

  // ink / text
  ink: '#101828',
  inkStrong: '#071123',
  textPrimary: '#101828',
  textSecondary: '#364153',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',
  textFaint2: '#B4BAC2',
  slate: '#4A5565',

  // surfaces — pure white app canvas
  screen: '#FFFFFF',
  card: '#FFFFFF',
  fieldBg: '#FFFFFF',
  fieldBg2: '#F7F8FA',
  chipBg: '#F3F4F6',
  neutralTile: '#E5E7EB',

  // hairlines / borders
  border: '#EDEFF2',
  borderStrong: '#E6E9EF',
  divider: '#F2F4F6',
  hairline: '#EEF0F2',
  inputBorder: '#E6E9EF',

  // status
  danger: '#E7000B',
  dangerBright: '#FB2C36',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FFE2E2',
  dangerTextDeep: '#7A1E1E',
  dangerDisabled: '#E7A3A8',
  dangerDisabled2: '#F3C6C8',
  warn: '#B45309',
  warnBg: '#FFF7ED',
  warnBorder: '#FFEAD5',
  warnText: '#9a5b16',
  info: '#2196F3',
  infoBg: '#EFF6FF',
  purpleChipBg: '#FAF5FF',
  purpleIcon: '#9810FA',
  amber: '#FF9800',

  white: '#FFFFFF',
  black: '#0b0d10',
  scrim: 'rgba(7,17,35,0.5)',
  sheetShadow: 'rgba(0,0,0,0.22)',
} as const;

export type ColorToken = keyof typeof colors;
