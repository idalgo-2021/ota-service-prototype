'use client';

import { useMemo, useState } from 'react';
import { Box, Flex, Stack, Text, chakra } from '@chakra-ui/react';
import { useGetAdminPageQuery, type AdminRecord } from '@/lib/adminApi';
import { Input } from '@/shared/input';
import { HotelierListingAssignments } from './resources/HotelierListingAssignments';
import { translateAdmin, useAdminLanguage } from './adminLocale';

const HOTELIERS_LIMIT = 100;
const EMPTY_USERS: AdminRecord[] = [];

export const HotelierSettings = () => {
  const lang = useAdminLanguage();
  const t = (text: string) => translateAdmin(text, lang);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const hoteliers = useGetAdminPageQuery({
    path: '/admin/users',
    params: { role: 'hotelier', limit: HOTELIERS_LIMIT },
  });
  const users = hoteliers.data?.items ?? EMPTY_USERS;
  const filteredUsers = useMemo(() => {
    const value = search.trim().toLocaleLowerCase(lang === 'en' ? 'en' : 'ru');
    if (!value) {
      return users;
    }
    return users.filter((user) =>
      [user.first_name, user.last_name, user.email]
        .map((part) => String(part ?? ''))
        .join(' ')
        .toLocaleLowerCase(lang === 'en' ? 'en' : 'ru')
        .includes(value)
    );
  }, [search, users, lang]);
  const selectedUser = users.find((user) => String(user.id) === selectedId);
  const selectedName = selectedUser
    ? [selectedUser.first_name, selectedUser.last_name]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join(' ')
    : '';

  return (
    <Flex align="flex-start" gap="16px" flexDirection={{ base: 'column', lg: 'row' }} minW="0">
      <Stack
        gap="12px"
        w={{ base: '100%', lg: '280px' }}
        flexShrink={0}
        p="14px"
        border="1px solid"
        borderColor="#e5e5ea"
        borderRadius="14px"
        bg="white"
        boxShadow="0 1px 2px rgba(0,0,0,0.035)"
      >
        <Text fontSize="14px" fontWeight="600">
          {t('Выберите отельера')}
        </Text>
        <Input
          type="search"
          aria-label={t('Поиск отельера по имени или почте')}
          placeholder={t('Поиск по имени или почте')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {hoteliers.isLoading ? (
          <Text fontSize="13px" color="fg.muted">
            {t('Загружаем отельеров…')}
          </Text>
        ) : hoteliers.isError ? (
          <Text role="alert" fontSize="13px" color="red.600">
            {t('Не удалось загрузить отельеров.')}
          </Text>
        ) : filteredUsers.length ? (
          <Stack gap="4px" maxH="480px" overflowY="auto">
            {filteredUsers.map((user) => {
              const id = String(user.id);
              const active = selectedId === id;
              return (
                <chakra.button
                  key={id}
                  type="button"
                  onClick={() => setSelectedId(id)}
                  aria-pressed={active}
                  textAlign="left"
                  p="10px"
                  borderRadius="10px"
                  bg={active ? 'blue.50' : 'transparent'}
                  color={active ? 'blue.800' : 'gray.800'}
                  _hover={{ bg: active ? 'blue.50' : 'gray.50' }}
                  _focusVisible={{ outline: '2px solid', outlineColor: 'blue.500' }}
                >
                  <Text fontSize="13px" fontWeight={active ? '600' : '400'}>
                    {[user.first_name, user.last_name]
                      .map((part) => String(part ?? '').trim())
                      .filter(Boolean)
                      .join(' ') || String(user.email ?? id)}
                  </Text>
                  {Boolean(user.first_name || user.last_name) && (
                    <Text fontSize="11px" color="fg.muted">
                      {String(user.email ?? '')}
                    </Text>
                  )}
                </chakra.button>
              );
            })}
          </Stack>
        ) : (
          <Text fontSize="13px" color="fg.muted">
            {t('Отельеры не найдены.')}
          </Text>
        )}
      </Stack>

      <Stack
        gap="14px"
        flex="1"
        minW="0"
        p="16px"
        border="1px solid"
        borderColor="#e5e5ea"
        borderRadius="14px"
        bg="white"
        boxShadow="0 1px 2px rgba(0,0,0,0.035)"
      >
        {selectedUser ? (
          <>
            <Box>
              <Text fontSize="16px" fontWeight="600">
                {selectedName || String(selectedUser.email ?? selectedId)}
              </Text>
              <Text fontSize="12px" color="fg.muted">
                {selectedName ? `${String(selectedUser.email ?? '')} · ` : ''}
                {t('Настройте объекты, доступные этому отельеру.')}
              </Text>
            </Box>
            <HotelierListingAssignments userId={selectedId} />
          </>
        ) : (
          <Text fontSize="14px" color="fg.muted">
            {t('Выберите отельера, чтобы увидеть и изменить список его объектов.')}
          </Text>
        )}
      </Stack>
    </Flex>
  );
};
