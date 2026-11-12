import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '@/shared/colors';
import { mapColors } from '../constants';

export const rootStyle = {
  position: 'absolute',
  zIndex: 2,
  bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
  left: 'calc(16px + env(safe-area-inset-left, 0px))',
  w: '264px',
  maxW: 'calc(100% - 88px - env(safe-area-inset-left, 0px))',
  maxH: 'calc(100% - 150px - env(safe-area-inset-bottom, 0px))',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  scrollbarWidth: 'thin',
  scrollbarColor: `${colors.borderMedium} transparent`,
  p: '12px 12px 10px',
  bg: `${colors.white}F2`,
  borderRadius: '12px',
  boxShadow: `0 2px 14px ${mapColors.shadow}`,
  '&::-webkit-scrollbar': { w: '6px' },
  '&::-webkit-scrollbar-thumb': {
    bg: colors.borderMedium,
    borderRadius: 'full',
  },
} satisfies SystemStyleObject;

export const districtRowStyle = {
  alignItems: 'center',
  gap: '4px',
  '& + &': { mt: '8px' },
} satisfies SystemStyleObject;

export const districtButtonStyle = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: '9px',
  minH: '44px',
  textAlign: 'left',
  fontSize: '12px',
  lineHeight: '1.3',
  cursor: 'pointer',
  borderRadius: '8px',
  _focusVisible: {
    outline: `3px solid ${colors.primaryFocusRing}`,
    outlineOffset: '1px',
  },
} satisfies SystemStyleObject;

export const getDistrictSwatchStyle = (selected: boolean) =>
  ({
    w: '22px',
    h: '22px',
    flexShrink: 0,
    border: `2px dotted ${mapColors.district}`,
    borderRadius: '50%',
    bg: selected ? mapColors.districtSoft : 'transparent',
    opacity: selected ? 1 : 0.45,
  }) satisfies SystemStyleObject;

export const pointListStyle = {
  display: 'flex',
  flexDirection: 'column',
  flexWrap: 'wrap',
  gap: '9px',
  // Отступ нужен только под районами; если районов нет, список стоит вплотную к краю карточки.
  _notFirst: { mt: '10px' },
} satisfies SystemStyleObject;

export const pointButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  minH: '44px',
  fontSize: '12px',
  textAlign: 'left',
  cursor: 'pointer',
  flex: '1',
  p: '6px 8px',
  borderRadius: '8px',
  transition: 'background-color 0.16s',
  _hover: { bg: colors.hoverBg },
  _active: { bg: colors.primarySoft },
  _focusVisible: {
    outline: `3px solid ${colors.primaryFocusRing}`,
    outlineOffset: '1px',
  },
} satisfies SystemStyleObject;

export const getPointDotStyle = (color: string) =>
  ({
    display: 'grid',
    placeItems: 'center',
    w: '19px',
    h: '19px',
    flexShrink: 0,
    borderRadius: '50%',
    bg: color,
    color: colors.white,
    fontSize: '13px',
  }) satisfies SystemStyleObject;

export const removeButtonStyle = {
  display: 'grid',
  placeItems: 'center',
  w: '44px',
  h: '44px',
  flexShrink: 0,
  borderRadius: '8px',
  color: colors.textMuted,
  cursor: 'pointer',
  transition: 'background-color 0.16s, color 0.16s',
  _hover: { bg: colors.hoverBg, color: colors.text },
  _active: { bg: colors.primarySoft },
  _focusVisible: {
    outline: `3px solid ${colors.primaryFocusRing}`,
    outlineOffset: '-3px',
  },
} satisfies SystemStyleObject;

export const areaStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  _notFirst: { mt: '12px', pt: '10px', borderTop: `1px solid ${colors.borderLight}` },
} satisfies SystemStyleObject;

export const areaLabelStyle = {
  fontSize: '12px',
  lineHeight: '1.3',
} satisfies SystemStyleObject;

export const areaCaptionStyle = {
  mb: '-4px',
  pl: '24px',
  fontSize: '12px',
  color: colors.textMuted,
} satisfies SystemStyleObject;

export const areaRadiusStyle = {
  alignItems: 'center',
  gap: '10px',
  minH: '44px',
  pl: '24px',
} satisfies SystemStyleObject;

export const areaRadiusValueStyle = {
  minW: '44px',
  fontSize: '12px',
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
} satisfies SystemStyleObject;

export const areaErrorStyle = {
  fontSize: '12px',
  lineHeight: '1.3',
  color: colors.danger,
} satisfies SystemStyleObject;

export const clearButtonStyle = {
  display: 'grid',
  placeItems: 'center',
  w: '100%',
  minH: '44px',
  mt: '12px',
  px: '12px',
  borderRadius: '10px',
  bg: colors.hoverBg,
  color: colors.danger,
  fontSize: '12px',
  fontWeight: 'semibold',
  cursor: 'pointer',
  transition: 'background-color 0.16s, color 0.16s',
  _hover: { bg: `${colors.danger}12` },
  _active: { bg: `${colors.danger}1F` },
  _focusVisible: {
    outline: `3px solid ${colors.primaryFocusRing}`,
    outlineOffset: '2px',
  },
} satisfies SystemStyleObject;
