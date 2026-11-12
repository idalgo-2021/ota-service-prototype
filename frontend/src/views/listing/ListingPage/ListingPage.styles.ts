import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';

export const rootStyle = {
  w: '100%',
  maxW: '1200px',
  mx: 'auto',
  p: '16px',
  gap: '24px',
} satisfies SystemStyleObject;

export const backLinkStyle = {
  alignSelf: 'flex-start',
  marginBottom: '-12px',
  color: colors.primary,
  fontSize: '15px',
  fontWeight: 500,
  textDecoration: 'none',
};

export const headerStyle = {
  gap: '8px',
} satisfies SystemStyleObject;

export const titleRowStyle = {
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '16px',
  flexDirection: { base: 'column', sm: 'row' },
} satisfies SystemStyleObject;

export const titleBlockStyle = {
  minW: '0',
  gap: '8px',
} satisfies SystemStyleObject;

export const titleStyle = {
  fontSize: { base: '26px', md: '32px' },
  fontWeight: '700',
  lineHeight: { base: '32px', md: '40px' },
  color: colors.text,
} satisfies SystemStyleObject;

export const titleSkeletonStyle = {
  h: '40px',
  w: '60%',
  borderRadius: '8px',
} satisfies SystemStyleObject;

export const addressRowStyle = {
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '6px 20px',
  fontSize: '15px',
} satisfies SystemStyleObject;

export const addressStyle = {
  alignItems: 'center',
  gap: '6px',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const pinStyle = {
  display: 'flex',
  flexShrink: 0,
  color: colors.primary,
} satisfies SystemStyleObject;

export const mapLinkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  color: colors.primary,
  fontWeight: '500',
  textDecoration: 'none',
  _hover: { textDecoration: 'underline' },
} satisfies SystemStyleObject;

export const mapBlockStyle = {
  gridArea: 'map',
  minW: '0',
} satisfies SystemStyleObject;

export const gallerySkeletonStyle = {
  h: { base: '260px', md: '360px' },
  borderRadius: '16px',
} satisfies SystemStyleObject;

export const aboutStyle = {
  gap: '6px',
  p: '16px',
  bg: colors.white,
  borderRadius: '16px',
} satisfies SystemStyleObject;

export const aboutMetaStyle = {
  color: colors.textMuted,
  fontSize: '14px',
  _firstLetter: { textTransform: 'uppercase' },
} satisfies SystemStyleObject;

export const descriptionStyle = {
  color: colors.text,
} satisfies SystemStyleObject;

// На узком экране кнопка карты идёт после бронирования; на широком сама карта стоит
// справа от витрины.
export const contentStyle = {
  display: 'grid',
  gridTemplateColumns: { base: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 340px' },
  gridTemplateAreas: {
    base: '"rooms" "summary" "map" "showcase"',
    lg: '"rooms summary" "showcase map"',
  },
  columnGap: '24px',
  rowGap: '24px',
} satisfies SystemStyleObject;

export const mainStyle = {
  gridArea: 'rooms',
  minW: '0',
  gap: '12px',
} satisfies SystemStyleObject;

export const showcaseStyle = {
  gridArea: 'showcase',
  minW: '0',
} satisfies SystemStyleObject;

export const sectionTitleStyle = {
  fontSize: '22px',
  fontWeight: '700',
  color: colors.text,
} satisfies SystemStyleObject;

export const sectionHeadingRowStyle = {
  alignItems: 'baseline',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '4px 16px',
} satisfies SystemStyleObject;

export const carouselControlsStyle = {
  gap: '8px',
  flexShrink: 0,
} satisfies SystemStyleObject;

export const carouselControlStyle = {
  display: 'grid',
  placeItems: 'center',
  w: '40px',
  h: '40px',
  borderRadius: '10px',
  bg: colors.white,
  color: colors.primary,
  cursor: 'pointer',
  fontSize: '22px',
  _hover: { bg: colors.primarySoft },
  _disabled: { color: colors.textMuted, opacity: 0.45, cursor: 'default' },
  _focusVisible: { outline: `2px solid ${colors.primary}`, outlineOffset: '2px' },
} satisfies SystemStyleObject;

export const carouselStyle = {
  display: 'flex',
  gap: '12px',
  overflowX: 'auto',
  overscrollBehaviorX: 'contain',
  scrollSnapType: 'x mandatory',
  scrollPaddingInline: '2px',
  scrollbarWidth: 'thin',
  pb: '6px',
  _focusVisible: { outline: `2px solid ${colors.primary}`, outlineOffset: '2px' },
} satisfies SystemStyleObject;

export const carouselItemStyle = {
  flex: { base: '0 0 min(82vw, 292px)', md: '0 0 292px' },
  scrollSnapAlign: 'start',
  minW: '0',
} satisfies SystemStyleObject;

export const stayRowStyle = {
  gap: '8px',
  flexDirection: { base: 'column', md: 'row' },
} satisfies SystemStyleObject;

export const datesStyle = {
  w: { base: '100%', md: '340px' },
  flexShrink: 0,
} satisfies SystemStyleObject;

export const guestsStyle = {
  w: { base: '100%', md: '240px' },
  flexShrink: 0,
} satisfies SystemStyleObject;

export const asideStyle = {
  gridArea: 'summary',
  alignSelf: 'start',
  minW: '0',
} satisfies SystemStyleObject;

export const messageStyle = {
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const startingPriceStyle = {
  color: colors.text,
  fontSize: '20px',
  fontWeight: '700',
} satisfies SystemStyleObject;
