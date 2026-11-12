import { formatMoney } from '@/lib/format';
import { Text } from '@chakra-ui/react';
import type { AdminRecord } from '@/lib/adminApi';
import { UnitImages } from '../UnitImages';
import type { Option, ResourceConfig } from '../types';
import { activeColumn, LATIN_HINT, str, TwoLines } from './cells';

const UNIT_TYPES = [
  { value: 'property', label: 'Объект целиком' },
  { value: 'room', label: 'Номер или комната' },
  { value: 'bed', label: 'Место в комнате' },
];

const typeLabel = (value: unknown) => UNIT_TYPES.find((type) => type.value === value)?.label;

/**
 * Фонд одного объекта: номера, комнаты и места. Места создаются внутри комнаты,
 * поэтому список комнат для выбора передаём снаружи. Тип и комнату после создания не меняют.
 */
export const unitsConfig = (listingId: string, rooms: Option[]): ResourceConfig => {
  const path = `/admin/listings/${listingId}/units`;
  return {
    key: `units-${listingId}`,
    label: 'Номера',
    title: 'Номера и места',
    path,
    unpaginated: true,
    getId: (record) => String(record.id),
    columns: [
      {
        key: 'name',
        title: 'Название',
        render: (record) => (
          <TwoLines
            main={str(record, 'name_ru') ?? str(record, 'name')}
            sub={[typeLabel(record.type), str(record, 'parent_name')].filter(Boolean).join(' · ')}
          />
        ),
      },
      {
        key: 'price',
        title: 'Цена за ночь',
        render: (record) => (
          <TwoLines main={formatMoney(String(record.price_per_night), String(record.currency))} />
        ),
      },
      {
        key: 'capacity',
        title: 'Гости',
        render: (record) => (
          <TwoLines
            main={`${record.capacity_adults} взр., ${record.capacity_children} дет.`}
            sub={record.pets_allowed ? 'можно с питомцами' : undefined}
          />
        ),
      },
      {
        key: 'images',
        title: 'Фото',
        render: (record) => (
          <TwoLines main={String((record.images as unknown[] | undefined)?.length ?? 0)} />
        ),
      },
      activeColumn,
    ],
    fields: [
      {
        name: 'type',
        label: 'Тип',
        type: 'select',
        required: true,
        mode: 'create',
        options: UNIT_TYPES,
        initial: 'room',
      },
      {
        name: 'parent_unit_id',
        label: 'Комната (для места)',
        type: 'select',
        mode: 'create',
        options: rooms,
        hint: 'Нужна только для места в комнате хостела',
      },
      { name: 'name', label: 'Название (англ.)', type: 'text', required: true, hint: LATIN_HINT },
      { name: 'name_ru', label: 'Название (рус.)', type: 'text', nullable: true },
      { name: 'price_per_night', label: 'Цена за ночь', type: 'decimal', required: true },
      {
        name: 'currency',
        label: 'Валюта',
        type: 'select',
        required: true,
        initial: 'RUB',
        options: (lookups) => lookups.currencies,
      },
      { name: 'capacity_adults', label: 'Взрослых', type: 'number', required: true, initial: '2' },
      { name: 'capacity_children', label: 'Детей', type: 'number', required: true, initial: '0' },
      { name: 'pets_allowed', label: 'Можно с питомцами', type: 'checkbox' },
      { name: 'is_active', label: 'Доступен для брони', type: 'checkbox', initial: true },
    ],
    canCreate: true,
    canEdit: true,
    editContent: (record: AdminRecord) => (
      <>
        <Text mb="10px" fontSize="14px" fontWeight="600">
          Фотографии
        </Text>
        <UnitImages listingId={listingId} unitId={String(record.id)} />
      </>
    ),
    createLabel: 'Добавить номер или место',
    recordName: (record) => str(record, 'name_ru') ?? str(record, 'name') ?? '',
    emptyText: 'Номеров пока нет — без них объект нельзя забронировать.',
  };
};
