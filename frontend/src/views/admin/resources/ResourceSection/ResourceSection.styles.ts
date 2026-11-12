import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const toolbarStyle = {
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  gap: '12px',
} satisfies SystemStyleObject;

export const createButtonStyle = {
  ml: 'auto',
  minH: '34px',
  h: '34px',
  px: '10px',
  fontSize: '12px',
} satisfies SystemStyleObject;

export const detailsContentStyle = {
  w: '960px',
  maxW: 'calc(100vw - 32px)',
  maxH: 'calc(100dvh - 32px)',
  p: '20px',
  bg: colors.white,
  borderRadius: '16px',
  boxShadow: '0 8px 40px rgba(45, 49, 55, 0.3)',
  overflowY: 'auto',
} satisfies SystemStyleObject;

export const detailsHeaderStyle = {
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  mb: '16px',
} satisfies SystemStyleObject;

export const detailsTitleStyle = {
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '24px',
  color: colors.text,
} satisfies SystemStyleObject;

export const closeButtonStyle = {
  display: 'flex',
  p: '6px',
  color: colors.textMuted,
  borderRadius: '10px',
  cursor: 'pointer',
  _hover: { bg: colors.hoverBg, color: colors.text },
} satisfies SystemStyleObject;
