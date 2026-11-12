import { formatDateTime } from '../../format';
import type { ResourceConfig } from '../types';
import { activeColumn, createdColumn, LATIN_HINT, str, TwoLines } from './cells';

const ADMIN_ONLY: ResourceConfig['roles'] = ['admin'];

const numberId = (record: Record<string, unknown>) => String(record.id);

const nameFields = [
  { name: 'name', label: 'Название (англ.)', type: 'text', required: true, hint: LATIN_HINT },
  { name: 'name_ru', label: 'Название (рус.)', type: 'text', nullable: true },
] satisfies ResourceConfig['fields'];

export const countriesConfig: ResourceConfig = {
  key: 'countries',
  label: 'Страны',
  title: 'Страны',
  roles: ADMIN_ONLY,
  path: '/admin/countries',
  getId: numberId,
  columns: [
    {
      key: 'name',
      title: 'Название EN',
      render: (record) => <TwoLines main={str(record, 'name')} />,
    },
    {
      key: 'name_ru',
      title: 'Название RU',
      render: (record) => <TwoLines main={str(record, 'name_ru')} />,
    },
    { key: 'code', title: 'Код', render: (record) => <TwoLines main={str(record, 'code')} /> },
  ],
  fields: [
    ...nameFields,
    {
      name: 'code',
      label: 'Код',
      type: 'text',
      required: true,
      placeholder: 'RU',
      hint: 'Две заглавные латинские буквы',
    },
  ],
  canCreate: true,
  canEdit: true,
  createLabel: 'Добавить страну',
  recordName: (record) => str(record, 'name_ru') ?? str(record, 'name') ?? '',
  emptyText: 'Стран пока нет.',
};

export const locationsConfig: ResourceConfig = {
  key: 'locations',
  label: 'Города',
  title: 'Города и направления',
  roles: ADMIN_ONLY,
  path: '/admin/locations',
  getId: numberId,
  filters: [{ name: 'country_id', label: 'Страна', options: (lookups) => lookups.countries }],
  columns: [
    {
      key: 'name',
      title: 'Название EN',
      render: (record) => <TwoLines main={str(record, 'name')} />,
    },
    {
      key: 'name_ru',
      title: 'Название RU',
      render: (record) => <TwoLines main={str(record, 'name_ru')} />,
    },
    {
      key: 'country',
      title: 'Страна',
      render: (record, lookups) => (
        <TwoLines
          main={lookups.label('countries', record.country_id) ?? str(record, 'country_id')}
        />
      ),
    },
    {
      key: 'center',
      title: 'Центр',
      render: (record) => (
        <TwoLines main={`${str(record, 'center_latitude')}, ${str(record, 'center_longitude')}`} />
      ),
    },
  ],
  fields: [
    ...nameFields,
    {
      name: 'country_id',
      label: 'Страна',
      type: 'select',
      numeric: true,
      required: true,
      options: (lookups) => lookups.countries,
    },
    { name: 'center_latitude', label: 'Широта центра', type: 'number', required: true },
    {
      name: 'center_longitude',
      label: 'Долгота центра',
      type: 'number',
      required: true,
      hint: 'После смены центра нужно пересчитать расстояния на бэкенде',
    },
  ],
  canCreate: true,
  canEdit: true,
  createLabel: 'Добавить город',
  recordName: (record) => str(record, 'name_ru') ?? str(record, 'name') ?? '',
  emptyText: 'Городов пока нет.',
};

export const listingTypesConfig: ResourceConfig = {
  key: 'listing_types',
  label: 'Типы жилья',
  title: 'Типы жилья',
  roles: ADMIN_ONLY,
  path: '/admin/listing_types',
  getId: numberId,
  columns: [
    {
      key: 'name',
      title: 'Название EN',
      render: (record) => <TwoLines main={str(record, 'name')} />,
    },
    {
      key: 'name_ru',
      title: 'Название RU',
      render: (record) => <TwoLines main={str(record, 'name_ru')} />,
    },
    { key: 'slug', title: 'Код', render: (record) => <TwoLines main={str(record, 'slug')} /> },
  ],
  fields: [
    ...nameFields,
    {
      name: 'slug',
      label: 'Код',
      type: 'text',
      required: true,
      placeholder: 'guest_house',
      hint: 'Строчные латинские буквы и цифры, части через «-» или «_»',
    },
  ],
  canCreate: true,
  canEdit: true,
  createLabel: 'Добавить тип жилья',
  recordName: (record) => str(record, 'name_ru') ?? str(record, 'name') ?? '',
  emptyText: 'Типов жилья пока нет.',
};

export const currenciesConfig: ResourceConfig = {
  key: 'currencies',
  label: 'Валюты',
  title: 'Валюты',
  roles: ADMIN_ONLY,
  path: '/admin/currencies',
  getId: (record) => String(record.code),
  filters: [
    {
      name: 'is_active',
      label: 'Статус',
      options: [
        { value: 'true', label: 'Активные' },
        { value: 'false', label: 'Выключенные' },
      ],
    },
  ],
  columns: [
    { key: 'code', title: 'Код', render: (record) => <TwoLines main={str(record, 'code')} /> },
    {
      key: 'name',
      title: 'Название EN',
      render: (record) => <TwoLines main={str(record, 'name')} />,
    },
    {
      key: 'name_ru',
      title: 'Название RU',
      render: (record) => <TwoLines main={str(record, 'name_ru')} />,
    },
    activeColumn,
  ],
  fields: [
    {
      name: 'code',
      label: 'Код',
      type: 'text',
      required: true,
      mode: 'create',
      placeholder: 'USD',
      hint: 'Три заглавные латинские буквы; после создания не меняется',
    },
    ...nameFields,
    {
      name: 'is_active',
      label: 'Активна',
      type: 'checkbox',
      initial: true,
      hint: 'Базовую валюту выключить нельзя',
    },
  ],
  canCreate: true,
  canEdit: true,
  createLabel: 'Добавить валюту',
  recordName: (record) => str(record, 'code') ?? '',
  emptyText: 'Валют по этим условиям нет.',
};

export const exchangeRatesConfig: ResourceConfig = {
  key: 'exchange_rates',
  label: 'Курсы валют',
  title: 'Курсы валют',
  roles: ADMIN_ONLY,
  path: '/admin/exchange-rates',
  getId: (record) => String(record.id),
  filters: [
    {
      name: 'quote_currency',
      label: 'Валюта',
      options: (lookups) => lookups.currencies,
    },
  ],
  columns: [
    {
      key: 'quote_currency',
      title: 'Валюта',
      render: (record) => <TwoLines main={str(record, 'quote_currency')} />,
    },
    {
      key: 'rate',
      title: 'Курс',
      render: (record) => <TwoLines main={str(record, 'rate')} sub="за 1 RUB" />,
    },
    {
      key: 'effective_from',
      title: 'Действует с',
      render: (record, lookups) => {
        const value = str(record, 'effective_from');
        return <TwoLines main={value && formatDateTime(value, lookups.language)} />;
      },
    },
    createdColumn,
  ],
  fields: [
    {
      name: 'quote_currency',
      label: 'Валюта',
      type: 'select',
      required: true,
      options: (lookups) => lookups.currencies,
      hint: 'Кроме базовой; валюта должна быть активной',
    },
    {
      name: 'rate',
      label: 'Курс',
      type: 'decimal',
      required: true,
      placeholder: '0.0109',
      hint: 'Сколько единиц валюты стоит единица базовой (рубль)',
    },
    { name: 'effective_from', label: 'Действует с', type: 'datetime', required: true },
  ],
  canCreate: true,
  createLabel: 'Добавить курс',
  recordName: (record) => str(record, 'quote_currency') ?? '',
  emptyText: 'Курсов пока нет. Курс не меняется: исправление вводится новой записью.',
};

export const listingFeatureTagsConfig: ResourceConfig = {
  key: 'listing_feature_tags',
  label: 'Теги объектов',
  title: 'Теги объектов размещения',
  roles: ADMIN_ONLY,
  path: '/admin/listing-feature-tags',
  getId: numberId,
  filters: [
    {
      name: 'is_active',
      label: 'Статус',
      options: [
        { value: 'true', label: 'Активные' },
        { value: 'false', label: 'Выключенные' },
      ],
    },
  ],
  columns: [
    {
      key: 'name',
      title: 'Название EN',
      render: (record) => <TwoLines main={str(record, 'name')} />,
    },
    {
      key: 'name_ru',
      title: 'Название RU',
      render: (record) => <TwoLines main={str(record, 'name_ru')} />,
    },
    { key: 'slug', title: 'Код', render: (record) => <TwoLines main={str(record, 'slug')} /> },
    activeColumn,
    createdColumn,
  ],
  fields: [
    {
      name: 'slug',
      label: 'Код',
      type: 'text',
      required: true,
      hint: 'Латинские строчные буквы и дефисы',
    },
    { name: 'name', label: 'Название (англ.)', type: 'text', required: true, hint: LATIN_HINT },
    { name: 'name_ru', label: 'Название (рус.)', type: 'text', required: true },
    { name: 'is_active', label: 'Активен', type: 'checkbox', initial: true },
  ],
  canCreate: true,
  canEdit: true,
  createLabel: 'Добавить тег',
  recordName: (record) => str(record, 'name_ru') ?? str(record, 'name') ?? '',
  emptyText: 'Тегов объектов пока нет.',
};
