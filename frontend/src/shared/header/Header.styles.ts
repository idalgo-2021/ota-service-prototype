import type { SystemStyleObject } from '@chakra-ui/react';
import { colors } from '../colors';

/** Высота шапки вместе с нижней границей; страницы на весь экран вычитают её из высоты окна. */
export const HEADER_HEIGHT = '48px';

export const getHeaderStyle = (isMain: boolean) =>
  ({
    alignItems: 'center',
    h: HEADER_HEIGHT,
    flexShrink: 0,
    px: { base: '6px', sm: '8px', md: '16px' },
    bg: isMain ? colors.mint : colors.white,
    borderBottom: isMain ? undefined : `1px solid ${colors.borderLight}`,
  }) satisfies SystemStyleObject;

export const logoLinkStyle = { display: 'flex' };
export const logoStyle = {
  h: { base: '26px', sm: '30px', md: '40px' },
} satisfies SystemStyleObject;
