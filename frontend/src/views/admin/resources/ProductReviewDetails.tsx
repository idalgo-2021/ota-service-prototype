'use client';

import { Stack, Text } from '@chakra-ui/react';
import { useGetAdminRecordQuery } from '@/lib/adminApi';
import { formatDateTime } from '../format';
import { str } from './configs/cells';
import { useAdminLanguage } from '../adminLocale';
import {
  getReviewDisplayStatus,
  ReviewDetailGrid,
  ReviewDetailSection,
  ReviewDetailsLayout,
  ReviewDetailValue,
  ReviewMetadata,
} from './ReviewDetailsLayout';

const PRODUCT_TYPES: Record<string, { ru: string; en: string }> = {
  tour: { ru: 'Экскурсия', en: 'Tour' },
  service: { ru: 'Услуга', en: 'Service' },
  goods: { ru: 'Товар', en: 'Goods' },
};

export const ProductReviewDetails = ({ id }: { id: string }) => {
  const lang = useAdminLanguage();
  const en = lang === 'en';
  const { data, isLoading, isError } = useGetAdminRecordQuery(
    `/admin/product-reviews/${encodeURIComponent(id)}`
  );

  if (isLoading) {
    return <Text>{en ? 'Loading review…' : 'Загружаем отзыв…'}</Text>;
  }
  if (isError || !data) {
    return (
      <Text role="alert">{en ? 'Could not load the review.' : 'Не удалось загрузить отзыв.'}</Text>
    );
  }

  const dateTime = (field: string) => {
    const value = str(data, field);
    return value ? formatDateTime(value, lang) : undefined;
  };
  const productId = str(data, 'product_id');
  const productName =
    (en ? str(data, 'product_name') : str(data, 'product_name_ru')) ??
    str(data, 'product_name') ??
    (en ? 'Product' : 'Продукт');
  const reviewer =
    str(data, 'client_name') ?? str(data, 'author_display_name') ?? (en ? 'Guest' : 'Гость');
  const source = data.is_imported
    ? (str(data, 'external_source') ?? (en ? 'External system' : 'Внешняя система'))
    : en
      ? 'Website client'
      : 'Клиент сайта';
  const status = getReviewDisplayStatus(str(data, 'status'), Boolean(data.is_hidden), lang);

  return (
    <ReviewDetailsLayout
      entityLabel={en ? 'Product' : 'Продукт'}
      entityName={productName}
      entityHref={productId ? `/products/${encodeURIComponent(productId)}` : undefined}
      author={reviewer}
      source={source}
      createdAt={dateTime('created_at')}
      status={status}
      rating={str(data, 'rating')}
      ratingMax={5}
    >
      <ReviewDetailSection title={en ? 'Review' : 'Отзыв'}>
        <Text
          fontSize="15px"
          lineHeight="1.6"
          whiteSpace="pre-wrap"
          overflowWrap="anywhere"
          color={str(data, 'review_text') ? 'gray.800' : 'gray.600'}
        >
          {str(data, 'review_text') ||
            (en ? 'The guest left no comment.' : 'Гость не оставил комментарий.')}
        </Text>
      </ReviewDetailSection>

      <ReviewDetailSection title={en ? 'Review details' : 'Детали отзыва'}>
        <ReviewDetailGrid>
          <ReviewDetailValue
            label={en ? 'Product type' : 'Тип продукта'}
            value={
              PRODUCT_TYPES[str(data, 'product_type') ?? '']?.[lang] ?? str(data, 'product_type')
            }
          />
          <ReviewDetailValue label={en ? 'Rating' : 'Оценка'} value={str(data, 'rating')} />
        </ReviewDetailGrid>
      </ReviewDetailSection>

      <ReviewMetadata label={en ? 'Reviewer and moderation data' : 'Данные автора и модерации'}>
        <Stack gap="16px">
          <ReviewDetailGrid>
            <ReviewDetailValue label={en ? 'Review ID' : 'ID отзыва'} value={id} />
            <ReviewDetailValue label={en ? 'Product ID' : 'ID продукта'} value={productId} />
            <ReviewDetailValue
              label={en ? 'Client ID' : 'ID клиента'}
              value={str(data, 'author_id')}
            />
            <ReviewDetailValue
              label={en ? 'External author ID' : 'Внешний ID автора'}
              value={str(data, 'external_author_id')}
            />
            <ReviewDetailValue
              label={en ? 'External review ID' : 'Внешний ID отзыва'}
              value={str(data, 'external_review_id')}
            />
            <ReviewDetailValue
              label={en ? 'Original review date' : 'Дата отзыва'}
              value={dateTime('original_at')}
            />
            <ReviewDetailValue
              label={en ? 'Submitted' : 'Отправлен'}
              value={dateTime('submitted_at')}
            />
            <ReviewDetailValue
              label={en ? 'Moderated' : 'Модерирован'}
              value={dateTime('reviewed_at')}
            />
            <ReviewDetailValue
              label={en ? 'Moderator ID' : 'ID модератора'}
              value={str(data, 'reviewed_by')}
            />
            <ReviewDetailValue
              label={en ? 'Rejection reason' : 'Причина отклонения'}
              value={str(data, 'rejection_reason')}
            />
            <ReviewDetailValue label={en ? 'Hidden at' : 'Скрыт в'} value={dateTime('hidden_at')} />
            <ReviewDetailValue
              label={en ? 'Hidden by' : 'ID скрывшего'}
              value={str(data, 'hidden_by')}
            />
            <ReviewDetailValue
              label={en ? 'Hidden reason' : 'Причина скрытия'}
              value={str(data, 'hidden_reason')}
            />
            <ReviewDetailValue label={en ? 'Updated' : 'Обновлен'} value={dateTime('updated_at')} />
          </ReviewDetailGrid>
        </Stack>
      </ReviewMetadata>
    </ReviewDetailsLayout>
  );
};
