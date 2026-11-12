import { Stack, Text } from '@chakra-ui/react';
import { formatMoney } from '@/lib/format';
import { ListingDetails } from '../ListingDetails';
import { RelatedRecordButton, RelatedRecordThumbnail } from '../RelatedRecordButton';
import type { ResourceConfig } from '../types';
import { activeColumn, LATIN_HINT, str, TwoLines } from './cells';
import { MediaThumbnail } from './MediaThumbnail';
import { translateAdmin } from '../../adminLocale';

const descriptionCell = (ru?: string, en?: string) => (
  <Stack maxW="320px" gap="2px">
    <Text lineClamp={2} whiteSpace="normal" title={ru}>
      RU: {ru || '—'}
    </Text>
    <Text lineClamp={2} whiteSpace="normal" title={en}>
      EN: {en || '—'}
    </Text>
  </Stack>
);

const PRODUCT_TYPES = [
  { value: 'tour', label: 'Экскурсия' },
  { value: 'service', label: 'Услуга' },
  { value: 'goods', label: 'Товар' },
];

const ACTIVE_FILTER = {
  name: 'is_active',
  label: 'Статус',
  options: [
    { value: 'true', label: 'Активные' },
    { value: 'false', label: 'Выключенные' },
  ],
};

export const listingsConfig: ResourceConfig = {
  key: 'listings',
  label: 'Объекты',
  title: 'Объекты размещения',
  path: '/admin/listings',
  getId: (record) => String(record.id),
  filters: [
    { name: 'search', label: 'Поиск по имени RU / EN', type: 'text' },
    {
      name: 'sort_by',
      label: 'Сортировать',
      options: [
        { value: 'created_at', label: 'По дате' },
        { value: 'title_ru', label: 'По имени RU' },
        { value: 'title', label: 'По имени EN' },
      ],
    },
    {
      name: 'sort_order',
      label: 'Порядок',
      options: [
        { value: 'asc', label: 'По возрастанию' },
        { value: 'desc', label: 'По убыванию' },
      ],
    },
    ACTIVE_FILTER,
    { name: 'location_ids', label: 'Город', options: (lookups) => lookups.locations },
    { name: 'listing_type_ids', label: 'Тип', options: (lookups) => lookups.listingTypes },
  ],
  fitTableToWidth: true,
  actionsColumnWidth: '15%',
  columns: [
    {
      key: 'photo',
      title: 'Фото',
      width: '11%',
      render: (record) => {
        const id = String(record.id);
        const title = str(record, 'title_ru') ?? str(record, 'title') ?? id;
        return (
          <RelatedRecordThumbnail config={listingsConfig} id={id} label={title}>
            <MediaThumbnail src={str(record, 'main_picture')} alt="Фото объекта" />
          </RelatedRecordThumbnail>
        );
      },
    },
    {
      key: 'title',
      title: 'Объект',
      width: '17%',
      render: (record) => {
        const id = String(record.id);
        return (
          <RelatedRecordButton
            config={listingsConfig}
            id={id}
            main={str(record, 'title_ru') ? `RU: ${str(record, 'title_ru')}` : 'RU: —'}
            sub={`EN: ${str(record, 'title') ?? '—'}`}
            maxWidth="220px"
          />
        );
      },
    },
    {
      key: 'description',
      title: 'Описание',
      width: '14%',
      render: (record) =>
        descriptionCell(str(record, 'description_ru'), str(record, 'description')),
    },
    {
      key: 'place',
      title: 'Тип, город',
      width: '11%',
      render: (record, lookups) => (
        <TwoLines
          main={lookups.label('listingTypes', record.listing_type_id)}
          sub={lookups.label('locations', record.location_id)}
        />
      ),
    },
    {
      key: 'address',
      title: 'Адрес',
      width: '13%',
      render: (record) => (
        <TwoLines
          main={str(record, 'address_ru') ?? str(record, 'address')}
          sub={
            str(record, 'check_in_time') && `заезд с ${str(record, 'check_in_time')?.slice(0, 5)}`
          }
        />
      ),
    },
    {
      key: 'rating',
      title: 'Рейтинг',
      width: '8%',
      render: (record) => (
        <TwoLines
          main={str(record, 'average_overall_rating')}
          sub={str(record, 'overall_rating_count') && `${str(record, 'overall_rating_count')} отз.`}
        />
      ),
    },
    { ...activeColumn, width: '11%' },
  ],
  thumbnailColumn: 'photo',
  fields: [
    { name: 'title', label: 'Название (англ.)', type: 'text', required: true, hint: LATIN_HINT },
    { name: 'title_ru', label: 'Название (рус.)', type: 'text', nullable: true },
    {
      name: 'listing_type_id',
      label: 'Тип жилья',
      type: 'select',
      numeric: true,
      required: true,
      options: (lookups) => lookups.listingTypes,
    },
    {
      name: 'location_id',
      label: 'Город',
      type: 'select',
      numeric: true,
      required: true,
      options: (lookups) => lookups.locations,
    },
    { name: 'address', label: 'Адрес (англ.)', type: 'text', nullable: true },
    { name: 'address_ru', label: 'Адрес (рус.)', type: 'text', nullable: true },
    { name: 'latitude', label: 'Широта', type: 'number', nullable: true },
    { name: 'longitude', label: 'Долгота', type: 'number', nullable: true },
    { name: 'check_in_time', label: 'Заезд с', type: 'time', initial: '14:00' },
    { name: 'main_picture', label: 'Главное фото', type: 'url', nullable: true },
    {
      name: 'description',
      label: 'Описание (англ.)',
      type: 'textarea',
      nullable: true,
      wide: true,
      hint: LATIN_HINT,
    },
    {
      name: 'description_ru',
      label: 'Описание (рус.)',
      type: 'textarea',
      nullable: true,
      wide: true,
    },
    {
      name: 'feature_ids',
      label: 'Теги объекта',
      type: 'multiselect',
      mode: 'edit',
      wide: true,
      options: (lookups) => lookups.listingFeatureTags,
      read: (record) =>
        Array.isArray(record.feature_ids) ? record.feature_ids.map(String).join(',') : '',
      write: (value) =>
        String(value)
          .split(',')
          .filter(Boolean)
          .map((id) => Number(id)),
      hint: 'Выберите теги, которые будут показаны в карточке объекта.',
    },
    {
      name: 'external_source',
      label: 'Внешний источник',
      type: 'text',
      nullable: true,
      placeholder: 'osm',
      hint: 'Заполняется вместе с внешним ID или оба пустые',
    },
    {
      name: 'external_id',
      label: 'Внешний ID',
      type: 'text',
      nullable: true,
      placeholder: 'way/36823763',
    },
    {
      name: 'is_active',
      label: 'Показывать на сайте',
      type: 'checkbox',
      hint: 'Новый объект по умолчанию выключен',
    },
  ],
  canCreate: true,
  canEdit: true,
  createLabel: 'Добавить объект',
  recordName: (record) => str(record, 'title_ru') ?? str(record, 'title') ?? '',
  details: {
    label: 'Номера и фото',
    render: (record) => <ListingDetails listingId={String(record.id)} />,
  },
  emptyText: 'Объектов по этим условиям нет.',
};

/** Обложка продукта — объект с размерами; в форме правим только ссылку. */
const thumbnailField: NonNullable<ResourceConfig['fields']>[number] = {
  name: 'thumbnail',
  label: 'Обложка',
  type: 'url',
  read: (record) => String((record.thumbnail as { url?: string } | null)?.url ?? ''),
  write: (value) => (value ? { url: String(value), width: 0, height: 0 } : {}),
};

export const productsConfig: ResourceConfig = {
  key: 'products',
  label: 'Продукты',
  title: 'Экскурсии, услуги и товары',
  path: '/admin/products',
  getId: (record) => String(record.id),
  filters: [
    { name: 'product_type', label: 'Вид', options: PRODUCT_TYPES },
    { name: 'location_id', label: 'Город', options: (lookups) => lookups.locations },
    { name: 'counterparty_id', label: 'Контрагент', options: (lookups) => lookups.counterparties },
  ],
  fitTableToWidth: true,
  actionsColumnWidth: '12%',
  columns: [
    {
      key: 'photo',
      title: 'Фото',
      width: '11%',
      render: (record) => {
        const thumbnail = record.thumbnail as { url?: string } | null;
        const images = record.images as { url?: string }[] | undefined;
        const id = String(record.id);
        const name = str(record, 'name_ru') ?? str(record, 'name') ?? id;
        return (
          <RelatedRecordThumbnail config={productsConfig} id={id} label={name}>
            <MediaThumbnail src={thumbnail?.url || images?.[0]?.url} alt="Фото продукта" />
          </RelatedRecordThumbnail>
        );
      },
    },
    {
      key: 'name',
      title: 'Продукт',
      width: '16%',
      render: (record) => {
        const id = String(record.id);
        return (
          <RelatedRecordButton
            config={productsConfig}
            id={id}
            main={str(record, 'name_ru') ? `RU: ${str(record, 'name_ru')}` : 'RU: —'}
            sub={`EN: ${str(record, 'name') ?? '—'}`}
            maxWidth="220px"
          />
        );
      },
    },
    {
      key: 'description',
      title: 'Описание',
      width: '18%',
      render: (record) =>
        descriptionCell(str(record, 'description_ru'), str(record, 'description')),
    },
    {
      key: 'type',
      title: 'Вид, город',
      width: '11%',
      render: (record, lookups) => (
        <TwoLines
          main={translateAdmin(
            PRODUCT_TYPES.find((type) => type.value === record.product_type)?.label ?? '',
            lookups.language
          )}
          sub={lookups.label('locations', record.location_id)}
        />
      ),
    },
    {
      key: 'price',
      title: 'Цена',
      width: '8%',
      render: (record) => (
        <TwoLines main={formatMoney(String(record.price), String(record.currency))} />
      ),
    },
    {
      key: 'counterparty',
      title: 'Контрагент',
      width: '15%',
      render: (record) => <TwoLines main={str(record, 'counterparty_name')} />,
    },
    { ...activeColumn, width: '9%' },
  ],
  thumbnailColumn: 'photo',
  fields: [
    { name: 'name', label: 'Название (англ.)', type: 'text', required: true, hint: LATIN_HINT },
    { name: 'name_ru', label: 'Название (рус.)', type: 'text', nullable: true },
    {
      name: 'product_type',
      label: 'Вид',
      type: 'select',
      required: true,
      options: PRODUCT_TYPES,
      initial: 'tour',
    },
    { name: 'price', label: 'Цена', type: 'decimal', required: true },
    {
      name: 'currency',
      label: 'Валюта',
      type: 'select',
      required: true,
      initial: 'RUB',
      options: (lookups) => lookups.currencies,
      hint: 'Только базовая валюта сервера (RUB)',
    },
    {
      name: 'location_id',
      label: 'Город',
      type: 'select',
      numeric: true,
      nullable: true,
      options: (lookups) => lookups.locations,
    },
    {
      name: 'counterparty_id',
      label: 'Контрагент',
      type: 'select',
      nullable: true,
      options: (lookups) => lookups.counterparties,
    },
    thumbnailField,
    {
      name: 'description',
      label: 'Описание (англ.)',
      type: 'textarea',
      wide: true,
      hint: LATIN_HINT,
    },
    {
      name: 'description_ru',
      label: 'Описание (рус.)',
      type: 'textarea',
      nullable: true,
      wide: true,
    },
    {
      name: 'images',
      label: 'Фото',
      type: 'json',
      initial: '[]',
      hint: 'Список вида [{"url": "https://…", "width": 0, "height": 0}]',
    },
    {
      name: 'attributes',
      label: 'Характеристики',
      type: 'json',
      initial: '{}',
      hint: 'Объект «название: значение», например {"duration": "3 h"}',
    },
    {
      name: 'schedule',
      label: 'Расписание',
      type: 'json',
      nullable: true,
      hint: 'Только для экскурсий: [{"weekday": 1, "time": "10:00"}], понедельник — 1',
    },
    {
      name: 'is_active',
      label: 'Показывать на витрине',
      type: 'checkbox',
      hint: 'Новый продукт по умолчанию выключен',
    },
  ],
  canCreate: true,
  canEdit: true,
  createLabel: 'Добавить продукт',
  recordName: (record) => str(record, 'name_ru') ?? str(record, 'name') ?? '',
  emptyText: 'Продуктов по этим условиям нет.',
};

export const counterpartiesConfig: ResourceConfig = {
  key: 'counterparties',
  label: 'Контрагенты',
  title: 'Контрагенты',
  path: '/admin/counterparties',
  getId: (record) => String(record.id),
  filters: [{ name: 'location_id', label: 'Город', options: (lookups) => lookups.locations }],
  columns: [
    {
      key: 'name',
      title: 'Контрагент',
      render: (record) => <TwoLines main={str(record, 'name')} />,
    },
    {
      key: 'location',
      title: 'Город',
      render: (record, lookups) => (
        <TwoLines main={lookups.label('locations', record.location_id)} />
      ),
    },
  ],
  fields: [
    { name: 'name', label: 'Название', type: 'text', required: true },
    {
      name: 'location_id',
      label: 'Город',
      type: 'select',
      numeric: true,
      required: true,
      options: (lookups) => lookups.locations,
    },
  ],
  canCreate: true,
  canEdit: true,
  createLabel: 'Добавить контрагента',
  recordName: (record) => str(record, 'name') ?? '',
  emptyText: 'Контрагентов пока нет.',
};
