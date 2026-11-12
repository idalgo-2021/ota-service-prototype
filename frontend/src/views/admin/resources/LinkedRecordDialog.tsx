'use client';

import { Box, Stack, Text } from '@chakra-ui/react';
import { useGetAdminRecordQuery } from '@/lib/adminApi';
import { DetailRow, DetailsDialog } from '../DetailsDialog';
import type { ResourceConfig } from './types';
import { translateAdmin, translateResourceConfig, useAdminLanguage } from '../adminLocale';

const readable = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

export const LinkedRecordDialog = ({
  config,
  id,
  onClose,
}: {
  config: ResourceConfig;
  id: string;
  onClose: () => void;
}) => {
  const lang = useAdminLanguage();
  const t = (text: string) => translateAdmin(text, lang);
  const localizedConfig = translateResourceConfig(config, lang);
  const { data, isLoading, isError } = useGetAdminRecordQuery(
    `${config.path}/${encodeURIComponent(id)}`
  );
  const fields =
    localizedConfig.fields?.filter(
      (field) => field.type !== 'password' && field.mode !== 'create'
    ) ?? [];
  const name = data
    ? lang === 'en' && config.key === 'listings'
      ? String(data.title ?? data.title_ru ?? config.recordName(data))
      : lang === 'en' && config.key === 'products'
        ? String(data.name ?? data.name_ru ?? config.recordName(data))
        : config.recordName(data)
    : id;
  return (
    <DetailsDialog title={`${localizedConfig.label}: ${name}`} onClose={onClose}>
      {isLoading && <Text>{t('Загружаем карточку…')}</Text>}
      {isError && <Text role="alert">{t('Не удалось загрузить запись.')}</Text>}
      {data && (
        <Stack gap="0">
          <DetailRow label="ID" value={id} />
          {Boolean(data.email) && <DetailRow label="Почта" value={String(data.email)} />}
          {fields.map((field) => (
            <DetailRow
              key={field.name}
              label={field.label}
              value={
                <Box as="span" whiteSpace="pre-wrap">
                  {readable(data[field.name])}
                </Box>
              }
            />
          ))}
          {localizedConfig.details?.render(data)}
        </Stack>
      )}
    </DetailsDialog>
  );
};
