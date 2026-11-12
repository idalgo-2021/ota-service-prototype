'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Box, Flex, NativeSelect, Stack, Table, Text } from '@chakra-ui/react';
import {
  getErrorMessage,
  useGetHotelierBookingsQuery,
  useHotelierBookingActionMutation,
  type Booking,
  type BookingStatus,
  type HotelierListing,
} from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { Button } from '@/shared/button';
import { CancelDialog } from '@/shared/cancel-dialog';
import { Pagination } from '@/shared/pagination';
import { StatusBadge, type StatusTone } from '@/shared/status-badge';
import { DetailsDialog, DetailRow } from '../admin/DetailsDialog';
import { HotelierTable, HotelierTableAction } from './HotelierTable';
import { HotelierMobileCard, HotelierMobileField, HotelierMobileList } from './HotelierMobileCards';

const PAGE_SIZE = 20;
const STATUS_META: Record<BookingStatus, { ru: string; en: string; tone: StatusTone }> = {
  confirmed: { ru: 'Ожидает заезда', en: 'Awaiting check-in', tone: 'waiting' },
  checked_in: { ru: 'Проживает', en: 'Checked in', tone: 'active' },
  completed: { ru: 'Завершена', en: 'Completed', tone: 'done' },
  canceled: { ru: 'Отменена', en: 'Cancelled', tone: 'canceled' },
};

const BookingRow = ({
  booking,
  titleFor,
  onOpen,
  onCheckIn,
  onCheckOut,
  onCancel,
  busy,
  lang,
}: {
  booking: Booking;
  titleFor: (id: string) => string;
  onOpen: () => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onCancel: () => void;
  busy: boolean;
  lang: 'ru' | 'en';
}) => (
  <Table.Row>
    <Table.Cell>
      <Link href={`/listings/${encodeURIComponent(booking.listing_id)}`}>
        <Text fontWeight="600" color="blue.700" _hover={{ textDecoration: 'underline' }}>
          {titleFor(booking.listing_id)}
        </Text>
      </Link>
      <Text mt="3px" fontSize="12px" color="fg.muted">
        #{booking.id.slice(0, 8)}
      </Text>
    </Table.Cell>
    <Table.Cell>
      <Text>{booking.client_name || (lang === 'en' ? 'Guest' : 'Гость')}</Text>
      {booking.client_email && (
        <Text fontSize="12px" color="fg.muted">
          {booking.client_email}
        </Text>
      )}
    </Table.Cell>
    <Table.Cell>
      {new Date(`${booking.check_in_date}T00:00:00`).toLocaleDateString(
        lang === 'en' ? 'en-GB' : 'ru-RU'
      )}{' '}
      —{' '}
      {new Date(`${booking.check_out_date}T00:00:00`).toLocaleDateString(
        lang === 'en' ? 'en-GB' : 'ru-RU'
      )}
    </Table.Cell>
    <Table.Cell whiteSpace="nowrap">
      {lang === 'en'
        ? `${booking.adults_count} adults, ${booking.children_count} children`
        : `${booking.adults_count} взр., ${booking.children_count} дет.`}
      {booking.has_pets && (
        <Text fontSize="12px" color="fg.muted">
          {lang === 'en' ? 'With pet' : 'С питомцем'}
        </Text>
      )}
    </Table.Cell>
    <Table.Cell>{formatMoney(booking.total, booking.currency)}</Table.Cell>
    <Table.Cell>
      {new Date(booking.created_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ru-RU')}
      <Text fontSize="11px" color="fg.muted">
        {new Date(booking.created_at).toLocaleTimeString(lang === 'en' ? 'en-GB' : 'ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </Table.Cell>
    <Table.Cell>
      <StatusBadge tone={STATUS_META[booking.status].tone}>
        {STATUS_META[booking.status][lang]}
      </StatusBadge>
    </Table.Cell>
    <Table.Cell>
      <Flex gap="5px" wrap="wrap" minW="0">
        <HotelierTableAction type="button" appearance="soft" onClick={onOpen}>
          {lang === 'en' ? 'Open' : 'Открыть'}
        </HotelierTableAction>
        {booking.status === 'confirmed' && (
          <>
            <HotelierTableAction type="button" onClick={onCheckIn} loading={busy}>
              {lang === 'en' ? 'Check in' : 'Заселить'}
            </HotelierTableAction>
            <HotelierTableAction type="button" appearance="soft" onClick={onCancel} disabled={busy}>
              {lang === 'en' ? 'Cancel' : 'Отменить'}
            </HotelierTableAction>
          </>
        )}
        {booking.status === 'checked_in' && (
          <HotelierTableAction type="button" onClick={onCheckOut} loading={busy}>
            {lang === 'en' ? 'Complete' : 'Завершить'}
          </HotelierTableAction>
        )}
      </Flex>
    </Table.Cell>
  </Table.Row>
);

const BookingCard = ({
  booking,
  titleFor,
  onOpen,
  onCheckIn,
  onCheckOut,
  onCancel,
  busy,
  lang,
}: {
  booking: Booking;
  titleFor: (id: string) => string;
  onOpen: () => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onCancel: () => void;
  busy: boolean;
  lang: 'ru' | 'en';
}) => (
  <HotelierMobileCard>
    <Flex align="flex-start" justify="space-between" gap="10px">
      <Stack gap="3px" minW="0">
        <Link href={`/listings/${encodeURIComponent(booking.listing_id)}`}>
          <Text
            fontSize="16px"
            fontWeight="600"
            color="blue.700"
            lineHeight="1.3"
            overflowWrap="anywhere"
          >
            {titleFor(booking.listing_id)}
          </Text>
        </Link>
        <Text fontSize="12px" color="gray.600">
          #{booking.id.slice(0, 8)}
        </Text>
      </Stack>
      <Box flexShrink="0">
        <StatusBadge tone={STATUS_META[booking.status].tone}>
          {STATUS_META[booking.status][lang]}
        </StatusBadge>
      </Box>
    </Flex>
    <Flex gap="12px" wrap="wrap">
      <Box flex="1" minW="130px">
        <HotelierMobileField label={lang === 'en' ? 'Guest' : 'Гость'}>
          {booking.client_name || (lang === 'en' ? 'Guest' : 'Гость')}
          {booking.client_email && (
            <Text fontSize="12px" color="gray.600">
              {booking.client_email}
            </Text>
          )}
        </HotelierMobileField>
      </Box>
      <Box flex="1" minW="130px">
        <HotelierMobileField label={lang === 'en' ? 'Stay dates' : 'Даты проживания'}>
          {new Date(`${booking.check_in_date}T00:00:00`).toLocaleDateString(
            lang === 'en' ? 'en-GB' : 'ru-RU'
          )}
          {' — '}
          {new Date(`${booking.check_out_date}T00:00:00`).toLocaleDateString(
            lang === 'en' ? 'en-GB' : 'ru-RU'
          )}
        </HotelierMobileField>
      </Box>
      <Box flex="1" minW="130px">
        <HotelierMobileField label={lang === 'en' ? 'Guests' : 'Гости'}>
          {lang === 'en'
            ? `${booking.adults_count} adults, ${booking.children_count} children`
            : `${booking.adults_count} взр., ${booking.children_count} дет.`}
          {booking.has_pets && (
            <Text fontSize="12px" color="gray.600">
              {lang === 'en' ? 'With pet' : 'С питомцем'}
            </Text>
          )}
        </HotelierMobileField>
      </Box>
      <Box flex="1" minW="130px">
        <HotelierMobileField label={lang === 'en' ? 'Total' : 'Сумма'}>
          <Text fontWeight="600">{formatMoney(booking.total, booking.currency)}</Text>
        </HotelierMobileField>
      </Box>
    </Flex>
    <Text fontSize="12px" color="gray.600">
      {lang === 'en' ? 'Created' : 'Создана'}:{' '}
      {new Date(booking.created_at).toLocaleString(lang === 'en' ? 'en-GB' : 'ru-RU')}
    </Text>
    <Flex gap="8px" wrap="wrap">
      <Button type="button" appearance="soft" minH="44px" flex="1" onClick={onOpen}>
        {lang === 'en' ? 'Open' : 'Открыть'}
      </Button>
      {booking.status === 'confirmed' && (
        <>
          <Button type="button" minH="44px" flex="1" onClick={onCheckIn} loading={busy}>
            {lang === 'en' ? 'Check in' : 'Заселить'}
          </Button>
          <Button
            type="button"
            appearance="soft"
            minH="44px"
            flex="1"
            onClick={onCancel}
            disabled={busy}
          >
            {lang === 'en' ? 'Cancel' : 'Отменить'}
          </Button>
        </>
      )}
      {booking.status === 'checked_in' && (
        <Button type="button" minH="44px" flex="1" onClick={onCheckOut} loading={busy}>
          {lang === 'en' ? 'Complete' : 'Завершить'}
        </Button>
      )}
    </Flex>
  </HotelierMobileCard>
);

const BookingDetails = ({
  booking,
  onClose,
  lang,
}: {
  booking: Booking;
  onClose: () => void;
  lang: 'ru' | 'en';
}) => (
  <DetailsDialog title={`${lang === 'en' ? 'Booking' : 'Бронь'} ${booking.id}`} onClose={onClose}>
    <Stack gap="0">
      <DetailRow
        label={lang === 'en' ? 'Property' : 'Объект'}
        value={
          lang === 'en'
            ? booking.listing_title || booking.listing_title_ru
            : booking.listing_title_ru || booking.listing_title
        }
      />
      <DetailRow
        label={lang === 'en' ? 'Guest' : 'Гость'}
        value={booking.client_name || booking.client_email}
      />
      <DetailRow label={lang === 'en' ? 'Email' : 'Почта'} value={booking.client_email} />
      <DetailRow
        label={lang === 'en' ? 'Stay' : 'Проживание'}
        value={`${booking.check_in_date} — ${booking.check_out_date}`}
      />
      <DetailRow
        label={lang === 'en' ? 'Guests' : 'Гости'}
        value={
          lang === 'en'
            ? `${booking.adults_count} adults, ${booking.children_count} children, pets: ${booking.has_pets ? 'yes' : 'no'}`
            : `${booking.adults_count} взр., ${booking.children_count} дет., питомцы: ${booking.has_pets ? 'да' : 'нет'}`
        }
      />
      <DetailRow
        label={lang === 'en' ? 'Rooms and beds' : 'Номера и места'}
        value={booking.units?.map((unit) => unit.name_ru || unit.name).join(', ')}
      />
      <DetailRow
        label={lang === 'en' ? 'Total' : 'Сумма'}
        value={formatMoney(booking.total, booking.currency)}
      />
      <DetailRow
        label={lang === 'en' ? 'Status' : 'Статус'}
        value={STATUS_META[booking.status][lang]}
      />
      <DetailRow
        label={lang === 'en' ? 'Cancellation reason' : 'Причина отмены'}
        value={booking.cancellation_reason}
      />
      <DetailRow
        label={lang === 'en' ? 'Created' : 'Создана'}
        value={new Date(booking.created_at).toLocaleString(lang === 'en' ? 'en-GB' : 'ru-RU')}
      />
    </Stack>
  </DetailsDialog>
);

export const HotelierBookings = ({
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
  const [sort, setSort] = useState('created_at:desc');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Booking>();
  const [cancelTarget, setCancelTarget] = useState<Booking>();
  const bookings = useGetHotelierBookingsQuery({
    limit: PAGE_SIZE,
    offset,
    listing_id: listingId || undefined,
    status: (status || undefined) as BookingStatus | undefined,
    sort_by: 'created_at',
    sort_order: sort.split(':')[1] as 'asc' | 'desc',
  });
  const [act, actState] = useHotelierBookingActionMutation();

  const changeFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setOffset(0);
  };

  const runAction = async (booking: Booking, action: 'check-in' | 'check-out', reason?: string) => {
    await act({ id: booking.id, action, reason });
  };

  const actionError = actState.isError
    ? (getErrorMessage(actState.error) ??
      (lang === 'en' ? 'Could not update booking.' : 'Не удалось обновить бронь.'))
    : undefined;
  const page = bookings.data;

  return (
    <Stack gap="14px">
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
              {Object.entries(STATUS_META).map(([value, item]) => (
                <option key={value} value={value}>
                  {item[lang]}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>
        <Box minW={{ base: '100%', sm: '190px' }}>
          <Text mb="4px" fontSize="12px" color="fg.muted">
            {lang === 'en' ? 'Sort' : 'Сортировка'}
          </Text>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={sort}
              onChange={(event) => changeFilter(setSort)(event.target.value)}
            >
              <option value="created_at:desc">
                {lang === 'en' ? 'Newest first' : 'Сначала новые'}
              </option>
              <option value="created_at:asc">
                {lang === 'en' ? 'Oldest first' : 'Сначала старые'}
              </option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>
      </Flex>
      {actionError && (
        <Text role="alert" color="red.600">
          {actionError}
        </Text>
      )}
      {bookings.isLoading ? (
        <Text color="fg.muted">{lang === 'en' ? 'Loading bookings…' : 'Загружаем брони…'}</Text>
      ) : bookings.isError ? (
        <Text role="alert" color="red.600">
          {lang === 'en' ? 'Could not load bookings.' : 'Не удалось загрузить брони.'}
        </Text>
      ) : page?.items.length ? (
        <>
          <HotelierMobileList>
            {page.items.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                titleFor={titleFor}
                onOpen={() => setSelected(booking)}
                onCheckIn={() => void runAction(booking, 'check-in')}
                onCheckOut={() => void runAction(booking, 'check-out')}
                onCancel={() => setCancelTarget(booking)}
                busy={actState.isLoading && actState.originalArgs?.id === booking.id}
                lang={lang}
              />
            ))}
          </HotelierMobileList>
          <Box display={{ base: 'none', lg: 'block' }}>
            <HotelierTable>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>
                    {lang === 'en' ? 'Property and booking' : 'Объект и бронь'}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Guest' : 'Гость'}</Table.ColumnHeader>
                  <Table.ColumnHeader>
                    {lang === 'en' ? 'Stay dates' : 'Даты проживания'}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Guests' : 'Гости'}</Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Total' : 'Сумма'}</Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Created' : 'Создана'}</Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Status' : 'Статус'}</Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Actions' : 'Действия'}</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {page.items.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    titleFor={titleFor}
                    onOpen={() => setSelected(booking)}
                    onCheckIn={() => void runAction(booking, 'check-in')}
                    onCheckOut={() => void runAction(booking, 'check-out')}
                    onCancel={() => setCancelTarget(booking)}
                    busy={actState.isLoading && actState.originalArgs?.id === booking.id}
                    lang={lang}
                  />
                ))}
              </Table.Body>
            </HotelierTable>
          </Box>
        </>
      ) : (
        <Text color="fg.muted">
          {lang === 'en' ? 'No bookings match these filters.' : 'Броней по выбранным условиям нет.'}
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
      {selected && (
        <BookingDetails booking={selected} lang={lang} onClose={() => setSelected(undefined)} />
      )}
      {cancelTarget && (
        <CancelDialog
          lang={lang}
          subject={`${lang === 'en' ? 'booking' : 'бронь'} ${cancelTarget.id.slice(0, 8)}`}
          reasonRequired
          pending={actState.isLoading}
          error={actionError}
          onConfirm={(reason) => {
            void act({ id: cancelTarget.id, action: 'cancel', reason }).then((result) => {
              if ('data' in result) {
                setCancelTarget(undefined);
              }
            });
          }}
          onClose={() => setCancelTarget(undefined)}
        />
      )}
    </Stack>
  );
};
