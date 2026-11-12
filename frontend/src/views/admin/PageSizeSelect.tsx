'use client';

import { FilterSelect } from './FilterSelect';
import { PAGE_SIZES, type PageSize } from './usePageSize';
import { Box } from '@chakra-ui/react';

export const PageSizeSelect = ({
  value,
  onChange,
}: {
  value: PageSize;
  onChange: (value: string) => void;
}) => (
  <Box w="180px" maxW="100%">
    <FilterSelect
      label="Записей на странице"
      value={String(value)}
      options={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
      onValueChange={onChange}
    />
  </Box>
);
