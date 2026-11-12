import { Stack, Text } from '@chakra-ui/react';
import { formatDateTime, shortId } from '../../format';
import { secondaryTextStyle } from '../../table.styles';
import { RelatedRecordButton, RelatedRecordThumbnail } from '../RelatedRecordButton';
import type { ResourceConfig } from '../types';
import { listingsConfig } from './catalog';
import { MediaThumbnail } from './MediaThumbnail';
import { str } from './cells';

const SummaryDetails = ({ record }: { record: Record<string, unknown> }) => (
  <Stack gap="12px" p="4px">
    <Text fontWeight="600">
      {str(record, 'listing_title_ru') ?? str(record, 'listing_title') ?? 'Объект'}
    </Text>
    <Text whiteSpace="pre-wrap" overflowWrap="anywhere">
      {str(record, 'summary') ?? '—'}
    </Text>
    <Text {...secondaryTextStyle}>
      {`Модель: ${str(record, 'model_id') ?? '—'} · версия промпта: ${str(record, 'prompt_version') ?? '—'}`}
    </Text>
  </Stack>
);

export const listingReviewSummariesConfig: ResourceConfig = {
  key: 'listing_review_summaries',
  label: 'Саммари объектов',
  title: 'Саммари отзывов по объектам',
  path: '/admin/listing-review-summaries',
  getId: (record) => String(record.listing_id),
  thumbnailColumn: 'photo',
  filters: [{ name: 'listing_search', label: 'Объект', type: 'text' }],
  columns: [
    {
      key: 'photo',
      title: 'Фото объекта',
      width: '11%',
      render: (record) => {
        const id = str(record, 'listing_id') ?? '';
        const title = str(record, 'listing_title_ru') ?? str(record, 'listing_title') ?? id;
        return (
          <RelatedRecordThumbnail config={listingsConfig} id={id} label={title}>
            <MediaThumbnail src={str(record, 'main_picture')} alt="Фото объекта" />
          </RelatedRecordThumbnail>
        );
      },
    },
    {
      key: 'listing',
      title: 'Объект',
      width: '18%',
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
            maxWidth="220px"
          />
        );
      },
    },
    {
      key: 'summary',
      title: 'Саммари',
      width: '42%',
      render: (record) => (
        <Text maxW="560px" lineClamp={4} whiteSpace="normal" title={str(record, 'summary')}>
          {str(record, 'summary') ?? '—'}
        </Text>
      ),
    },
    {
      key: 'source_review_count',
      title: 'Отзывов',
      width: '8%',
      render: (record) => <Text>{str(record, 'source_review_count') ?? '—'}</Text>,
    },
    {
      key: 'model_id',
      title: 'Модель',
      width: '12%',
      render: (record) => (
        <Text maxW="180px" lineClamp={2} whiteSpace="normal" title={str(record, 'model_id')}>
          {str(record, 'model_id') ?? '—'}
        </Text>
      ),
    },
    {
      key: 'generated_at',
      title: 'Создано',
      width: '12%',
      render: (record, lookups) => {
        const generated = str(record, 'generated_at');
        const synced = str(record, 'synced_at');
        return (
          <Stack gap="2px">
            <Text>{generated ? formatDateTime(generated, lookups.language) : '—'}</Text>
            {synced && (
              <Text {...secondaryTextStyle}>
                Импорт: {formatDateTime(synced, lookups.language)}
              </Text>
            )}
          </Stack>
        );
      },
    },
  ],
  details: {
    label: 'Полный текст',
    render: (record) => <SummaryDetails record={record} />,
  },
  recordName: (record) => str(record, 'listing_title_ru') ?? str(record, 'listing_title') ?? '',
  emptyText: 'Саммари по этим условиям нет.',
};
