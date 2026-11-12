'use client';

import { IconButton } from '@chakra-ui/react';
import { toggleHotelComparison } from '@/lib/hotelCompare';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { useCatalogLanguage } from '@/lib/useCatalogLanguage';
import { colors } from '@/shared/colors';
import { CompareIcon } from '@/shared/icons';

export const CompareButton = ({ id, title }: { id: string; title: string }) => {
  const dispatch = useAppDispatch();
  const selected = useAppSelector((state) => state.hotelCompare.ids.includes(id));
  const { lang } = useCatalogLanguage();
  const label =
    lang === 'en'
      ? `${selected ? 'Remove from comparison' : 'Add to comparison'}: ${title}`
      : `${selected ? 'Убрать из сравнения' : 'Добавить к сравнению'}: ${title}`;

  return (
    <IconButton
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={selected}
      variant="ghost"
      flexShrink={0}
      width="40px"
      height="40px"
      color={selected ? colors.primary : colors.text}
      bg={selected ? colors.primarySoft : colors.white}
      _hover={{ bg: colors.hoverBg }}
      onClick={(event) => {
        event.stopPropagation();
        dispatch(toggleHotelComparison(id));
      }}
    >
      <CompareIcon />
    </IconButton>
  );
};
