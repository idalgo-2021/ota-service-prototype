'use client';

import { Flex, Heading, NativeSelect, Skeleton, Stack, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { useGetProductReviewsQuery } from '@/lib/api';
import { formatCount } from '@/lib/format';
import { Card } from '@/shared/card';
import { Pagination } from '@/shared/pagination';

const LIMIT = 6;
type SortOption = 'created_at_desc' | 'created_at_asc' | 'rating_desc' | 'rating_asc';

const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export const ProductReviews = ({ productId }: { productId: string }) => {
  const [offset, setOffset] = useState(0);
  const [sortOption, setSortOption] = useState<SortOption>('created_at_desc');
  const sort = sortOption.startsWith('created_at')
    ? { created_at: sortOption.endsWith('asc') ? ('asc' as const) : ('desc' as const) }
    : { rating: sortOption.endsWith('asc') ? ('asc' as const) : ('desc' as const) };
  const reviews = useGetProductReviewsQuery({ id: productId, limit: LIMIT, offset, sort });
  const total = reviews.data?.meta.total ?? 0;

  return (
    <Stack id="reviews" as="section" gap={4} scrollMarginTop="96px">
      <Heading as="h2" fontSize={{ base: '24px', md: '30px' }}>
        Отзывы{total ? ` · ${formatCount(total, ['отзыв', 'отзыва', 'отзывов'])}` : ''}
      </Heading>
      <Flex justify="flex-end">
        <NativeSelect.Root maxW="260px">
          <NativeSelect.Field
            aria-label="Сортировать отзывы"
            value={sortOption}
            onChange={(event) => {
              setSortOption(event.target.value as SortOption);
              setOffset(0);
            }}
          >
            <option value="created_at_desc">Сначала новые</option>
            <option value="created_at_asc">Сначала старые</option>
            <option value="rating_desc">Сначала с высокой оценкой</option>
            <option value="rating_asc">Сначала с низкой оценкой</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Flex>
      {reviews.isFetching ? (
        <Stack gap={3}>
          <Skeleton h="140px" borderRadius="16px" />
          <Skeleton h="140px" borderRadius="16px" />
        </Stack>
      ) : reviews.isError ? (
        <Text color="red.600">Не удалось загрузить отзывы.</Text>
      ) : !reviews.data?.items.length ? (
        <Text color="gray.600">У этого предложения пока нет отзывов.</Text>
      ) : (
        <Stack gap={3}>
          {reviews.data.items.map((review) => (
            <Card key={review.id} p={5}>
              <Stack gap={2}>
                <Flex justify="space-between" gap={4} wrap="wrap">
                  <Text fontWeight="700">{review.author_display_name}</Text>
                  <Text color="gray.500" fontSize="sm">
                    {dateFormat.format(new Date(review.original_at ?? review.created_at))}
                  </Text>
                </Flex>
                <Text color="orange.500" aria-label={`Оценка ${review.rating} из 5`}>
                  {'★'.repeat(review.rating)}
                  {'☆'.repeat(5 - review.rating)}
                </Text>
                <Text whiteSpace="pre-wrap">{review.review_text}</Text>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
      {total > LIMIT && (
        <Pagination total={total} limit={LIMIT} offset={offset} onOffsetChange={setOffset} />
      )}
    </Stack>
  );
};
