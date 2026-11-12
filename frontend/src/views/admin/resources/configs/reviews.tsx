import { Text } from '@chakra-ui/react';
import type { AdminRecord } from '@/lib/adminApi';
import { StatusBadge, type StatusTone } from '@/shared/status-badge';
import { formatDateTime, shortId } from '../../format';
import { secondaryTextStyle } from '../../table.styles';
import type { ResourceAction, ResourceConfig } from '../types';
import { str, TwoLines } from './cells';
import { reviewTextStyle } from './reviews.styles';
import { ListingReviewDetails } from '../ListingReviewDetails';
import { ProductReviewDetails } from '../ProductReviewDetails';
import { RelatedRecordButton, RelatedRecordThumbnail } from '../RelatedRecordButton';
import { listingsConfig, productsConfig } from './catalog';
import { clientsConfig } from './people';
import { MediaThumbnail } from './MediaThumbnail';
import { translateAdmin, useAdminLanguage } from '../../adminLocale';

const STATUSES: Record<string, { label: string; tone: StatusTone }> = {
  draft: { label: 'Черновик', tone: 'canceled' },
  pending_moderation: { label: 'Ждет модерации', tone: 'waiting' },
  approved: { label: 'Опубликован', tone: 'done' },
  rejected: { label: 'Отклонен', tone: 'canceled' },
};

const FILTERS: ResourceConfig['filters'] = [
  {
    name: 'status',
    label: 'Статус',
    options: Object.entries(STATUSES).map(([value, { label }]) => ({ value, label })),
  },
  {
    name: 'is_imported',
    label: 'Источник',
    options: [
      { value: 'false', label: 'С сайта' },
      { value: 'true', label: 'Импортированные' },
    ],
  },
];

const RATING_FIELDS = [
  { value: 'overall_rating', label: 'Общая оценка' },
  { value: 'cleanliness_rating', label: 'Чистота' },
  { value: 'staff_rating', label: 'Персонал' },
  { value: 'comfort_rating', label: 'Комфорт' },
  { value: 'location_rating', label: 'Расположение' },
  { value: 'sleep_rating', label: 'Сон' },
  { value: 'bathroom_rating', label: 'Ванная' },
  { value: 'wifi_rating', label: 'Wi-Fi' },
];

const PRODUCT_TYPES = [
  { value: 'tour', label: 'Экскурсия' },
  { value: 'service', label: 'Услуга' },
  { value: 'goods', label: 'Товар' },
];

// Drafts and reviews awaiting moderation are private by default, but they were not
// explicitly hidden by an employee. Treat is_hidden as a moderation state only for
// an approved review.
const isHiddenPublishedReview = (record: AdminRecord) =>
  record.status === 'approved' && record.is_hidden === true;

/** Одобрить и отклонить можно ждущий модерации отзыв, скрыть — опубликованный. */
const moderationActions = (path: string): ResourceAction[] => [
  {
    label: 'Одобрить',
    path: (record) => `${path}/${record.id}/approve`,
    visible: (record) => record.status === 'pending_moderation',
  },
  {
    label: 'Отклонить',
    danger: true,
    path: (record) => `${path}/${record.id}/reject`,
    visible: (record) => record.status === 'pending_moderation',
    reason: { title: 'Отклонить отзыв?', confirmLabel: 'Отклонить' },
  },
  {
    label: 'Скрыть',
    danger: true,
    path: (record) => `${path}/${record.id}/hide`,
    visible: (record) => record.status === 'approved' && !record.is_hidden,
    reason: { title: 'Скрыть отзыв с сайта?', confirmLabel: 'Скрыть' },
  },
  {
    label: 'Вернуть',
    path: (record) => `${path}/${record.id}/unhide`,
    visible: isHiddenPublishedReview,
  },
];

const StatusCell = ({ record }: { record: AdminRecord }) => {
  const lang = useAdminLanguage();
  const status = STATUSES[String(record.status)] ?? {
    label: String(record.status),
    tone: 'canceled',
  };
  const reason = str(record, 'hidden_reason') ?? str(record, 'rejection_reason');
  const hidden = isHiddenPublishedReview(record);
  return (
    <>
      <StatusBadge tone={hidden ? 'canceled' : status.tone}>
        {translateAdmin(hidden ? 'Скрыт' : status.label, lang)}
      </StatusBadge>
      {reason && (
        <Text {...secondaryTextStyle} maxW="160px" truncate title={reason}>
          {reason}
        </Text>
      )}
    </>
  );
};

const ReviewText = ({ lines }: { lines: (string | undefined)[] }) => {
  const text = lines.filter(Boolean);
  return text.length ? (
    <>
      {text.map((line) => (
        <Text key={line} {...reviewTextStyle} title={line}>
          {line}
        </Text>
      ))}
    </>
  ) : (
    <>—</>
  );
};

const dateColumn: ResourceConfig['columns'][number] = {
  key: 'created_at',
  title: 'Дата',
  render: (record, lookups) => {
    const value =
      str(record, 'original_at') ?? str(record, 'submitted_at') ?? str(record, 'created_at');
    return (
      <TwoLines
        main={value && formatDateTime(value, lookups.language)}
        sub={record.is_imported ? str(record, 'external_source') : 'с сайта'}
      />
    );
  },
};

export const listingReviewsConfig: ResourceConfig = {
  key: 'listing_reviews',
  label: 'Отзывы об объектах',
  title: 'Отзывы об объектах размещения',
  path: '/admin/listing-reviews',
  getId: (record) => String(record.id),
  filters: [
    ...FILTERS,
    { name: 'listing_search', label: 'Объект RU / EN', type: 'text' },
    { name: 'listing_id', label: 'ID объекта', type: 'text' },
    { name: 'rating_field', label: 'Критерий оценки', options: RATING_FIELDS },
    { name: 'min_rating', label: 'Оценка от', type: 'number' },
    { name: 'max_rating', label: 'Оценка до', type: 'number' },
  ],
  fitTableToWidth: true,
  actionsColumnWidth: '11%',
  columns: [
    { ...dateColumn, width: '9%' },
    {
      key: 'listing_photo',
      title: 'Фото объекта',
      width: '10%',
      render: (record) => {
        const id = str(record, 'listing_id') ?? '';
        const title =
          str(record, 'listing_title_ru') ?? str(record, 'listing_title') ?? shortId(id);
        return (
          <RelatedRecordThumbnail config={listingsConfig} id={id} label={title}>
            <MediaThumbnail src={str(record, 'listing_thumbnail_url')} alt="Фото объекта" />
          </RelatedRecordThumbnail>
        );
      },
    },
    {
      key: 'listing',
      title: 'Объект',
      width: '11%',
      render: (record) => {
        const id = str(record, 'listing_id') ?? '';
        const ru = str(record, 'listing_title_ru');
        const en = str(record, 'listing_title');
        return (
          <RelatedRecordButton
            config={listingsConfig}
            id={id}
            main={ru ?? en ?? shortId(id)}
            sub={ru ? en : undefined}
            maxWidth="190px"
          />
        );
      },
    },
    {
      key: 'author',
      title: 'Автор',
      width: '9%',
      render: (record) => {
        const clientId = str(record, 'reviewer_user_id');
        const name = str(record, 'client_name') ?? str(record, 'reviewer_display_name') ?? '—';
        return clientId ? (
          <RelatedRecordButton
            config={clientsConfig}
            id={clientId}
            main={name}
            sub={shortId(clientId)}
            maxWidth="160px"
          />
        ) : (
          <>
            <Text
              maxW="160px"
              lineClamp={2}
              whiteSpace="normal"
              overflowWrap="anywhere"
              title={name}
            >
              {name}
            </Text>
            <Text fontSize="12px" color="gray.500">
              {str(record, 'external_reviewer_id')?.slice(-8)}
            </Text>
          </>
        );
      },
    },
    {
      key: 'country',
      title: 'Страна, возраст, пол',
      width: '9%',
      render: (record) => {
        const country = str(record, 'reviewer_country');
        const other = [str(record, 'reviewer_age'), str(record, 'reviewer_gender')]
          .filter(Boolean)
          .join(' · ');
        return (
          <>
            <Text
              maxW="145px"
              lineClamp={2}
              whiteSpace="normal"
              overflowWrap="anywhere"
              title={country}
            >
              {country ?? '—'}
            </Text>
            {other && (
              <Text maxW="145px" fontSize="12px" truncate title={other}>
                {other}
              </Text>
            )}
          </>
        );
      },
    },
    {
      key: 'rating',
      title: 'Оценка',
      width: '6%',
      render: (record) => {
        const additionalCount = RATING_FIELDS.slice(1).filter(({ value }) =>
          str(record, value)
        ).length;
        return (
          <TwoLines
            main={str(record, 'overall_rating') && `${str(record, 'overall_rating')} / 10`}
            sub={additionalCount ? `Доп.: ${additionalCount}` : undefined}
          />
        );
      },
    },
    {
      key: 'positive_review',
      title: 'Плюсы',
      width: '8%',
      render: (record) => <ReviewText lines={[str(record, 'positive_review')]} />,
    },
    {
      key: 'negative_review',
      title: 'Минусы',
      width: '8%',
      render: (record) => <ReviewText lines={[str(record, 'negative_review')]} />,
    },
    {
      key: 'trip',
      title: 'Поездка',
      width: '9%',
      render: (record) => (
        <TwoLines
          main={[str(record, 'trip_purpose'), str(record, 'party_type')]
            .filter(Boolean)
            .join(' · ')}
          sub={[
            str(record, 'accommodation_type'),
            str(record, 'nights') && `${str(record, 'nights')} ноч.`,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
      ),
    },
    {
      key: 'status',
      title: 'Статус',
      width: '10%',
      render: (record) => <StatusCell record={record} />,
    },
  ],
  actions: moderationActions('/admin/listing-reviews'),
  details: {
    label: 'Просмотр',
    render: (record) => <ListingReviewDetails id={String(record.id)} />,
  },
  recordName: (record) => `отзыв ${shortId(String(record.id))}`,
  emptyText: 'Отзывов по этим условиям нет.',
};

export const productReviewsConfig: ResourceConfig = {
  key: 'product_reviews',
  label: 'Отзывы о продуктах',
  title: 'Отзывы об экскурсиях, услугах и товарах',
  path: '/admin/product-reviews',
  getId: (record) => String(record.id),
  filters: [...FILTERS, { name: 'product_type', label: 'Тип продукта', options: PRODUCT_TYPES }],
  fitTableToWidth: true,
  actionsColumnWidth: '11%',
  columns: [
    { ...dateColumn, width: '10%' },
    {
      key: 'product',
      title: 'Продукт',
      width: '17%',
      render: (record) => {
        const id = str(record, 'product_id') ?? '';
        const ru = str(record, 'product_name_ru');
        const en = str(record, 'product_name');
        return (
          <RelatedRecordButton
            config={productsConfig}
            id={id}
            main={ru ?? en ?? shortId(id)}
            sub={ru ? en : undefined}
          />
        );
      },
    },
    {
      key: 'product_type',
      title: 'Тип продукта',
      width: '10%',
      render: (record, lookups) => (
        <TwoLines
          main={translateAdmin(
            PRODUCT_TYPES.find((type) => type.value === record.product_type)?.label ?? '',
            lookups.language
          )}
        />
      ),
    },
    {
      key: 'author',
      title: 'Клиент',
      width: '15%',
      render: (record) => {
        const clientId = str(record, 'author_id');
        const name = str(record, 'client_name') ?? str(record, 'author_display_name') ?? '—';
        return clientId ? (
          <RelatedRecordButton
            config={clientsConfig}
            id={clientId}
            main={name}
            sub={shortId(clientId)}
            maxWidth="160px"
          />
        ) : (
          <>
            <Text
              maxW="160px"
              lineClamp={2}
              whiteSpace="normal"
              overflowWrap="anywhere"
              title={name}
            >
              {name}
            </Text>
            <Text fontSize="12px" color="gray.500">
              {str(record, 'external_author_id')?.slice(-8)}
            </Text>
          </>
        );
      },
    },
    {
      key: 'rating',
      title: 'Оценка',
      width: '8%',
      render: (record) => (
        <TwoLines main={str(record, 'rating') && `${str(record, 'rating')} из 5`} />
      ),
    },
    {
      key: 'text',
      title: 'Текст',
      width: '19%',
      render: (record) => <ReviewText lines={[str(record, 'review_text')]} />,
    },
    {
      key: 'status',
      title: 'Статус',
      width: '10%',
      render: (record) => <StatusCell record={record} />,
    },
  ],
  actions: moderationActions('/admin/product-reviews'),
  details: {
    label: 'Просмотр',
    render: (record) => <ProductReviewDetails id={String(record.id)} />,
  },
  recordName: (record) => `отзыв ${shortId(String(record.id))}`,
  emptyText: 'Отзывов по этим условиям нет.',
};
