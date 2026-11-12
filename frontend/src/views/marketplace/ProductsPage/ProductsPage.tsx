'use client';

import { Box, Flex, Heading, NativeSelect, Stack, Text } from '@chakra-ui/react';
import { type SubmitEvent, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useGetDictionariesQuery, type ProductType } from '@/lib/api';
import { useCatalogLanguage } from '@/lib/useCatalogLanguage';
import { Button } from '@/shared/button';
import { BackButton } from '@/shared/back-button';
import { colors } from '@/shared/colors';
import { Input } from '@/shared/input';
import { CartPanel } from '../CartPanel';
import { Showcase } from '../Showcase';
import type { TypeFilter } from '../Showcase/useController';
import { useCart } from '../useCart';
import { locationSelectStyle, queryInputStyle } from './ProductsPage.styles';

type ProductsPageProps = {
  participants?: number;
  initialQuery?: string;
  initialLocationId?: number;
  initialProductType?: ProductType;
};

export const ProductsPage = ({
  participants = 1,
  initialQuery = '',
  initialLocationId,
  initialProductType,
}: ProductsPageProps) => {
  const { lang } = useCatalogLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dictionaries = useGetDictionariesQuery(lang);
  const [draft, setDraft] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [locationId, setLocationId] = useState<number | undefined>(initialLocationId);
  const [productType, setProductType] = useState<TypeFilter>(initialProductType ?? 'all');
  const cart = useCart();

  const updateAddress = (updates: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });
    const suffix = next.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  };

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    const nextQuery = draft.trim();
    setQuery(nextQuery);
    updateAddress({ query: nextQuery || undefined });
  };

  const handleLocationChange = (value: string) => {
    const nextLocationId = value ? Number(value) : undefined;
    setLocationId(nextLocationId);
    updateAddress({ location_id: nextLocationId });
  };

  const handleTypeChange = (nextType: TypeFilter) => {
    setProductType(nextType);
    updateAddress({ product_type: nextType === 'all' ? undefined : nextType });
  };

  return (
    <Stack w="100%" maxW="1200px" mx="auto" px={{ base: 4, md: 8 }} py={8} gap={6}>
      <BackButton />
      <Stack gap={2}>
        <Heading as="h1" fontSize={{ base: '30px', md: '42px' }}>
          Впечатления и товары
        </Heading>
        <Text color="gray.600">
          Сначала найдите приключение — город и жилье можно выбрать уже после.
        </Text>
      </Stack>
      <Flex as="form" onSubmit={submit} gap={3} wrap="wrap">
        <Input
          {...queryInputStyle}
          flex="1 1 320px"
          value={draft}
          placeholder="Например, горный поход или экскурсия"
          aria-label="Что хотите найти"
          onChange={(event) => setDraft(event.target.value)}
        />
        <NativeSelect.Root flex="0 1 260px">
          <NativeSelect.Field
            aria-label="Город — необязательно"
            value={locationId ?? ''}
            {...locationSelectStyle}
            onChange={(event) => handleLocationChange(event.target.value)}
          >
            <option value="">Любая локация</option>
            {(dictionaries.data?.locations ?? []).map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator color={colors.primary} />
        </NativeSelect.Root>
        <Button type="submit">Найти</Button>
      </Flex>
      <Box
        display="grid"
        gridTemplateColumns={{ base: '1fr', lg: 'minmax(0, 1fr) 340px' }}
        gap={6}
        alignItems="start"
      >
        <Showcase
          query={query}
          locationId={locationId}
          cart={cart}
          defaultQuantity={participants}
          type={productType}
          onTypeChange={handleTypeChange}
        />
        <Box position={{ lg: 'sticky' }} top={{ lg: '88px' }}>
          <CartPanel cart={cart} mode="summary" />
        </Box>
      </Box>
    </Stack>
  );
};
