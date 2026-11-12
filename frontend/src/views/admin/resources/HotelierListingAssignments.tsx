'use client';

import { useMemo, useState } from 'react';
import { Box, Flex, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import {
  useGetAdminHotelierListingsQuery,
  useGetAdminHotelierListingAssignmentsQuery,
  useGetAdminPageQuery,
  useGetAdminRecordQuery,
  useSetAdminHotelierListingsMutation,
} from '@/lib/adminApi';
import { getErrorMessage } from '@/lib/api';
import { Button } from '@/shared/button';
import { Input } from '@/shared/input';
import { MediaThumbnail } from './configs/MediaThumbnail';
import { useLookups } from './useLookups';
import type { Lookups } from './types';
import { translateAdmin, useAdminLanguage } from '../adminLocale';

const LISTINGS_LIMIT = 100;
const EMPTY_IDS: string[] = [];
const compactButtonProps = {
  h: '32px',
  minH: '32px',
  minW: '0',
  px: '10px',
  fontSize: '12px',
  lineHeight: '1.2',
  borderRadius: '8px',
  whiteSpace: 'normal' as const,
  textAlign: 'center' as const,
};

const AssignedListingRow = ({
  id,
  search,
  assignedAt,
  pendingAssignment,
  assignmentLoading,
  onRemove,
  lookups,
}: {
  id: string;
  search: string;
  assignedAt?: string;
  pendingAssignment: boolean;
  assignmentLoading: boolean;
  onRemove: () => void;
  lookups: Lookups;
}) => {
  const lang = useAdminLanguage();
  const t = (text: string) => translateAdmin(text, lang);
  const { data, isLoading, isError } = useGetAdminRecordQuery(`/admin/listings/${id}`);
  const title = String(
    (lang === 'en' ? data?.title : (data?.title_ru ?? data?.title)) ?? `Объект ${id}`
  );
  const address = String(
    (lang === 'en' ? data?.address : (data?.address_ru ?? data?.address)) ?? ''
  );
  const typeName = lookups.label('listingTypes', data?.listing_type_id);
  const searchable = `${title} ${address} ${typeName ?? ''}`.toLocaleLowerCase(lang === 'en' ? 'en' : 'ru');

  if (
    search &&
    !searchable.includes(search.trim().toLocaleLowerCase(lang === 'en' ? 'en' : 'ru'))
  ) {
    return null;
  }

  return (
    <Flex
      align="center"
      justify="space-between"
      gap="12px"
      p="10px 12px"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="10px"
      minW="0"
    >
      <Link
        href={`/listings/${encodeURIComponent(id)}`}
        aria-label={`${lang === 'en' ? 'Open property details' : 'Открыть карточку объекта'}: ${title}`}
        style={{ display: 'block', flexShrink: 0 }}
      >
        <MediaThumbnail
          src={typeof data?.main_picture === 'string' ? data.main_picture : undefined}
          alt={`${lang === 'en' ? 'Property photo' : 'Фото объекта'}: ${title}`}
        />
      </Link>
      <Link
        href={`/listings/${encodeURIComponent(id)}`}
        aria-label={`${lang === 'en' ? 'Open property details' : 'Открыть карточку объекта'}: ${title}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          flex: '1 1 auto',
          minWidth: 0,
          textAlign: 'left',
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <Text w="100%" textAlign="left" fontSize="14px" fontWeight="500" lineClamp={2}>
          {isLoading
            ? t('Загружаем объект…')
            : isError
              ? `${lang === 'en' ? 'Could not load property' : 'Не удалось загрузить объект'} (${id})`
              : title}
        </Text>
        {address && !isLoading && !isError && (
          <Text w="100%" textAlign="left" fontSize="12px" color="fg.muted" lineClamp={1}>
            {address}
          </Text>
        )}
      </Link>
      <Box flex="0 0 110px" textAlign="left">
        {isLoading ? (
          <Text fontSize="13px" color="fg.muted">
            {t('Загружаем…')}
          </Text>
        ) : typeName ? (
          <Box
            as="span"
            display="inline-flex"
            px="8px"
            py="2px"
            borderRadius="6px"
            bg="gray.100"
            color="gray.800"
            fontSize="12px"
            fontWeight="500"
          >
            {typeName}
          </Box>
        ) : (
          <Text fontSize="13px" color="fg.muted">
            —
          </Text>
        )}
      </Box>
      <Text
        flex="0 0 112px"
        textAlign="left"
        fontSize="13px"
        color="fg.muted"
        title={
          assignedAt
            ? new Date(assignedAt).toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU')
            : undefined
        }
      >
        {assignedAt
          ? new Date(assignedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU')
          : pendingAssignment
            ? t('После сохранения')
            : assignmentLoading
              ? t('Загружаем…')
              : '—'}
      </Text>
      <Button {...compactButtonProps} type="button" appearance="soft" onClick={onRemove}>
        {t('Убрать')}
      </Button>
    </Flex>
  );
};

export const HotelierListingAssignments = ({ userId }: { userId: string }) => {
  const lang = useAdminLanguage();
  const t = (text: string) => translateAdmin(text, lang);
  const lookups = useLookups();
  const [draftIds, setDraftIds] = useState<string[] | null>(null);
  const [assignedSearch, setAssignedSearch] = useState('');
  const [addSearch, setAddSearch] = useState('');
  const assigned = useGetAdminHotelierListingsQuery(userId);
  const assignments = useGetAdminHotelierListingAssignmentsQuery(userId);
  const listingMatches = useGetAdminPageQuery(
    {
      path: '/admin/listings',
      params: { limit: LISTINGS_LIMIT, search: addSearch.trim() || undefined },
    },
    { skip: addSearch.trim().length < 2 }
  );
  const [save, saveState] = useSetAdminHotelierListingsMutation();

  const selectedIds = draftIds ?? assigned.data ?? EMPTY_IDS;
  const currentIds = assigned.data ?? EMPTY_IDS;
  const hasChanges = useMemo(() => {
    const current = [...currentIds].sort();
    const next = [...selectedIds].sort();
    return current.length !== next.length || current.some((id, index) => id !== next[index]);
  }, [currentIds, selectedIds]);
  const matchItems = listingMatches.data?.items ?? [];
  const availableItems = matchItems.filter((item) => !selectedIds.includes(String(item.id)));

  const addListing = (id: string) => {
    setDraftIds((current) => {
      const ids = current ?? assigned.data ?? [];
      return ids.includes(id) ? ids : [...ids, id];
    });
  };

  const removeListing = (id: string) => {
    setDraftIds((current) => (current ?? assigned.data ?? []).filter((value) => value !== id));
  };

  const handleSave = async () => {
    const result = await save({ userId, listingIds: selectedIds });
    if ('data' in result && result.data) {
      setDraftIds(result.data);
    }
  };

  return (
    <Stack gap="18px" minW="0" w="100%">
      <Stack gap="8px">
        <Flex align="center" justify="space-between" gap="12px" wrap="wrap">
          <Text fontSize="15px" fontWeight="600">
            {t('Привязанные объекты')} ({selectedIds.length})
          </Text>
          <Button
            {...compactButtonProps}
            type="button"
            onClick={() => void handleSave()}
            loading={saveState.isLoading}
            disabled={!hasChanges || assigned.isLoading}
          >
            {t('Сохранить изменения')}
          </Button>
        </Flex>
        <Input
          type="search"
          aria-label={t('Поиск среди привязанных объектов')}
          placeholder={t('Поиск среди привязанных объектов')}
          value={assignedSearch}
          onChange={(event) => setAssignedSearch(event.target.value)}
        />
        {selectedIds.length > 0 && (
          <Flex px="12px" align="center" gap="12px">
            <Text flex="1" fontSize="11px" color="fg.muted" textTransform="uppercase">
              {t('Объект')}
            </Text>
            <Text flex="0 0 110px" fontSize="11px" color="fg.muted" textTransform="uppercase">
              {t('Тип объекта')}
            </Text>
            <Text flex="0 0 112px" fontSize="11px" color="fg.muted" textTransform="uppercase">
              {t('Дата привязки')}
            </Text>
            <Box flex="0 0 72px" />
          </Flex>
        )}
        {assigned.isLoading ? (
          <Text fontSize="13px" color="fg.muted">
            {t('Загружаем привязки…')}
          </Text>
        ) : assigned.isError ? (
          <Text role="alert" fontSize="13px" color="red.600">
            {t('Не удалось загрузить привязанные объекты.')}
          </Text>
        ) : selectedIds.length ? (
          <Stack gap="8px" maxH="360px" overflowY="auto" minW="0">
            {selectedIds.map((id) => (
              <AssignedListingRow
                key={id}
                id={id}
                search={assignedSearch}
                assignedAt={assignments.data?.find((item) => item.listing_id === id)?.created_at}
                pendingAssignment={!currentIds.includes(id)}
                assignmentLoading={assignments.isLoading}
                onRemove={() => removeListing(id)}
                lookups={lookups}
              />
            ))}
          </Stack>
        ) : (
          <Text fontSize="13px" color="fg.muted">
            {t('Пока нет привязанных объектов. Найдите объект ниже, чтобы добавить его.')}
          </Text>
        )}
      </Stack>

      <Stack gap="8px" pt="16px" borderTop="1px solid" borderColor="gray.200">
        <Text fontSize="14px" fontWeight="600">
          {t('Добавить объект')}
        </Text>
        <Input
          type="search"
          aria-label={t('Поиск объектов для привязки')}
          placeholder={t('Начните вводить название объекта')}
          value={addSearch}
          onChange={(event) => setAddSearch(event.target.value)}
        />
        {addSearch.trim().length < 2 ? (
          <Text fontSize="12px" color="fg.muted">
            {t('Введите не менее двух символов — покажем только подходящие объекты.')}
          </Text>
        ) : listingMatches.isLoading ? (
          <Text fontSize="13px" color="fg.muted">
            {t('Ищем объекты…')}
          </Text>
        ) : listingMatches.isError ? (
          <Text role="alert" fontSize="13px" color="red.600">
            {t('Не удалось выполнить поиск объектов.')}
          </Text>
        ) : availableItems.length ? (
          <Stack gap="6px" maxH="240px" overflowY="auto" minW="0">
            {availableItems.map((item) => {
              const id = String(item.id);
              const typeName = lookups.label('listingTypes', item.listing_type_id);
              return (
                <Flex
                  key={id}
                  align="center"
                  justify="space-between"
                  gap="12px"
                  p="8px 10px"
                  bg="gray.50"
                  borderRadius="8px"
                >
                  <Flex align="center" gap="8px" minW="0" flex="1" wrap="wrap">
                    <Text fontSize="13px" lineClamp={2}>
                      {String(
                        (lang === 'en' ? item.title : (item.title_ru ?? item.title)) ?? `Объект ${id}`
                      )}
                    </Text>
                    {typeName && (
                      <Box
                        as="span"
                        display="inline-flex"
                        px="6px"
                        py="1px"
                        borderRadius="4px"
                        bg="gray.200"
                        color="gray.700"
                        fontSize="11px"
                        fontWeight="500"
                        flexShrink={0}
                      >
                        {typeName}
                      </Box>
                    )}
                  </Flex>
                  <Button
                    {...compactButtonProps}
                    type="button"
                    appearance="soft"
                    onClick={() => addListing(id)}
                  >
                    {t('Добавить')}
                  </Button>
                </Flex>
              );
            })}
          </Stack>
        ) : (
          <Text fontSize="13px" color="fg.muted">
            {t('Новых объектов по этому запросу нет.')}
          </Text>
        )}
      </Stack>

      {saveState.isError && (
        <Text role="alert" fontSize="13px" color="red.600">
          {getErrorMessage(saveState.error) ?? t('Не удалось сохранить привязки.')}
        </Text>
      )}
      {saveState.isSuccess && !hasChanges && (
        <Text role="status" fontSize="13px" color="green.700">
          {t('Привязки сохранены.')}
        </Text>
      )}
    </Stack>
  );
};
