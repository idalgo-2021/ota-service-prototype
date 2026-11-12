import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../colors';

const SEGMENT_HEIGHT = '48px';
const SKELETON_PADDING = '8px';

export const rootStyle = {
  p: '0',
  display: 'flex',
  // Сегменты не сжимаются уже подписи: если не влезают, ряд прокручивается по горизонтали.
  overflowX: 'auto',
  scrollbarWidth: 'none',
  marginTop: 5,
} satisfies SystemStyleObject;

export const getOptionStyle = (active: boolean) =>
  ({
    flex: '1 0 auto',
    h: SEGMENT_HEIGHT,
    px: '16px',
    whiteSpace: 'nowrap',
    fontSize: '16px',
    cursor: 'pointer',
    color: colors.text,
    bg: active ? colors.primarySoft : 'transparent',
    border: active ? `1px solid ${colors.primary}` : '1px solid transparent',
    borderRadius: '16px',
    transition: 'background-color 0.16s',
  }) satisfies SystemStyleObject;

export const skeletonRootStyle = {
  display: 'flex',
  gap: '12px',
  marginTop: 5,
  h: SEGMENT_HEIGHT,
  p: `${SKELETON_PADDING} 12px`,
} satisfies SystemStyleObject;

export const skeletonSegmentStyle = {
  flex: '1',
  h: `calc(${SEGMENT_HEIGHT} - 2 * ${SKELETON_PADDING})`,
  borderRadius: '12px',
} satisfies SystemStyleObject;
