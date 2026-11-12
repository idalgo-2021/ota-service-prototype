'use client';

import { Stack } from '@chakra-ui/react';
import type { AdminRecord } from '@/lib/adminApi';
import { DetailRow } from '../../DetailsDialog';
import { formatDateTime } from '../../format';
import { useLookups } from '../useLookups';
import { str } from './cells';
import { translateAdmin, useAdminLanguage } from '../../adminLocale';

const GENDER_LABELS: Record<string, string> = {
  female: 'Женский',
  male: 'Мужской',
  other: 'Другой',
};

const display = (value: unknown) =>
  value === null || value === undefined || value === '' ? '—' : String(value);
export const UserProfileDetails = ({ record }: { record: AdminRecord }) => {
  const lookups = useLookups();
  const lang = useAdminLanguage();
  const date = (value: unknown) =>
    value === null || value === undefined || value === ''
      ? '—'
      : formatDateTime(String(value), lang);
  const name = [str(record, 'first_name'), str(record, 'last_name')].filter(Boolean).join(' ');
  const role = String(record.role ?? '');
  const roleLabel = translateAdmin(
    role === 'user'
      ? 'Клиент'
      : role === 'manager'
        ? 'Менеджер'
        : role === 'admin'
          ? 'Администратор'
          : role === 'hotelier'
            ? 'Отельер'
            : role,
    lang
  );

  return (
    <Stack gap="0">
      <DetailRow label="Имя и фамилия" value={name} />
      <DetailRow label="Почта" value={display(record.email)} />
      <DetailRow label="Роль" value={roleLabel} />
      <DetailRow label="Год рождения" value={display(record.birth_year)} />
      <DetailRow
        label="Пол"
        value={GENDER_LABELS[String(record.gender ?? '')] ?? display(record.gender)}
      />
      <DetailRow label="Национальность" value={display(record.nationality)} />
      <DetailRow label="О себе" value={display(record.about)} />
      <DetailRow label="Страна" value={display(lookups.label('countries', record.country_id))} />
      <DetailRow label="Город" value={display(lookups.label('locations', record.location_id))} />
      <DetailRow label="Язык интерфейса" value={display(record.language)} />
      <DetailRow label="Валюта" value={display(record.currency)} />
      <DetailRow label="Учетная запись создана" value={date(record.created_at)} />
      <DetailRow label="Профиль создан" value={date(record.profile_created_at)} />
      <DetailRow label="Профиль изменен" value={date(record.profile_updated_at)} />
      <DetailRow label="ID пользователя" value={display(record.id)} />
    </Stack>
  );
};
