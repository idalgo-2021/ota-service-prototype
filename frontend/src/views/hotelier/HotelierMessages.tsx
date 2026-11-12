'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Box, Flex, Image, NativeSelect, Stack, Table, Text, Textarea } from '@chakra-ui/react';
import {
  getErrorMessage,
  useGetHotelierMessageQuery,
  useGetHotelierMessagesQuery,
  useReplyHotelierMessageMutation,
  type HotelierListing,
  type HotelierMessage,
} from '@/lib/api';
import { Button } from '@/shared/button';
import { Pagination } from '@/shared/pagination';
import { StatusBadge } from '@/shared/status-badge';
import { DetailsDialog } from '../admin/DetailsDialog';
import { HotelierTable, HotelierTableAction } from './HotelierTable';
import { HotelierMobileCard, HotelierMobileField, HotelierMobileList } from './HotelierMobileCards';

const PAGE_SIZE = 20;
const MESSAGE_TYPES: Record<HotelierMessage['message_type'], { ru: string; en: string }> = {
  client_question: { ru: 'Вопрос клиента', en: 'Client question' },
  ota_notification: { ru: 'Уведомление OTA', en: 'OTA notification' },
  ota_recommendation: { ru: 'Рекомендация OTA', en: 'OTA recommendation' },
};
const SENDER_TYPES: Record<HotelierMessage['sender_type'], { ru: string; en: string }> = {
  ota: { ru: 'OTA', en: 'OTA' },
  known_client: { ru: 'Клиент', en: 'Client' },
  unknown_client: { ru: 'Неизвестный клиент', en: 'Unknown client' },
  staff: { ru: 'Сотрудник', en: 'Staff member' },
  system: { ru: 'Система', en: 'System' },
};

const MessageDetails = ({
  id,
  titleFor,
  lang,
  onClose,
}: {
  id: string;
  titleFor: (id: string) => string;
  lang: 'ru' | 'en';
  onClose: () => void;
}) => {
  const messageQuery = useGetHotelierMessageQuery(id);
  const [draft, setDraft] = useState<string>();
  const [reply, replyState] = useReplyHotelierMessageMutation();
  const message = messageQuery.data;
  const value = draft ?? message?.hotelier_reply ?? '';
  const isDigest = Boolean(
    message &&
    !message.listing_id &&
    message.sender_type === 'system' &&
    message.message_type === 'ota_recommendation'
  );

  const submit = async (processed: boolean) => {
    if (!value.trim() && !isDigest) {
      return;
    }
    await reply({ id, reply: value.trim(), processed });
  };

  return (
    <DetailsDialog title={lang === 'en' ? 'Message' : 'Сообщение'} onClose={onClose}>
      {messageQuery.isLoading ? (
        <Text color="fg.muted">{lang === 'en' ? 'Loading message…' : 'Загружаем сообщение…'}</Text>
      ) : messageQuery.isError || !message ? (
        <Text role="alert" color="red.600">
          {lang === 'en' ? 'Could not load message.' : 'Не удалось загрузить сообщение.'}
        </Text>
      ) : (
        <Stack gap="14px">
          <Stack gap="6px" fontSize="14px">
            <Text>
              <b>{lang === 'en' ? 'Property:' : 'Объект:'}</b>{' '}
              {message.listing_id ? (
                <Link
                  href={`/listings/${encodeURIComponent(message.listing_id)}`}
                  style={{ color: '#1d4ed8' }}
                >
                  {titleFor(message.listing_id)}
                </Link>
              ) : (
                message.listing_title || (lang === 'en' ? 'All properties' : 'Все объекты')
              )}
            </Text>
            <Text>
              <b>{lang === 'en' ? 'Type:' : 'Тип:'}</b> {MESSAGE_TYPES[message.message_type][lang]}
            </Text>
            <Text>
              <b>{lang === 'en' ? 'Sender:' : 'Отправитель:'}</b>{' '}
              {message.sender_name ||
                message.sender_email ||
                SENDER_TYPES[message.sender_type][lang]}
            </Text>
            {message.source && (
              <Text>
                <b>{lang === 'en' ? 'Source:' : 'Источник:'}</b> {message.source}
              </Text>
            )}
            {message.external_message_id && (
              <Text>
                <b>{lang === 'en' ? 'External message ID:' : 'ID сообщения источника:'}</b>{' '}
                {message.external_message_id}
              </Text>
            )}
            <Text>
              <b>{lang === 'en' ? 'Received:' : 'Получено:'}</b>{' '}
              {new Date(message.created_at).toLocaleString(lang === 'en' ? 'en-GB' : 'ru-RU')}
            </Text>
            <Text>
              <b>{lang === 'en' ? 'Status:' : 'Статус:'}</b>{' '}
              {message.status === 'new'
                ? lang === 'en'
                  ? 'New'
                  : 'Новое'
                : lang === 'en'
                  ? 'Processed'
                  : 'Обработано'}
            </Text>
          </Stack>
          <Box p="14px" bg="gray.50" borderRadius="10px" whiteSpace="pre-wrap">
            <Text fontSize="13px" color="fg.muted" mb="6px">
              {lang === 'en' ? 'Message' : 'Сообщение'}
            </Text>
            <Text>{message.message_text}</Text>
          </Box>
          {!isDigest && (
            <Stack gap="6px">
              <Text fontSize="13px" fontWeight="600">
                {lang === 'en' ? 'Reply' : 'Ответ'}
              </Text>
              <Textarea
                value={value}
                minH="120px"
                resize="vertical"
                placeholder={
                  lang === 'en'
                    ? 'Write a reply to the client or add an internal note'
                    : 'Напишите ответ клиенту или добавьте внутреннюю заметку'
                }
                onChange={(event) => setDraft(event.target.value)}
              />
            </Stack>
          )}
          {replyState.isError && (
            <Text role="alert" color="red.600">
              {getErrorMessage(replyState.error) ??
                (lang === 'en' ? 'Could not save reply.' : 'Не удалось сохранить ответ.')}
            </Text>
          )}
          {replyState.isSuccess && (
            <Text role="status" color="green.700">
              {lang === 'en' ? 'Changes saved.' : 'Изменения сохранены.'}
            </Text>
          )}
          {isDigest ? (
            <Button
              type="button"
              loading={replyState.isLoading}
              disabled={message.status === 'processed'}
              onClick={() => void submit(true)}
            >
              {lang === 'en' ? 'Mark as read' : 'Отметить прочитанным'}
            </Button>
          ) : (
            <Flex gap="8px" wrap="wrap">
              <Button
                type="button"
                appearance="soft"
                loading={replyState.isLoading}
                disabled={!value.trim()}
                onClick={() => void submit(message.status === 'processed')}
              >
                {lang === 'en' ? 'Save reply' : 'Сохранить ответ'}
              </Button>
              <Button
                type="button"
                loading={replyState.isLoading}
                disabled={!value.trim() || message.status === 'processed'}
                onClick={() => void submit(true)}
              >
                {lang === 'en' ? 'Reply and mark processed' : 'Ответить и обработать'}
              </Button>
            </Flex>
          )}
        </Stack>
      )}
    </DetailsDialog>
  );
};

export const HotelierMessages = ({
  listings,
  titleFor,
  lang,
}: {
  listings: HotelierListing[];
  titleFor: (id: string) => string;
  lang: 'ru' | 'en';
}) => {
  const [listingId, setListingId] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState<'desc' | 'asc'>('desc');
  const [offset, setOffset] = useState(0);
  const [messageId, setMessageId] = useState<string>();
  const messages = useGetHotelierMessagesQuery({
    limit: PAGE_SIZE,
    offset,
    listing_id: listingId || undefined,
    status: (status || undefined) as HotelierMessage['status'] | undefined,
    type: (type || undefined) as HotelierMessage['message_type'] | undefined,
    sort_by: 'created_at',
    sort_order: sort,
  });
  const page = messages.data;
  const changeFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setOffset(0);
  };

  return (
    <Stack gap="14px">
      <Text fontSize="14px" color="fg.muted">
        {lang === 'en'
          ? 'Client questions, notifications and recommendations are collected in one inbox. Reply in the record and mark it as processed.'
          : 'Вопросы клиентов, уведомления и рекомендации собраны в одной очереди. Ответьте в карточке и отметьте запись обработанной.'}
      </Text>
      <Flex gap="10px" wrap="wrap" align="flex-end">
        <Box minW={{ base: '100%', sm: '220px' }}>
          <Text mb="4px" fontSize="12px" color="fg.muted">
            {lang === 'en' ? 'Property' : 'Объект'}
          </Text>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={listingId}
              onChange={(event) => changeFilter(setListingId)(event.target.value)}
            >
              <option value="">{lang === 'en' ? 'All properties' : 'Все объекты'}</option>
              {listings.map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {listing.title_ru || listing.title}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>
        <Box minW={{ base: '100%', sm: '160px' }}>
          <Text mb="4px" fontSize="12px" color="fg.muted">
            {lang === 'en' ? 'Status' : 'Статус'}
          </Text>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={status}
              onChange={(event) => changeFilter(setStatus)(event.target.value)}
            >
              <option value="">{lang === 'en' ? 'All statuses' : 'Все статусы'}</option>
              <option value="new">{lang === 'en' ? 'New' : 'Новые'}</option>
              <option value="processed">{lang === 'en' ? 'Processed' : 'Обработанные'}</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>
        <Box minW={{ base: '100%', sm: '190px' }}>
          <Text mb="4px" fontSize="12px" color="fg.muted">
            {lang === 'en' ? 'Type' : 'Тип'}
          </Text>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={type}
              onChange={(event) => changeFilter(setType)(event.target.value)}
            >
              <option value="">{lang === 'en' ? 'All types' : 'Все типы'}</option>
              {Object.entries(MESSAGE_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label[lang]}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>
        <Box minW={{ base: '100%', sm: '180px' }}>
          <Text mb="4px" fontSize="12px" color="fg.muted">
            {lang === 'en' ? 'Sort by creation date' : 'Дата создания'}
          </Text>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={sort}
              onChange={(event) =>
                changeFilter((value) => setSort(value as 'desc' | 'asc'))(event.target.value)
              }
            >
              <option value="desc">{lang === 'en' ? 'Newest first' : 'Сначала новые'}</option>
              <option value="asc">{lang === 'en' ? 'Oldest first' : 'Сначала старые'}</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>
      </Flex>
      {messages.isLoading ? (
        <Text color="fg.muted">{lang === 'en' ? 'Loading messages…' : 'Загружаем сообщения…'}</Text>
      ) : messages.isError ? (
        <Text role="alert" color="red.600">
          {lang === 'en' ? 'Could not load messages.' : 'Не удалось загрузить сообщения.'}
        </Text>
      ) : page?.items.length ? (
        <>
          <HotelierMobileList>
            {page.items.map((message) => {
              const listing = listings.find((item) => item.id === message.listing_id);
              const listingTitle = listing
                ? lang === 'en'
                  ? listing.title || listing.title_ru
                  : listing.title_ru || listing.title
                : message.listing_title ||
                  (message.listing_id
                    ? titleFor(message.listing_id)
                    : lang === 'en'
                      ? 'All properties'
                      : 'Все объекты');
              return (
                <HotelierMobileCard key={message.id}>
                  <Flex align="flex-start" justify="space-between" gap="10px">
                    <Stack gap="4px" minW="0">
                      <Text fontSize="12px" fontWeight="600" color="gray.600">
                        {MESSAGE_TYPES[message.message_type][lang]}
                      </Text>
                      {message.listing_id ? (
                        <Link href={`/listings/${encodeURIComponent(message.listing_id)}`}>
                          <Text
                            fontSize="16px"
                            fontWeight="600"
                            color="blue.700"
                            lineHeight="1.3"
                            overflowWrap="anywhere"
                          >
                            {listingTitle}
                          </Text>
                        </Link>
                      ) : (
                        <Text fontSize="16px" fontWeight="600" overflowWrap="anywhere">
                          {listingTitle}
                        </Text>
                      )}
                    </Stack>
                    <Box flexShrink="0">
                      <StatusBadge tone={message.status === 'new' ? 'waiting' : 'done'}>
                        {message.status === 'new'
                          ? lang === 'en'
                            ? 'New'
                            : 'Новое'
                          : lang === 'en'
                            ? 'Processed'
                            : 'Обработано'}
                      </StatusBadge>
                    </Box>
                  </Flex>
                  <HotelierMobileField label={lang === 'en' ? 'Sender' : 'Отправитель'}>
                    {message.sender_name ||
                      message.sender_email ||
                      SENDER_TYPES[message.sender_type][lang]}
                  </HotelierMobileField>
                  <Text fontSize="14px" lineClamp={3} whiteSpace="pre-wrap" overflowWrap="anywhere">
                    {message.message_text}
                  </Text>
                  <Text fontSize="12px" color="gray.600">
                    {lang === 'en' ? 'Received' : 'Получено'}:{' '}
                    {new Date(message.created_at).toLocaleString(lang === 'en' ? 'en-GB' : 'ru-RU')}
                  </Text>
                  <Button
                    type="button"
                    appearance="soft"
                    minH="44px"
                    w="100%"
                    onClick={() => setMessageId(message.id)}
                  >
                    {lang === 'en' ? 'Open record' : 'Открыть запись'}
                  </Button>
                </HotelierMobileCard>
              );
            })}
          </HotelierMobileList>
          <Box display={{ base: 'none', lg: 'block' }}>
            <HotelierTable>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>
                    {lang === 'en' ? 'Created' : 'Дата создания'}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader w="190px" minW="190px">
                    {lang === 'en' ? 'Property' : 'Объект'}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>
                    {lang === 'en' ? 'Record type' : 'Тип записи'}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>
                    {lang === 'en' ? 'Sender' : 'Отправитель'}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Message' : 'Сообщение'}</Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Status' : 'Статус'}</Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Actions' : 'Действия'}</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {page.items.map((message) => {
                  const listing = listings.find((item) => item.id === message.listing_id);
                  const listingTitle = listing
                    ? lang === 'en'
                      ? listing.title || listing.title_ru
                      : listing.title_ru || listing.title
                    : message.listing_title ||
                      (message.listing_id
                        ? titleFor(message.listing_id)
                        : lang === 'en'
                          ? 'All properties'
                          : 'Все объекты');
                  const listingHref = message.listing_id
                    ? `/listings/${encodeURIComponent(message.listing_id)}`
                    : undefined;

                  return (
                    <Table.Row key={message.id}>
                      <Table.Cell>
                        {new Date(message.created_at).toLocaleDateString(
                          lang === 'en' ? 'en-GB' : 'ru-RU'
                        )}
                        <Text fontSize="11px" color="fg.muted">
                          {new Date(message.created_at).toLocaleTimeString(
                            lang === 'en' ? 'en-GB' : 'ru-RU',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </Text>
                      </Table.Cell>
                      <Table.Cell minW="190px">
                        <Flex align="center" gap="9px" minW="0" w="100%">
                          {listing?.main_picture && listingHref && (
                            <Link
                              href={listingHref}
                              aria-label={`${lang === 'en' ? 'Open property' : 'Открыть объект'} ${listingTitle}`}
                              style={{ flexShrink: 0 }}
                            >
                              <Image
                                src={listing.main_picture}
                                alt={listingTitle ?? ''}
                                w="56px"
                                h="42px"
                                objectFit="cover"
                                borderRadius="6px"
                              />
                            </Link>
                          )}
                          {listingHref ? (
                            <Link
                              href={listingHref}
                              style={{ display: 'block', flex: 1, minWidth: 0 }}
                            >
                              <Text
                                fontWeight="600"
                                lineClamp={2}
                                minW="0"
                                color="blue.700"
                                _hover={{ textDecoration: 'underline' }}
                              >
                                {listingTitle}
                              </Text>
                            </Link>
                          ) : (
                            <Text lineClamp={2}>{listingTitle}</Text>
                          )}
                        </Flex>
                      </Table.Cell>
                      <Table.Cell>{MESSAGE_TYPES[message.message_type][lang]}</Table.Cell>
                      <Table.Cell>
                        {message.sender_name ||
                          message.sender_email ||
                          SENDER_TYPES[message.sender_type][lang]}
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="13px" lineClamp={2}>
                          {message.message_text}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <StatusBadge tone={message.status === 'new' ? 'waiting' : 'done'}>
                          {message.status === 'new'
                            ? lang === 'en'
                              ? 'New'
                              : 'Новое'
                            : lang === 'en'
                              ? 'Processed'
                              : 'Обработано'}
                        </StatusBadge>
                      </Table.Cell>
                      <Table.Cell>
                        <HotelierTableAction
                          type="button"
                          appearance="soft"
                          onClick={() => setMessageId(message.id)}
                        >
                          {lang === 'en' ? 'Open record' : 'Открыть запись'}
                        </HotelierTableAction>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </HotelierTable>
          </Box>
        </>
      ) : (
        <Text color="fg.muted">
          {lang === 'en' ? 'No records match these filters.' : 'Записей по выбранным условиям нет.'}
        </Text>
      )}
      {page && page.meta.total > 0 && (
        <Pagination
          lang={lang}
          total={page.meta.total}
          limit={PAGE_SIZE}
          offset={offset}
          onOffsetChange={setOffset}
        />
      )}
      {messageId && (
        <MessageDetails
          id={messageId}
          titleFor={titleFor}
          lang={lang}
          onClose={() => setMessageId(undefined)}
        />
      )}
    </Stack>
  );
};
