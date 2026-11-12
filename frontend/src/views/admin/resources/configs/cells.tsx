'use client';

import { Text } from '@chakra-ui/react';
import type { AdminRecord } from '@/lib/adminApi';
import { StatusBadge } from '@/shared/status-badge';
import { formatDateTime, shortId } from '../../format';
import { primaryTextStyle, secondaryTextStyle } from '../../table.styles';
import type { ResourceColumn } from '../types';
import { translateAdmin, useAdminLanguage } from '../../adminLocale';

// Ячейки таблиц разделов: значения бэкенда приходят без типов, поэтому приводим их здесь.

export const str = (record: AdminRecord, name: string) => {
  const value = record[name];
  return value === null || value === undefined || value === '' ? undefined : String(value);
};

/** Основная строка и, если есть, мелкая серая под ней. */
export const TwoLines = ({ main, sub, title }: { main?: string; sub?: string; title?: string }) => (
  <>
    <Text {...primaryTextStyle} title={title}>
      {main ?? '—'}
    </Text>
    {sub && <Text {...secondaryTextStyle}>{sub}</Text>}
  </>
);

export const ActiveBadge = ({ active }: { active: unknown }) => {
  const lang = useAdminLanguage();
  return (
    <StatusBadge tone={active ? 'done' : 'canceled'}>
      {translateAdmin(active ? 'Активен' : 'Выключен', lang)}
    </StatusBadge>
  );
};

/** Колонка «название и русский перевод под ним». */
export const nameColumn = (title: string, name = 'name'): ResourceColumn => ({
  key: name,
  title,
  render: (record) => <TwoLines main={str(record, name)} sub={str(record, `${name}_ru`)} />,
});

export const idColumn = (title: string, name = 'id'): ResourceColumn => ({
  key: name,
  title,
  render: (record) => {
    const id = str(record, name);
    return <TwoLines main={id && shortId(id)} title={id} />;
  },
});

export const createdColumn: ResourceColumn = {
  key: 'created_at',
  title: 'Создан',
  render: (record, lookups) => {
    const value = str(record, 'created_at');
    return <TwoLines main={value && formatDateTime(value, lookups.language)} />;
  },
};

export const activeColumn: ResourceColumn = {
  key: 'is_active',
  title: 'Статус',
  render: (record) => <ActiveBadge active={record.is_active} />,
};

/** Подсказка к английским полям: бэкенд не принимает в них кириллицу. */
export const LATIN_HINT = 'Латиницей: бэкенд не принимает здесь кириллицу';
