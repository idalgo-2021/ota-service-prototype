import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';
import { HEADER_HEIGHT } from '@/shared/header';

export const rootStyle = {
  gap: '12px',
  // На широком экране ссылка «На карте» прокручивает к этому блоку.
  scrollMarginTop: `calc(${HEADER_HEIGHT} + 16px)`,
} satisfies SystemStyleObject;

export const mobileButtonStyle = {
  display: { base: 'inline-flex', lg: 'none' },
  w: '100%',
  minH: '48px',
  gap: '8px',
} satisfies SystemStyleObject;

export const desktopMapStyle = {
  display: { base: 'none', lg: 'block' },
} satisfies SystemStyleObject;

export const headStyle = {
  gap: '4px',
} satisfies SystemStyleObject;

export const titleStyle = {
  fontSize: '20px',
  fontWeight: '700',
  color: colors.text,
} satisfies SystemStyleObject;

export const addressStyle = {
  color: colors.textMuted,
  fontSize: '13px',
} satisfies SystemStyleObject;

// Карта занимает весь блок и берёт у него скругление: размер задаём здесь.
export const mapStyle = {
  h: '220px',
  borderRadius: '16px',
  overflow: 'hidden',
} satisfies SystemStyleObject;

export const popupStyle = {
  display: 'none',
  '&[open]': { display: 'flex' },
  flexDirection: 'column',
  position: 'fixed',
  inset: '0',
  w: '100vw',
  h: '100dvh',
  maxW: 'none',
  maxH: 'none',
  m: '0',
  p: '0',
  border: '0',
  bg: colors.white,
  overflow: 'hidden',
} satisfies SystemStyleObject;

export const popupHeaderStyle = {
  alignItems: 'center',
  justifyContent: 'space-between',
  minH: '64px',
  px: '16px',
  flexShrink: 0,
  borderBottom: `1px solid ${colors.hoverBg}`,
} satisfies SystemStyleObject;

export const closeButtonStyle = {
  display: 'grid',
  placeItems: 'center',
  w: '44px',
  h: '44px',
  borderRadius: '10px',
  color: colors.text,
  cursor: 'pointer',
  _hover: { bg: colors.hoverBg },
  _focusVisible: { outline: `2px solid ${colors.primary}`, outlineOffset: '2px' },
} satisfies SystemStyleObject;

export const popupMapStyle = {
  flex: '1',
  minH: '0',
  minW: '0',
} satisfies SystemStyleObject;
