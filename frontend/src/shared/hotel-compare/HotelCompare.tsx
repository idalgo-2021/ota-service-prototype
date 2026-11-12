'use client';

import { useState } from 'react';
import Link from 'next/link';
import { skipToken } from '@reduxjs/toolkit/query';
import { Dialog, Image, Portal } from '@chakra-ui/react';
import ReactMarkdown from 'react-markdown';
import { useGetDictionariesQuery, type CatalogLanguage, type Listing } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { clearHotelComparison, removeHotelComparison } from '@/lib/hotelCompare';
import { useCompareHotelsQuery } from '@/lib/hotelCompareApi';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { CloseIcon, CompareIcon } from '@/shared/icons';
import headerStyles from '@/shared/header/Header.module.css';
import styles from './HotelCompare.module.css';

type Row = { label: string; value: (hotel: Listing) => string };
const missing = (lang: CatalogLanguage) => (lang === 'en' ? 'No data' : 'Нет данных');
const ratingLabels: Record<string, { ru: string; en: string }> = {
  bathroom_rating: { ru: 'Ванная', en: 'Bathroom' },
  cleanliness_rating: { ru: 'Чистота', en: 'Cleanliness' },
  comfort_rating: { ru: 'Комфорт', en: 'Comfort' },
  location_rating: { ru: 'Расположение', en: 'Location' },
  sleep_rating: { ru: 'Качество сна', en: 'Sleep quality' },
  staff_rating: { ru: 'Персонал', en: 'Staff' },
  wifi_rating: { ru: 'Wi-Fi', en: 'Wi-Fi' },
};

export const HotelCompare = ({ lang }: { lang: CatalogLanguage }) => {
  const [open, setOpen] = useState(false);
  const ids = useAppSelector((state) => state.hotelCompare.ids);
  const dispatch = useAppDispatch();
  const { currentData, isFetching, isError, refetch } = useCompareHotelsQuery(
    open && ids.length ? { ids, lang } : skipToken,
    { refetchOnMountOrArgChange: true }
  );
  const { data: dictionaries } = useGetDictionariesQuery(open ? lang : skipToken);
  const en = lang === 'en';
  const title = en ? 'Compare hotels' : 'Сравнение отелей';
  const hotels = ids.flatMap((id) => currentData?.find((hotel) => hotel.id === id) ?? []);
  const locale = en ? 'en-US' : 'ru-RU';
  const formatRating = (value: number | undefined) =>
    typeof value === 'number' && Number.isFinite(value)
      ? new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)
      : missing(lang);
  const rows: { title: string; items: Row[] }[] = [
    {
      title: en ? 'Stay' : 'Проживание',
      items: [
        {
          label: en ? 'Property type' : 'Тип жилья',
          value: (hotel) =>
            dictionaries?.listing_types.find((type) => type.id === hotel.listing_type_id)?.name ??
            missing(lang),
        },
        {
          label: en ? 'City' : 'Город',
          value: (hotel) =>
            dictionaries?.locations.find((location) => location.id === hotel.location_id)?.name ??
            missing(lang),
        },
        { label: en ? 'Address' : 'Адрес', value: (hotel) => hotel.address || missing(lang) },
        {
          label: en ? 'From city centre' : 'От центра города',
          value: (hotel) =>
            hotel.distance_from_center_km == null
              ? missing(lang)
              : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(hotel.distance_from_center_km)} ${en ? 'km' : 'км'}`,
        },
        {
          label: en ? 'Check-in from' : 'Заезд с',
          value: (hotel) => (hotel.check_in_time ? hotel.check_in_time.slice(0, 5) : missing(lang)),
        },
      ],
    },
    {
      title: en ? 'About the property' : 'Об объекте',
      items: [
        {
          label: en ? 'Description' : 'Описание',
          value: (hotel) => hotel.description || missing(lang),
        },
        {
          label: en ? 'Features' : 'Особенности',
          value: (hotel) => {
            const features = hotel.features ?? [];
            return features.length
              ? features.map((feature) => (en ? feature.name : feature.name_ru)).join(', ')
              : missing(lang);
          },
        },
      ],
    },
  ];
  const ratingKeys = [
    ...new Set(hotels.flatMap((hotel) => Object.keys(hotel.average_rating_details ?? {}))),
  ];
  if (ratingKeys.length) {
    rows.push({
      title: en ? 'Guest ratings' : 'Оценки гостей',
      items: [
        {
          label: en ? 'Overall rating' : 'Общая оценка',
          value: (hotel) => formatRating(hotel.average_overall_rating ?? undefined),
        },
        {
          label: en ? 'Reviews' : 'Отзывов',
          value: (hotel) =>
            hotel.overall_rating_count == null ? missing(lang) : String(hotel.overall_rating_count),
        },
        ...ratingKeys.map((key) => ({
          label: ratingLabels[key]?.[lang] ?? key.replaceAll('_', ' '),
          value: (hotel: Listing) => formatRating(hotel.average_rating_details?.[key]),
        })),
      ],
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(event) => setOpen(event.open)}
      placement="center"
      size="full"
      scrollBehavior="inside"
    >
      {ids.length > 0 && (
        <Dialog.Trigger asChild>
          <button
            type="button"
            className={`${headerStyles.action} ${styles.trigger}`}
            style={{marginRight: 4 }}
            aria-label={`${title}: ${ids.length}`}
            title={title}
          >
            <CompareIcon />
            <span className={styles.triggerText}>{en ? 'Compare' : 'Сравнить'}</span>
            <span className={headerStyles.badge}>{ids.length}</span>
          </button>
        </Dialog.Trigger>
      )}
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner className={styles.positioner}>
          <Dialog.Content className={styles.dialog}>
            <Dialog.Header className={styles.header}>
              <Dialog.Title className={styles.title}>{title}</Dialog.Title>
              <p className={styles.subtitle}>
                {en ? `${ids.length} selected` : `Выбрано: ${ids.length}`}
                <span aria-hidden="true"> · </span>
                <Link href="/search" onClick={() => setOpen(false)}>
                  {en ? 'Add another hotel' : 'Добавить ещё отель'}
                  <span aria-hidden="true"> ›</span>
                </Link>
              </p>
              <Dialog.CloseTrigger asChild>
                <button
                  type="button"
                  className={styles.close}
                  aria-label={en ? 'Close comparison' : 'Закрыть сравнение'}
                >
                  <CloseIcon />
                </button>
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body className={styles.body}>
              {isFetching && !currentData ? (
                <p role="status" className={styles.message}>
                  {en ? 'Loading hotels…' : 'Загружаем отели…'}
                </p>
              ) : isError ? (
                <div role="alert" className={styles.message}>
                  <p>{en ? 'Could not load the comparison.' : 'Не удалось загрузить сравнение.'}</p>
                  <button type="button" className={styles.retry} onClick={() => refetch()}>
                    {en ? 'Try again' : 'Повторить'}
                  </button>
                </div>
              ) : (
                <>
                  {hotels.length < ids.length && (
                    <p role="status" className={styles.notice}>
                      {en
                        ? 'Some selected hotels are unavailable.'
                        : 'Некоторые выбранные отели недоступны.'}
                    </p>
                  )}
                  {hotels.length > 0 ? (
                    <div className={styles.scroll} role="region" aria-label={title} tabIndex={0}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th scope="col" className={styles.labelColumn}>
                              <span className={styles.featuresLabel}>
                                {en ? 'Features' : 'Характеристики'}
                              </span>
                            </th>
                            {hotels.map((hotel) => (
                              <th scope="col" key={hotel.id} className={styles.hotelColumn}>
                                <article className={styles.hotel}>
                                  <div className={styles.selector}>
                                    <h3>{hotel.title}</h3>
                                    <button
                                      type="button"
                                      className={styles.remove}
                                      onClick={() => dispatch(removeHotelComparison(hotel.id))}
                                      aria-label={`${en ? 'Remove from comparison' : 'Убрать из сравнения'}: ${hotel.title}`}
                                    >
                                      <CloseIcon />
                                    </button>
                                  </div>
                                  <div className={styles.picture}>
                                    {hotel.main_picture ? (
                                      <Image src={hotel.main_picture} alt="" />
                                    ) : (
                                      <span>{en ? 'No photo' : 'Нет фото'}</span>
                                    )}
                                  </div>
                                  <div className={styles.productRule} />
                                  <p className={styles.price}>
                                    {hotel.starting_price
                                      ? formatMoney(
                                          hotel.starting_price.amount,
                                          hotel.starting_price.currency,
                                          locale
                                        )
                                      : missing(lang)}
                                  </p>
                                  <p className={styles.priceCaption}>
                                    {hotel.starting_price
                                      ? en
                                        ? 'starting price per night'
                                        : 'начальная цена за ночь'
                                      : en
                                        ? 'Price unavailable'
                                        : 'Цена не указана'}
                                  </p>
                                  <Link
                                    className={styles.view}
                                    href={`/listings/${encodeURIComponent(hotel.id)}`}
                                    onClick={() => setOpen(false)}
                                  >
                                    {en ? 'View property' : 'Смотреть объект'}
                                  </Link>
                                </article>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        {hotels.some((hotel) => hotel.review_summary?.trim()) && (
                          <tbody>
                            <tr className={styles.section}>
                              <th colSpan={hotels.length + 1} scope="colgroup">
                                {en ? 'Review summary' : 'Сводка отзывов'}
                              </th>
                            </tr>
                            <tr className={`${styles.dataRow} ${styles.summaryRow}`}>
                              <th scope="row">{en ? 'Guests say' : 'Что говорят гости'}</th>
                              {hotels.map((hotel) => (
                                <td key={hotel.id}>
                                  {hotel.review_summary?.trim() ? (
                                    <div className={styles.reviewSummary}>
                                      <ReactMarkdown>{hotel.review_summary}</ReactMarkdown>
                                    </div>
                                  ) : (
                                    missing(lang)
                                  )}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        )}
                        {rows.map((section) => (
                          <tbody key={section.title}>
                            <tr className={styles.section}>
                              <th colSpan={hotels.length + 1} scope="colgroup">
                                {section.title}
                              </th>
                            </tr>
                            {section.items.map((row) => (
                              <tr key={row.label} className={styles.dataRow}>
                                <th scope="row">{row.label}</th>
                                {hotels.map((hotel) => (
                                  <td key={hotel.id}>{row.value(hotel)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        ))}
                      </table>
                    </div>
                  ) : (
                    <p className={styles.message}>
                      {en
                        ? 'Select hotels in search results to compare them.'
                        : 'Выберите отели в поиске, чтобы сравнить их.'}
                    </p>
                  )}
                </>
              )}
            </Dialog.Body>
            <Dialog.Footer className={styles.footer}>
              <p>
                {en
                  ? 'Prices are starting rates; availability depends on dates.'
                  : 'Указаны начальные цены. Доступность зависит от дат поездки.'}
              </p>
              <button
                type="button"
                className={styles.clear}
                onClick={() => dispatch(clearHotelComparison())}
              >
                {en ? 'Clear comparison' : 'Очистить сравнение'}
              </button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
