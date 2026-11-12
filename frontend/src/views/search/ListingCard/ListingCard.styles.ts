import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const cardStyle = {
  p: '8px',
  cursor: 'pointer',
  outline: '2px solid transparent',
  transition: 'outline-color 0.15s',
  scrollMarginBlock: '16px',
  _hover: { outlineColor: colors.borderMedium },
  _focusVisible: { outlineColor: colors.primaryFocusRing },
  '&[aria-pressed="true"]': { outlineColor: colors.primary },
} satisfies SystemStyleObject;

export const rowStyle = {
  gap: { base: '10px', md: '16px' },
  flexDirection: { base: 'column', md: 'row' },
} satisfies SystemStyleObject;

export const imageStyle = {
  w: { base: '100%', md: '290px' },
  h: { base: '150px', md: '252px' },
  flexShrink: 0,
  borderRadius: '12px',
  objectFit: 'cover',
  bg: colors.hoverBg,
} satisfies SystemStyleObject;

export const infoStyle = {
  flex: '1',
  gap: 2,
  py: { base: '2px', md: '8px' },
  minW: 0,
} satisfies SystemStyleObject;

// Строка «слева — справа»: название и тип жилья, оценка и адрес.
export const lineStyle = {
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '4px 16px',
  flexWrap: 'wrap',
} satisfies SystemStyleObject;

export const typeStyle = {
  flexShrink: 0,
  fontSize: 'sm',
  color: colors.textMuted,
} satisfies SystemStyleObject;

// Оценка и «Гости хвалят» — один блок, поэтому между ними меньше места, чем в карточке.
export const reviewsStyle = {
  gap: '2px',
} satisfies SystemStyleObject;

export const titleStyle = {
  fontSize: 'lg',
  fontWeight: 'semibold',
  color: colors.text,
} satisfies SystemStyleObject;

// По базовой линии текста, а не иконки: иначе адрес справа от оценки съезжает вниз.
export const ratingRowStyle = {
  alignItems: 'baseline',
  gap: '4px',
  fontSize: '15px',
  color: colors.text,
} satisfies SystemStyleObject;

export const starStyle = {
  display: 'flex',
  alignSelf: 'center',
  color: '#FFB800',
} satisfies SystemStyleObject;

export const ratingStyle = {
  fontWeight: 'semibold',
} satisfies SystemStyleObject;

export const praiseStyle = {
  alignItems: 'center',
  gap: '8px',
  fontSize: 'sm',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const praiseIconStyle = {
  display: 'flex',
  flexShrink: 0,
  color: '#8C9EF5',
} satisfies SystemStyleObject;

export const addressStyle = {
  minW: '0',
  fontSize: 'sm',
  color: colors.textMuted,
  textAlign: 'right',
} satisfies SystemStyleObject;

export const descriptionStyle = {
  // Отступ от отзывов больше обычного: оценка с «Гости хвалят» — отдельный блок.
  mt: '8px',
  color: colors.text,
  lineClamp: 2,
} satisfies SystemStyleObject;

export const footerStyle = {
  mt: 'auto',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: '12px',
} satisfies SystemStyleObject;

export const priceTextStackStyle = {
  gap: '0',
} satisfies SystemStyleObject;

export const priceStyle = {
  fontSize: 'lg',
  fontWeight: 'semibold',
  color: colors.text,
} satisfies SystemStyleObject;

export const priceTotalStyle = {
  display: 'block',
  fontSize: 'sm',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const linkButtonStyle = {
  h: '44px',
  ml: 'auto',
  borderRadius: '12px',
} satisfies SystemStyleObject;
