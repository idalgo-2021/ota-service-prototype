import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

const HEIGHT = { base: '260px', md: '360px' };

export const getRootStyle = (withThumbs: boolean) =>
  ({
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: { base: '1fr', md: withThumbs ? '3fr 2fr' : '1fr' },
    gap: '8px',
    h: HEIGHT,
    minH: '0',
    maxH: HEIGHT,
    overflow: 'hidden',
    borderRadius: '16px',
  }) satisfies SystemStyleObject;

export const mainStyle = {
  position: 'relative',
  minW: '0',
  minH: '0',
  h: '100%',
  borderRadius: '16px',
  overflow: 'hidden',
  bg: colors.hoverBg,
  touchAction: 'pan-y',
  '&:hover [data-gallery-arrow], &:focus-within [data-gallery-arrow]': { opacity: 1 },
} satisfies SystemStyleObject;

export const imageStyle = {
  display: 'block',
  w: '100%',
  h: '100%',
  minW: '0',
  minH: '0',
  objectFit: 'cover',
} satisfies SystemStyleObject;

export const thumbImageStyle = {
  position: 'absolute',
  inset: '0',
  display: 'block',
  w: '100%',
  h: '100%',
  minW: '0',
  minH: '0',
  objectFit: 'cover',
} satisfies SystemStyleObject;

// Сетка 2×2; если миниатюр меньше четырёх, они растягиваются на свободные ячейки.
export const thumbsStyle = {
  display: { base: 'none', md: 'grid' },
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  gap: '8px',
  h: '100%',
  minH: '0',
  maxH: '100%',
  overflow: 'hidden',
} satisfies SystemStyleObject;

export const getThumbStyle = (position: number, total: number) =>
  ({
    position: 'relative',
    gridColumn: total < 3 || (total === 3 && position === 0) ? 'span 2' : undefined,
    gridRow: total === 1 ? 'span 2' : undefined,
    display: 'block',
    w: '100%',
    h: '100%',
    minW: '0',
    minH: '0',
    p: '0',
    border: 'none',
    borderRadius: '16px',
    overflow: 'hidden',
    cursor: 'pointer',
    outline: 'none',
    bg: colors.hoverBg,
    _focusVisible: { boxShadow: `0 0 0 3px ${colors.primaryFocusRing}` },
  }) satisfies SystemStyleObject;

export const moreStyle = {
  position: 'absolute',
  inset: '0',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'flex-end',
  p: '12px',
  bg: 'linear-gradient(transparent 50%, rgba(0, 0, 0, 0.45))',
  color: colors.white,
  fontSize: '14px',
  fontWeight: '600',
} satisfies SystemStyleObject;

export const controlsStyle = {
  position: 'absolute',
  inset: '0',
  alignItems: 'center',
  justifyContent: 'space-between',
  px: '12px',
  pointerEvents: 'none',
} satisfies SystemStyleObject;

export const arrowStyle = {
  display: { base: 'none', md: 'flex' },
  alignItems: 'center',
  justifyContent: 'center',
  w: '40px',
  h: '40px',
  bg: 'rgba(255, 255, 255, 0.85)',
  color: colors.text,
  borderRadius: '50%',
  opacity: 0,
  transition: 'opacity 0.15s',
  pointerEvents: 'auto',
  cursor: 'pointer',
  outline: 'none',
  _hover: { bg: colors.white },
  _focusVisible: { boxShadow: `0 0 0 3px ${colors.primaryFocusRing}` },
} satisfies SystemStyleObject;

export const counterStyle = {
  position: 'absolute',
  right: '12px',
  bottom: '12px',
  px: '10px',
  py: '4px',
  bg: 'rgba(0, 0, 0, 0.55)',
  color: colors.white,
  borderRadius: '12px',
  fontSize: '13px',
  fontWeight: '500',
  fontVariantNumeric: 'tabular-nums',
  pointerEvents: 'none',
} satisfies SystemStyleObject;
