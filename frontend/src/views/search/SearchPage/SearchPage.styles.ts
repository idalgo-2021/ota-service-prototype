import type { SystemStyleObject } from '@chakra-ui/react';
import { HEADER_HEIGHT } from '@/shared/header';

// С xl карта стоит справа на всю высоту под шапкой, а прокручиваются только фильтры и выдача.
// Уже xl карте рядом со списком места нет, поэтому страница прокручивается целиком и карта идёт ниже.

// body — колонка высотой не меньше окна. С нулевой базой (именно 0px: 0% при высоте body
// «по содержимому» считается от содержимого) и overflow: hidden страница сама не растягивает
// body, а flex отдаёт ей ровно остаток окна под шапкой — без расчёта через vh.
export const rootStyle = {
  flex: { base: '1', xl: '1 1 0px' },
  flexDirection: { base: 'column', xl: 'row' },
  overflow: { xl: 'hidden' },
} satisfies SystemStyleObject;

export const contentStyle = {
  flex: '1',
  minW: '0',
  alignItems: 'flex-start',
  flexDirection: { base: 'column', md: 'row' },
  gap: '16px',
  p: { base: '0 16px 16px', xl: '16px' },
  overflowY: { xl: 'auto' },
} satisfies SystemStyleObject;

export const sidebarStyle = {
  display: { base: 'none', xl: 'flex' },
  w: { base: '100%', md: '250px' },
  flexShrink: 0,
  gap: '8px',
} satisfies SystemStyleObject;

export const resultsStyle = {
  flex: '1',
  minW: '0',
  w: '100%',
} satisfies SystemStyleObject;

export const mapStyle = {
  flexShrink: 0,
  w: { base: 'auto', xl: '40%' },
  h: { base: '650px', md: `calc(100dvh - ${HEADER_HEIGHT} - 32px)`, xl: 'auto' },
  minH: { base: '480px', md: '560px', xl: '0' },
  mx: { base: '16px', xl: '0' },
  mb: { base: '16px', xl: '0' },
  borderRadius: { base: '16px', xl: '0' },
} satisfies SystemStyleObject;
