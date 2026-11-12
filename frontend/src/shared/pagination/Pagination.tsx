'use client';

import { Flex, Text } from '@chakra-ui/react';
import type { CatalogLanguage } from '@/lib/api';
import { Button } from '../button';
import { buttonStyle, rangeStyle, rootStyle } from './Pagination.styles';
import { useController } from './useController';

type PaginationProps = {
  lang?: CatalogLanguage;
  total: number;
  limit: number;
  offset: number;
  onOffsetChange: (offset: number) => void;
};

/** Строка под списком: какие записи из скольких показаны и кнопки «назад» / «вперёд». */
export const Pagination = ({
  total,
  limit,
  offset,
  onOffsetChange,
  lang = 'ru',
}: PaginationProps) => {
  const { from, to, hasPrev, hasNext, handlePrev, handleNext } = useController(
    total,
    limit,
    offset,
    onOffsetChange
  );

  return (
    <Flex {...rootStyle}>
      <Text {...rangeStyle}>
        {from}–{to} {lang === 'en' ? 'of' : 'из'} {total}
      </Text>
      <Button appearance="soft" disabled={!hasPrev} {...buttonStyle} onClick={handlePrev}>
        {lang === 'en' ? 'Back' : 'Назад'}
      </Button>
      <Button appearance="soft" disabled={!hasNext} {...buttonStyle} onClick={handleNext}>
        {lang === 'en' ? 'Next' : 'Вперед'}
      </Button>
    </Flex>
  );
};
