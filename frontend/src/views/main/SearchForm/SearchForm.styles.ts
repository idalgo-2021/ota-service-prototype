import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const formStyle = {
  display: 'flex',
  w: 'full',
  maxW: '1100px',
  gap: '8px',
  flexDirection: { base: 'column', lg: 'row' },
} satisfies SystemStyleObject;

export const destinationBoxStyle = {
  position: 'relative',
  zIndex: 10,
  flex: '1',
  minW: '0',
} satisfies SystemStyleObject;

export const cityOptionsStyle = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  right: 0,
  maxH: '280px',
  overflowY: 'auto',
  p: '4px',
  bg: colors.white,
  borderRadius: '12px',
  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.14)',
  listStyle: 'none',
} satisfies SystemStyleObject;

export const cityOptionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  p: '9px 12px',
  borderRadius: '8px',
  cursor: 'pointer',
  _hover: { bg: colors.hoverBg },
  _selected: { bg: colors.primarySoft },
} satisfies SystemStyleObject;

export const cityCountryStyle = {
  fontSize: '12px',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const emptyCityStyle = {
  p: '9px 12px',
  fontSize: '14px',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const dateRangePickerStyle = {
  w: { base: 'full', lg: '340px' },
  flexShrink: 0,
} satisfies SystemStyleObject;

export const guestsPickerStyle = {
  w: { base: 'full', lg: '220px' },
  flexShrink: 0,
} satisfies SystemStyleObject;

export const submitButtonStyle = {
  h: '52px',
  w: { base: 'full', lg: '172px' },
  flexShrink: 0,
} satisfies SystemStyleObject;

export const dialogFormStyle = {
  display: 'flex',
  flexDirection: 'column',
  w: 'full',
  gap: '16px',
} satisfies SystemStyleObject;

export const dialogDestinationBoxStyle = {
  flex: 'none',
  border: `1px solid ${colors.borderMedium}`,
  borderRadius: '12px',
} satisfies SystemStyleObject;

export const dialogFieldsStyle = {
  display: 'flex',
  flexDirection: { base: 'column', sm: 'row' },
  gap: '16px',
  w: 'full',
} satisfies SystemStyleObject;

export const dialogDateRangePickerStyle = {
  w: { base: 'full', sm: 'auto' },
  flex: '1 1 0',
  minW: '0',
  border: `1px solid ${colors.borderMedium}`,
  borderRadius: '12px',
} satisfies SystemStyleObject;

export const dialogGuestsPickerStyle = {
  w: { base: 'full', sm: '220px' },
  flexShrink: 0,
  border: `1px solid ${colors.borderMedium}`,
  borderRadius: '12px',
} satisfies SystemStyleObject;

export const dialogSubmitButtonStyle = {
  h: '48px',
  w: 'full',
} satisfies SystemStyleObject;

export const sidebarFormStyle = {
  ...dialogFormStyle,
  gap: '12px',
} satisfies SystemStyleObject;

export const sidebarFieldsStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  w: 'full',
} satisfies SystemStyleObject;

export const sidebarDateRangePickerStyle = {
  w: 'full',
  flex: 'none',
  border: `1px solid ${colors.borderMedium}`,
  borderRadius: '12px',
} satisfies SystemStyleObject;

export const sidebarGuestsPickerStyle = {
  w: 'full',
  flexShrink: 0,
  border: `1px solid ${colors.borderMedium}`,
  borderRadius: '12px',
} satisfies SystemStyleObject;
