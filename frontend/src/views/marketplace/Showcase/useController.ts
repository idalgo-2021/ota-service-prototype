import { useState } from 'react';
import { useSearchProductsQuery, type ProductSearchParams, type ProductType } from '@/lib/api';
import { useCatalogLanguage } from '@/lib/useCatalogLanguage';
import type { SegmentedControlOption } from '@/shared/segmented-control';

export type TypeFilter = 'all' | ProductType;
export type SortDirection = 'asc' | 'desc';
export type ProductSort = NonNullable<ProductSearchParams['sort']>;

export const TYPE_OPTIONS: SegmentedControlOption<TypeFilter>[] = [
  { value: 'all', label: 'Все', title: 'Все предложения' },
  { value: 'tour', label: 'Экскурсии', title: 'Только экскурсии' },
  { value: 'service', label: 'Услуги', title: 'Только услуги' },
  { value: 'goods', label: 'Товары', title: 'Только товары' },
];

const PAGE_SIZE = 12;

export const useController = (
  locationId?: number,
  query?: string,
  controlledType?: TypeFilter,
  onTypeChange?: (type: TypeFilter) => void
) => {
  const [internalType, setInternalType] = useState<TypeFilter>('all');
  const type = controlledType ?? internalType;
  const [offset, setOffset] = useState(0);
  const [sort, setSort] = useState<ProductSort>();

  const { lang, preferences } = useCatalogLanguage();
  const preferredSort: ProductSort = {
    ...(preferences?.product_price_sort ? { price: preferences.product_price_sort } : {}),
    ...(preferences?.product_rating_sort ? { rating: preferences.product_rating_sort } : {}),
  };
  const activeSort = sort ?? preferredSort;
  const products = useSearchProductsQuery({
    lang,
    query: query || undefined,
    location_id: locationId,
    product_type: type === 'all' ? undefined : type,
    sort: activeSort,
    limit: PAGE_SIZE,
    offset,
  });

  const handleTypeChange = (next: TypeFilter) => {
    if (controlledType === undefined) {
      setInternalType(next);
    }
    onTypeChange?.(next);
    setOffset(0);
  };

  const total = products.data?.meta.total ?? 0;

  return {
    // В городе вообще нет предложений — витрину не показываем совсем.
    hidden:
      locationId !== undefined && !query && type === 'all' && products.isSuccess && total === 0,
    type,
    sort: activeSort,
    products: products.data?.items ?? [],
    loading: products.isLoading,
    refreshing: products.isFetching && !products.isLoading,
    error: products.isError,
    total,
    limit: PAGE_SIZE,
    offset,
    handleTypeChange,
    handleSortChange: (next: ProductSort) => {
      setSort(next);
      setOffset(0);
    },
    handleOffsetChange: setOffset,
  };
};
