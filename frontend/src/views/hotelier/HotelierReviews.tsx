'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Box,
  Dialog,
  Flex,
  Grid,
  NativeSelect,
  Portal,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react';
import { Input } from '@/shared/input';
import { Button } from '@/shared/button';
import { IconButton } from '@/shared/icon-button/IconButton';
import { CloseIcon, StarIcon } from '@/shared/icons';
import {
  useGetHotelierReviewsQuery,
  type HotelierListing,
  type ListingReview,
  type ReviewStatus,
} from '@/lib/api';
import { Pagination } from '@/shared/pagination';
import { StatusBadge, type StatusTone } from '@/shared/status-badge';
import { HotelierTable, HotelierTableAction } from './HotelierTable';
import { HotelierMobileCard, HotelierMobileField, HotelierMobileList } from './HotelierMobileCards';

const PAGE_SIZE = 20;
const formatDateFilterValue = (value: string, lang: 'ru' | 'en') => {
  const [year, month, day] = value.split('-');
  return lang === 'ru' ? `${day}.${month}.${year}` : `${month}/${day}/${year}`;
};
const parseDateFilterValue = (value: string, lang: 'ru' | 'en') => {
  const match =
    lang === 'ru'
      ? /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim())
      : /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) {
    return undefined;
  }
  const [, first, second, yearText] = match;
  const day = Number(lang === 'ru' ? first : second);
  const month = Number(lang === 'ru' ? second : first);
  const year = Number(yearText);
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > maxDay) {
    return undefined;
  }
  return `${yearText}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const REVIEW_STATUSES: Record<ReviewStatus, { ru: string; en: string; tone: StatusTone }> = {
  draft: { ru: 'Черновик', en: 'Draft', tone: 'waiting' },
  pending_moderation: { ru: 'На модерации', en: 'Pending moderation', tone: 'waiting' },
  approved: { ru: 'Опубликован', en: 'Published', tone: 'done' },
  rejected: { ru: 'Отклонен', en: 'Rejected', tone: 'canceled' },
};

const ReviewRating = ({ label, value }: { label: string; value: number }) => (
  <Stack gap="6px" minW="0">
    <Flex align="baseline" justify="space-between" gap="8px">
      <Text fontSize="14px" color="gray.700">
        {label}
      </Text>
      <Text fontSize="14px" fontWeight="700" fontVariantNumeric="tabular-nums">
        {value}
      </Text>
    </Flex>
    <Box h="5px" bg="gray.100" borderRadius="full" overflow="hidden" aria-hidden="true">
      <Box
        h="100%"
        w={`${Math.max(0, Math.min(value, 10)) * 10}%`}
        bg="blue.600"
        borderRadius="full"
      />
    </Box>
  </Stack>
);

const ReviewDetails = ({
  review,
  onClose,
  lang,
}: {
  review: ListingReview;
  onClose: () => void;
  lang: 'ru' | 'en';
}) => {
  const t = (ru: string, en: string) => (lang === 'en' ? en : ru);
  const propertyName =
    (lang === 'en' ? review.listing_title : review.listing_title_ru || review.listing_title) ||
    t('Объект', 'Property');
  const reviewer = review.client_name || review.reviewer_display_name || t('Гость', 'Guest');
  const source = review.is_imported
    ? review.external_source || t('Внешняя система', 'External system')
    : t('Клиент сайта', 'Website client');
  const ratings = [
    { label: t('Чистота', 'Cleanliness'), value: review.cleanliness_rating },
    { label: t('Персонал', 'Staff'), value: review.staff_rating },
    { label: t('Комфорт', 'Comfort'), value: review.comfort_rating },
    { label: t('Расположение', 'Location'), value: review.location_rating },
    { label: t('Качество сна', 'Sleep quality'), value: review.sleep_rating },
    { label: t('Ванная', 'Bathroom'), value: review.bathroom_rating },
    { label: 'Wi-Fi', value: review.wifi_rating },
  ].filter((item): item is { label: string; value: number } => typeof item.value === 'number');
  const stay =
    review.stay_check_in_date && review.stay_check_out_date
      ? `${new Date(review.stay_check_in_date).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ru-RU')} — ${new Date(review.stay_check_out_date).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ru-RU')}`
      : '—';

  return (
    <Dialog.Root open onOpenChange={({ open }) => !open && onClose()} placement="center">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner p={{ base: '12px', md: '24px' }}>
          <Dialog.Content
            w="720px"
            maxW="100%"
            maxH={{ base: 'calc(100dvh - 24px)', md: 'calc(100dvh - 48px)' }}
            overflowY="auto"
            borderRadius="16px"
            bg="white"
          >
            <Box
              position="sticky"
              top="0"
              zIndex="1"
              bg="white"
              px={{ base: '18px', md: '28px' }}
              pt={{ base: '18px', md: '24px' }}
              pb="16px"
              borderBottom="1px solid"
              borderColor="gray.100"
            >
              <Flex align="flex-start" justify="space-between" gap="12px" pr="44px">
                <Stack gap="7px" minW="0">
                  <Dialog.Title
                    fontSize={{ base: '21px', md: '24px' }}
                    lineHeight="1.2"
                    fontWeight="700"
                  >
                    {t('Отзыв гостя', 'Guest review')}
                  </Dialog.Title>
                  <Link href={`/listings/${encodeURIComponent(review.listing_id)}`}>
                    <Text
                      color="blue.700"
                      fontSize="14px"
                      fontWeight="600"
                      overflowWrap="anywhere"
                      _hover={{ textDecoration: 'underline' }}
                    >
                      {propertyName}
                    </Text>
                  </Link>
                </Stack>
                <Box flexShrink="0" display={{ base: 'none', sm: 'block' }}>
                  <StatusBadge tone={REVIEW_STATUSES[review.status]?.tone ?? 'waiting'}>
                    {REVIEW_STATUSES[review.status]?.[lang] ?? review.status}
                  </StatusBadge>
                </Box>
              </Flex>
              <Box display={{ base: 'block', sm: 'none' }} mt="10px">
                <StatusBadge tone={REVIEW_STATUSES[review.status]?.tone ?? 'waiting'}>
                  {REVIEW_STATUSES[review.status]?.[lang] ?? review.status}
                </StatusBadge>
              </Box>
              <Dialog.CloseTrigger asChild>
                <IconButton
                  label={t('Закрыть отзыв', 'Close review')}
                  position="absolute"
                  top={{ base: '12px', md: '18px' }}
                  right={{ base: '12px', md: '18px' }}
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  w="40px"
                  h="40px"
                  borderRadius="8px"
                  color="gray.600"
                  _hover={{ bg: 'gray.100' }}
                >
                  <CloseIcon size={20} />
                </IconButton>
              </Dialog.CloseTrigger>
            </Box>

            <Dialog.Body px={{ base: '18px', md: '28px' }} py={{ base: '20px', md: '24px' }}>
              <Stack gap="24px">
                <Flex
                  align={{ base: 'flex-start', sm: 'center' }}
                  justify="space-between"
                  gap="16px"
                  wrap="wrap"
                >
                  <Stack gap="3px">
                    <Text fontSize="16px" fontWeight="600">
                      {reviewer}
                    </Text>
                    <Text fontSize="13px" color="gray.600">
                      {source} ·{' '}
                      {new Date(review.created_at).toLocaleString(
                        lang === 'en' ? 'en-GB' : 'ru-RU'
                      )}
                    </Text>
                  </Stack>
                  <Flex align="center" gap="9px" color="blue.700">
                    {review.overall_rating !== null && <StarIcon size={24} />}
                    <Text
                      fontSize="32px"
                      lineHeight="1"
                      fontWeight="700"
                      fontVariantNumeric="tabular-nums"
                    >
                      {review.overall_rating ?? '—'}
                    </Text>
                    {review.overall_rating !== null && (
                      <Text fontSize="14px" color="gray.600" alignSelf="flex-end">
                        / 10
                      </Text>
                    )}
                  </Flex>
                </Flex>

                <Box borderTop="1px solid" borderColor="gray.200" pt="20px">
                  <Text fontSize="16px" fontWeight="700" mb="14px">
                    {t('Комментарий', 'Review')}
                  </Text>
                  {review.positive_review || review.negative_review ? (
                    <Stack gap="18px">
                      {review.positive_review && (
                        <Stack gap="5px">
                          <Text fontSize="12px" fontWeight="700" color="green.700">
                            {t('ПОНРАВИЛОСЬ', 'LIKED')}
                          </Text>
                          <Text
                            fontSize="15px"
                            lineHeight="1.6"
                            whiteSpace="pre-wrap"
                            overflowWrap="anywhere"
                          >
                            {review.positive_review}
                          </Text>
                        </Stack>
                      )}
                      {review.negative_review && (
                        <Stack gap="5px">
                          <Text fontSize="12px" fontWeight="700" color="gray.600">
                            {t('НЕ ПОНРАВИЛОСЬ', 'DISLIKED')}
                          </Text>
                          <Text
                            fontSize="15px"
                            lineHeight="1.6"
                            whiteSpace="pre-wrap"
                            overflowWrap="anywhere"
                          >
                            {review.negative_review}
                          </Text>
                        </Stack>
                      )}
                    </Stack>
                  ) : (
                    <Text color="gray.600" fontSize="14px">
                      {t('Гость не оставил комментарий.', 'The guest did not leave a comment.')}
                    </Text>
                  )}
                </Box>

                <Box borderTop="1px solid" borderColor="gray.200" pt="20px">
                  <Text fontSize="16px" fontWeight="700" mb="16px">
                    {t('Оценки по категориям', 'Category ratings')}
                  </Text>
                  {ratings.length ? (
                    <Grid
                      templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }}
                      columnGap="28px"
                      rowGap="18px"
                    >
                      {ratings.map((item) => (
                        <ReviewRating key={item.label} label={item.label} value={item.value} />
                      ))}
                    </Grid>
                  ) : (
                    <Text color="gray.600" fontSize="14px">
                      {t('Оценки по категориям не указаны.', 'No category ratings were provided.')}
                    </Text>
                  )}
                </Box>

                <Box borderTop="1px solid" borderColor="gray.200" pt="20px">
                  <Text fontSize="16px" fontWeight="700" mb="14px">
                    {t('Детали поездки', 'Stay details')}
                  </Text>
                  <Grid
                    templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }}
                    gap="16px"
                  >
                    <Stack gap="3px">
                      <Text fontSize="12px" color="gray.600">
                        {t('Проживание', 'Stay')}
                      </Text>
                      <Text fontSize="14px">{stay}</Text>
                    </Stack>
                    <Stack gap="3px">
                      <Text fontSize="12px" color="gray.600">
                        {t('Ночей', 'Nights')}
                      </Text>
                      <Text fontSize="14px">{review.nights ?? '—'}</Text>
                    </Stack>
                    <Stack gap="3px">
                      <Text fontSize="12px" color="gray.600">
                        {t('Цель поездки', 'Trip purpose')}
                      </Text>
                      <Text fontSize="14px" overflowWrap="anywhere">
                        {review.trip_purpose || '—'}
                      </Text>
                    </Stack>
                    <Stack gap="3px">
                      <Text fontSize="12px" color="gray.600">
                        {t('Тип компании', 'Party type')}
                      </Text>
                      <Text fontSize="14px" overflowWrap="anywhere">
                        {review.party_type || '—'}
                      </Text>
                    </Stack>
                  </Grid>
                </Box>
                {review.rejection_reason && (
                  <Box borderTop="1px solid" borderColor="gray.200" pt="20px">
                    <Text fontSize="14px" fontWeight="700" mb="5px">
                      {t('Причина отклонения', 'Reason for rejection')}
                    </Text>
                    <Text fontSize="14px" whiteSpace="pre-wrap" overflowWrap="anywhere">
                      {review.rejection_reason}
                    </Text>
                  </Box>
                )}
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export const HotelierReviews = ({
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
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [createdFromInput, setCreatedFromInput] = useState('');
  const [createdToInput, setCreatedToInput] = useState('');
  const [dateInputError, setDateInputError] = useState<'from' | 'to' | undefined>();
  const [sort, setSort] = useState('created_at:desc');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<ListingReview>();
  const reviews = useGetHotelierReviewsQuery({
    limit: PAGE_SIZE,
    offset,
    listing_id: listingId || undefined,
    status: (status || undefined) as ReviewStatus | undefined,
    created_from: createdFrom || undefined,
    created_to: createdTo || undefined,
    sort_by: sort.split(':')[0] as 'created_at' | 'overall_rating',
    sort_order: sort.split(':')[1] as 'asc' | 'desc',
  });

  const changeFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setOffset(0);
  };
  const applyDateInput = (which: 'from' | 'to') => {
    const rawValue = which === 'from' ? createdFromInput : createdToInput;
    const setValue = which === 'from' ? setCreatedFrom : setCreatedTo;
    const setInput = which === 'from' ? setCreatedFromInput : setCreatedToInput;
    if (!rawValue.trim()) {
      changeFilter(setValue)('');
      setDateInputError(undefined);
      return;
    }
    const parsed = parseDateFilterValue(rawValue, lang);
    if (
      !parsed ||
      (which === 'from' && createdTo && parsed > createdTo) ||
      (which === 'to' && createdFrom && parsed < createdFrom)
    ) {
      setDateInputError(which);
      return;
    }
    changeFilter(setValue)(parsed);
    setInput(formatDateFilterValue(parsed, lang));
    setDateInputError(undefined);
  };
  const page = reviews.data;

  return (
    <Stack gap="14px">
      <Text fontSize="14px" color="fg.muted">
        {lang === 'en'
          ? 'Reviews from all your properties are shown here, including website reviews and reviews imported from external systems.'
          : 'Здесь собраны отзывы по всем вашим объектам: отзывы клиентов сайта и загруженные из внешних систем.'}
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
              {Object.entries(REVIEW_STATUSES).map(([value, item]) => (
                <option key={value} value={value}>
                  {item[lang]}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>
        <Box w={{ base: 'calc(50% - 5px)', sm: '140px' }} minW="0" flexShrink={0}>
          <Text mb="4px" fontSize="12px" color="fg.muted">
            {lang === 'en' ? 'Created from' : 'Дата создания с'}
          </Text>
          <Box position="relative">
            <Input
              type="text"
              inputMode="numeric"
              pr="38px"
              placeholder={lang === 'ru' ? 'ДД.ММ.ГГГГ' : 'MM/DD/YYYY'}
              value={createdFromInput}
              aria-invalid={dateInputError === 'from'}
              onChange={(event) => setCreatedFromInput(event.target.value)}
              onBlur={() => applyDateInput('from')}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  applyDateInput('from');
                }
              }}
              aria-label={lang === 'en' ? 'Created from' : 'Дата создания с'}
            />
            <Text
              position="absolute"
              right="11px"
              top="50%"
              transform="translateY(-50%)"
              pointerEvents="none"
              color="fg.muted"
            >
              ▦
            </Text>
            <Input
              type="date"
              lang={lang}
              value={createdFrom}
              max={createdTo || undefined}
              aria-label={lang === 'en' ? 'Choose start date' : 'Выбрать дату начала'}
              position="absolute"
              right="0"
              top="0"
              w="38px"
              h="100%"
              opacity="0"
              cursor="pointer"
              onChange={(event) => {
                const value = event.target.value;
                setCreatedFrom(value);
                setCreatedFromInput(value ? formatDateFilterValue(value, lang) : '');
                setOffset(0);
                setDateInputError(undefined);
              }}
            />
          </Box>
          {dateInputError === 'from' && (
            <Text role="alert" fontSize="11px" color="red.600">
              {lang === 'en'
                ? 'Enter a valid date that is not after the end date.'
                : 'Введите корректную дату не позже даты окончания.'}
            </Text>
          )}
        </Box>
        <Box w={{ base: 'calc(50% - 5px)', sm: '140px' }} minW="0" flexShrink={0}>
          <Text mb="4px" fontSize="12px" color="fg.muted">
            {lang === 'en' ? 'Created to' : 'Дата создания по'}
          </Text>
          <Box position="relative">
            <Input
              type="text"
              inputMode="numeric"
              pr="38px"
              placeholder={lang === 'ru' ? 'ДД.ММ.ГГГГ' : 'MM/DD/YYYY'}
              value={createdToInput}
              aria-invalid={dateInputError === 'to'}
              onChange={(event) => setCreatedToInput(event.target.value)}
              onBlur={() => applyDateInput('to')}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  applyDateInput('to');
                }
              }}
              aria-label={lang === 'en' ? 'Created to' : 'Дата создания по'}
            />
            <Text
              position="absolute"
              right="11px"
              top="50%"
              transform="translateY(-50%)"
              pointerEvents="none"
              color="fg.muted"
            >
              ▦
            </Text>
            <Input
              type="date"
              lang={lang}
              value={createdTo}
              min={createdFrom || undefined}
              aria-label={lang === 'en' ? 'Choose end date' : 'Выбрать дату окончания'}
              position="absolute"
              right="0"
              top="0"
              w="38px"
              h="100%"
              opacity="0"
              cursor="pointer"
              onChange={(event) => {
                const value = event.target.value;
                setCreatedTo(value);
                setCreatedToInput(value ? formatDateFilterValue(value, lang) : '');
                setOffset(0);
                setDateInputError(undefined);
              }}
            />
          </Box>
          {dateInputError === 'to' && (
            <Text role="alert" fontSize="11px" color="red.600">
              {lang === 'en'
                ? 'Enter a valid date that is not before the start date.'
                : 'Введите корректную дату не раньше даты начала.'}
            </Text>
          )}
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
              <option value="overall_rating:desc">
                {lang === 'en' ? 'Highest overall rating first' : 'По общей оценке: выше сначала'}
              </option>
              <option value="overall_rating:asc">
                {lang === 'en' ? 'Lowest overall rating first' : 'По общей оценке: ниже сначала'}
              </option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Box>
      </Flex>
      {reviews.isLoading ? (
        <Text color="fg.muted">{lang === 'en' ? 'Loading reviews…' : 'Загружаем отзывы…'}</Text>
      ) : reviews.isError ? (
        <Text role="alert" color="red.600">
          {lang === 'en' ? 'Could not load reviews.' : 'Не удалось загрузить отзывы.'}
        </Text>
      ) : page?.items.length ? (
        <>
          <HotelierMobileList>
            {page.items.map((review) => (
              <HotelierMobileCard key={review.id}>
                <Flex align="flex-start" justify="space-between" gap="10px">
                  <Stack gap="3px" minW="0">
                    <Link href={`/listings/${encodeURIComponent(review.listing_id)}`}>
                      <Text
                        fontSize="16px"
                        fontWeight="600"
                        color="blue.700"
                        lineHeight="1.3"
                        overflowWrap="anywhere"
                      >
                        {lang === 'en'
                          ? review.listing_title || titleFor(review.listing_id)
                          : titleFor(review.listing_id)}
                      </Text>
                    </Link>
                    <Text fontSize="13px" color="gray.600" overflowWrap="anywhere">
                      {review.client_name ||
                        review.reviewer_display_name ||
                        (lang === 'en' ? 'Guest' : 'Гость')}
                    </Text>
                  </Stack>
                  <Box flexShrink="0">
                    <StatusBadge tone={REVIEW_STATUSES[review.status]?.tone ?? 'waiting'}>
                      {REVIEW_STATUSES[review.status]?.[lang] ?? review.status}
                    </StatusBadge>
                  </Box>
                </Flex>
                <Flex gap="12px" wrap="wrap">
                  <Box flex="1" minW="130px">
                    <HotelierMobileField label={lang === 'en' ? 'Overall rating' : 'Общая оценка'}>
                      <Text fontWeight="600">{review.overall_rating ?? '—'}</Text>
                    </HotelierMobileField>
                  </Box>
                  <Box flex="1" minW="130px">
                    <HotelierMobileField label={lang === 'en' ? 'Source' : 'Источник'}>
                      {review.is_imported
                        ? review.external_source ||
                          (lang === 'en' ? 'External system' : 'Внешняя система')
                        : lang === 'en'
                          ? 'Website'
                          : 'Сайт'}
                    </HotelierMobileField>
                  </Box>
                </Flex>
                <Text fontSize="12px" color="gray.600" overflowWrap="anywhere">
                  {lang === 'en' ? 'Cleanliness' : 'Чистота'} {review.cleanliness_rating ?? '—'} ·{' '}
                  {lang === 'en' ? 'Staff' : 'Персонал'} {review.staff_rating ?? '—'} ·{' '}
                  {lang === 'en' ? 'Comfort' : 'Комфорт'} {review.comfort_rating ?? '—'} ·{' '}
                  {lang === 'en' ? 'Location' : 'Расположение'} {review.location_rating ?? '—'}
                </Text>
                {(review.positive_review || review.negative_review) && (
                  <Text fontSize="14px" lineClamp={3} overflowWrap="anywhere">
                    {review.positive_review || review.negative_review}
                  </Text>
                )}
                <Stack gap="2px" fontSize="12px" color="gray.600">
                  {review.stay_check_in_date && review.stay_check_out_date && (
                    <Text>
                      {lang === 'en' ? 'Stay' : 'Проживание'}:{' '}
                      {new Date(review.stay_check_in_date).toLocaleDateString(
                        lang === 'en' ? 'en-GB' : 'ru-RU'
                      )}
                      {' — '}
                      {new Date(review.stay_check_out_date).toLocaleDateString(
                        lang === 'en' ? 'en-GB' : 'ru-RU'
                      )}
                      {review.nights
                        ? ` · ${review.nights} ${lang === 'en' ? 'nights' : 'ноч.'}`
                        : ''}
                    </Text>
                  )}
                  <Text>
                    {lang === 'en' ? 'Created' : 'Создан'}:{' '}
                    {new Date(review.created_at).toLocaleString(lang === 'en' ? 'en-GB' : 'ru-RU')}
                  </Text>
                </Stack>
                <Button
                  type="button"
                  appearance="soft"
                  minH="44px"
                  w="100%"
                  onClick={() => setSelected(review)}
                >
                  {lang === 'en' ? 'Open review' : 'Открыть отзыв'}
                </Button>
              </HotelierMobileCard>
            ))}
          </HotelierMobileList>
          <Box display={{ base: 'none', lg: 'block' }}>
            <HotelierTable>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>{lang === 'en' ? 'Property' : 'Объект'}</Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Author' : 'Автор'}</Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Source' : 'Источник'}</Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Overall' : 'Общая'}</Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Ratings' : 'Оценки'}</Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Stay' : 'Проживание'}</Table.ColumnHeader>
                  <Table.ColumnHeader>
                    {lang === 'en' ? 'Review text' : 'Текст отзыва'}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Created' : 'Создан'}</Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Status' : 'Статус'}</Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Actions' : 'Действия'}</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {page.items.map((review) => (
                  <Table.Row key={review.id}>
                    <Table.Cell>
                      <Link href={`/listings/${encodeURIComponent(review.listing_id)}`}>
                        <Text
                          fontWeight="600"
                          lineClamp={2}
                          color="blue.700"
                          _hover={{ textDecoration: 'underline' }}
                        >
                          {lang === 'en'
                            ? review.listing_title || titleFor(review.listing_id)
                            : titleFor(review.listing_id)}
                        </Text>
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      {review.client_name ||
                        review.reviewer_display_name ||
                        (lang === 'en' ? 'Guest' : 'Гость')}
                    </Table.Cell>
                    <Table.Cell>
                      {review.is_imported
                        ? review.external_source ||
                          (lang === 'en' ? 'External system' : 'Внешняя система')
                        : lang === 'en'
                          ? 'Website'
                          : 'Сайт'}
                    </Table.Cell>
                    <Table.Cell fontWeight="600">{review.overall_rating ?? '—'}</Table.Cell>
                    <Table.Cell>
                      <Text fontSize="12px" color="fg.muted" lineClamp={2}>
                        {lang === 'en' ? 'Cleanliness' : 'Чистота'}{' '}
                        {review.cleanliness_rating ?? '—'} · {lang === 'en' ? 'Staff' : 'Персонал'}{' '}
                        {review.staff_rating ?? '—'}
                        {' · '}
                        {lang === 'en' ? 'Comfort' : 'Комфорт'} {review.comfort_rating ?? '—'} ·{' '}
                        {lang === 'en' ? 'Location' : 'Расположение'}{' '}
                        {review.location_rating ?? '—'}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      {review.stay_check_in_date && review.stay_check_out_date ? (
                        <>
                          {new Date(review.stay_check_in_date).toLocaleDateString(
                            lang === 'en' ? 'en-GB' : 'ru-RU'
                          )}{' '}
                          —{' '}
                          {new Date(review.stay_check_out_date).toLocaleDateString(
                            lang === 'en' ? 'en-GB' : 'ru-RU'
                          )}
                          {review.nights ? (
                            <Text fontSize="12px" color="fg.muted">
                              {lang === 'en' ? `${review.nights} nights` : `${review.nights} ноч.`}
                            </Text>
                          ) : null}
                        </>
                      ) : (
                        '—'
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Text lineClamp={2} fontSize="13px">
                        {review.positive_review || review.negative_review || '—'}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      {new Date(review.created_at).toLocaleDateString(
                        lang === 'en' ? 'en-GB' : 'ru-RU'
                      )}
                      <Text fontSize="11px" color="fg.muted">
                        {new Date(review.created_at).toLocaleTimeString(
                          lang === 'en' ? 'en-GB' : 'ru-RU',
                          {
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge tone={REVIEW_STATUSES[review.status]?.tone ?? 'waiting'}>
                        {REVIEW_STATUSES[review.status]?.[lang] ?? review.status}
                      </StatusBadge>
                    </Table.Cell>
                    <Table.Cell>
                      <HotelierTableAction
                        type="button"
                        appearance="soft"
                        onClick={() => setSelected(review)}
                      >
                        {lang === 'en' ? 'Open' : 'Открыть'}
                      </HotelierTableAction>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </HotelierTable>
          </Box>
        </>
      ) : (
        <Text color="fg.muted">
          {lang === 'en' ? 'No reviews match these filters.' : 'Отзывов по выбранным условиям нет.'}
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
        <ReviewDetails review={selected} lang={lang} onClose={() => setSelected(undefined)} />
      )}
    </Stack>
  );
};
