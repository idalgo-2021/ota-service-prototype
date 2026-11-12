import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const rootStyle = {
  gap: '10px',
  minW: '0',
  w: '100%',
  maxW: '100%',
  boxSizing: 'border-box',
} satisfies SystemStyleObject;

export const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(140px, 100%), 1fr))',
  gap: '10px',
  minW: '0',
  w: '100%',
  maxW: '100%',
  boxSizing: 'border-box',
} satisfies SystemStyleObject;

export const tileStyle = {
  position: 'relative',
  aspectRatio: '4 / 3',
  overflow: 'hidden',
  bg: colors.hoverBg,
  borderRadius: '12px',
} satisfies SystemStyleObject;

export const imageStyle = {
  w: '100%',
  h: '100%',
  objectFit: 'cover',
} satisfies SystemStyleObject;

export const removeStyle = {
  position: 'absolute',
  top: '6px',
  right: '6px',
  display: 'flex',
  p: '4px',
  bg: `${colors.white}E6`,
  color: colors.danger,
  borderRadius: '8px',
  cursor: 'pointer',
  _disabled: { opacity: 0.4, cursor: 'default' },
} satisfies SystemStyleObject;

export const orderStyle = {
  position: 'absolute',
  left: '6px',
  bottom: '6px',
  px: '6px',
  bg: `${colors.white}E6`,
  borderRadius: '6px',
  fontSize: '12px',
  color: colors.text,
} satisfies SystemStyleObject;

export const addFormStyle = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
} satisfies SystemStyleObject;

export const addInputStyle = {
  flex: '1 1 260px',
} satisfies SystemStyleObject;

export const addButtonStyle = {
  h: '40px',
  px: '16px',
  borderRadius: '12px',
} satisfies SystemStyleObject;

export const emptyStyle = {
  fontSize: '14px',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const errorStyle = {
  fontSize: '14px',
  color: colors.danger,
} satisfies SystemStyleObject;
