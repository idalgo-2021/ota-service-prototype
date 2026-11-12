'use client';

import { skipToken } from '@reduxjs/toolkit/query';
import { useState, type ReactNode } from 'react';
import {
  useGetMyListingReviewsQuery,
  useGetMyProductReviewsQuery,
  type CatalogLanguage,
  type ListingReview,
  type ProductReview,
} from '@/lib/api';
import { useAppSelector } from '@/lib/hooks';
import { formatGuests, formatNights, getNights } from '@/lib/stay';
import { useCatalogLanguage } from '@/lib/useCatalogLanguage';
import { Pagination } from '@/shared/pagination';
import { ProfileTable } from '@/shared/profile-table/ProfileTable';
import { ProfileThumbnail } from '@/shared/profile-thumbnail/ProfileThumbnail';
import { ResultPlaceholder } from '@/shared/result-placeholder';
import { ListingReviewEditor, ProductReviewEditor } from './ReviewEditor';
import styles from './MyReviews.module.css';

const PAGE_SIZE = 10;
const COPY = {
  ru: {
    listingReviews: 'Отзывы об объектах размещения',
    productReviews: 'Отзывы о продуктах',
    listing: 'Объект',
    product: 'Продукт',
    listingFallback: 'Объект размещения',
    location: 'Город, страна',
    stay: 'Проживание',
    guests: 'Проживающие',
    date: 'Дата',
    rating: 'Оценка',
    statusTitle: 'Статус',
    review: 'Отзыв',
    positive: 'Плюсы',
    negative: 'Минусы',
    loadError: 'Не удалось загрузить отзывы.',
    retry: 'Повторить',
    empty: 'Отзывов пока нет.',
    emptyText: 'Текст пока не добавлен.',
    reason: 'Причина',
    expired: 'Срок заполнения истек',
    edit: 'Заполнить',
    status: {
      draft: 'Черновик',
      pending_moderation: 'На модерации',
      approved: 'Опубликован',
      rejected: 'Отклонен',
    },
  },
  en: {
    listingReviews: 'Accommodation reviews',
    productReviews: 'Product reviews',
    listing: 'Property',
    product: 'Product',
    listingFallback: 'Accommodation',
    location: 'City, country',
    stay: 'Stay',
    guests: 'Guests',
    date: 'Date',
    rating: 'Rating',
    statusTitle: 'Status',
    review: 'Review',
    positive: 'Pros',
    negative: 'Cons',
    loadError: 'Could not load reviews.',
    retry: 'Try again',
    empty: 'No reviews yet.',
    emptyText: 'No text added yet.',
    reason: 'Reason',
    expired: 'The review window has expired',
    edit: 'Complete review',
    status: {
      draft: 'Draft',
      pending_moderation: 'Pending moderation',
      approved: 'Published',
      rejected: 'Rejected',
    },
  },
} as const;

type DisplayReview = {
  id: string;
  title: string;
  href: string;
  thumbnailUrl?: string | null;
  date: string;
  rating: string;
  status: keyof typeof COPY.ru.status;
  excerpt: string;
  rejectionReason?: string | null;
  location?: string;
  stay?: string;
  guests?: string;
};

const locale = (lang: CatalogLanguage) => (lang === 'en' ? 'en-US' : 'ru-RU');

const dateLabel = (value: string, lang: CatalogLanguage) =>
  new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(value)
  );

const stayDateLabel = (value: string, lang: CatalogLanguage) =>
  new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${value.slice(0, 10)}T00:00:00`)
  );

const stayLabel = (review: ListingReview, lang: CatalogLanguage) => {
  const checkIn = review.stay_check_in_date;
  const checkOut = review.stay_check_out_date;
  const nights =
    review.nights ??
    (checkIn && checkOut ? getNights(checkIn.slice(0, 10), checkOut.slice(0, 10)) : undefined);
  const dates =
    checkIn && checkOut ? `${stayDateLabel(checkIn, lang)} — ${stayDateLabel(checkOut, lang)}` : '';
  const nightsText =
    nights != null
      ? lang === 'en'
        ? `${nights} ${nights === 1 ? 'night' : 'nights'}`
        : formatNights(nights)
      : '';
  return [dates, nightsText].filter(Boolean).join(' · ') || '—';
};

const listingDisplay = (review: ListingReview, lang: CatalogLanguage): DisplayReview => ({
  id: review.id,
  title:
    (lang === 'ru' ? review.listing_title_ru || review.listing_title : review.listing_title) ||
    COPY[lang].listingFallback,
  href: `/listings/${review.listing_id}`,
  thumbnailUrl: review.listing_thumbnail_url,
  date: dateLabel(review.created_at, lang),
  rating:
    review.overall_rating === null
      ? '—'
      : `${review.overall_rating.toLocaleString(locale(lang))} / 10`,
  status: review.status,
  excerpt: [
    review.positive_review && `${COPY[lang].positive}: ${review.positive_review}`,
    review.negative_review && `${COPY[lang].negative}: ${review.negative_review}`,
  ]
    .filter(Boolean)
    .join(' · '),
  rejectionReason: review.rejection_reason,
  location:
    [
      lang === 'ru' ? review.city_name_ru || review.city_name : review.city_name,
      lang === 'ru' ? review.country_name_ru || review.country_name : review.country_name,
    ]
      .filter(Boolean)
      .join(', ') || '—',
  stay: stayLabel(review, lang),
  guests:
    review.stay_adults_count != null && review.stay_children_count != null
      ? lang === 'en'
        ? [
            `${review.stay_adults_count} ${review.stay_adults_count === 1 ? 'adult' : 'adults'}`,
            review.stay_children_count
              ? `${review.stay_children_count} ${review.stay_children_count === 1 ? 'child' : 'children'}`
              : null,
            review.stay_has_pets ? 'with a pet' : null,
          ]
            .filter(Boolean)
            .join(', ')
        : formatGuests({
            adults: review.stay_adults_count,
            children: review.stay_children_count,
            pets: review.stay_has_pets ?? false,
          })
      : '—',
});

const productDisplay = (review: ProductReview, lang: CatalogLanguage): DisplayReview => ({
  id: review.id,
  title:
    (lang === 'ru' ? review.product_name_ru || review.product_name : review.product_name) ||
    COPY[lang].product,
  href: `/products/${review.product_id}`,
  thumbnailUrl: review.product_thumbnail_url,
  date: dateLabel(review.created_at, lang),
  rating: review.rating == null ? '—' : `${review.rating} / 5`,
  status: review.status,
  excerpt: review.review_text ?? '',
  rejectionReason: review.rejection_reason,
});

type ReviewSectionProps = {
  lang: CatalogLanguage;
  title: string;
  kind: 'listing' | 'product';
  items: DisplayReview[];
  total: number;
  offset: number;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onOffsetChange: (offset: number) => void;
  onEdit: (id: string) => void;
  editor?: ReactNode;
};

const ReviewSection = ({
  lang,
  title,
  kind,
  items,
  total,
  offset,
  loading,
  error,
  onRetry,
  onOffsetChange,
  onEdit,
  editor,
}: ReviewSectionProps) => (
  <section className={styles.section}>
    <h2>{title}</h2>
    {loading && !items.length ? (
      <ResultPlaceholder />
    ) : error ? (
      <div className={styles.message}>
        {COPY[lang].loadError}{' '}
        <button type="button" onClick={onRetry}>
          {COPY[lang].retry}
        </button>
      </div>
    ) : items.length === 0 ? (
      <p className={styles.message}>{COPY[lang].empty}</p>
    ) : (
      <>
        <ProfileTable>
            <thead>
              <tr>
                <th>{kind === 'listing' ? COPY[lang].listing : COPY[lang].product}</th>
                <th>{lang === 'en' ? 'Details' : 'Детали'}</th>
                <th>{COPY[lang].statusTitle}</th>
                <th>{COPY[lang].review}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className={styles.subject}>
                      <ProfileThumbnail href={item.href} label={item.title} src={item.thumbnailUrl} />
                      <strong>{item.title}</strong>
                    </div>
                  </td>
                  <td>
                    <div className={styles.details}>
                      {kind === 'listing' && <span>{item.location}</span>}
                      {kind === 'listing' && <span>{item.stay} · {item.guests}</span>}
                      <span>{item.date} · {item.rating}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.details}>
                      <span className={styles.status}>{COPY[lang].status[item.status]}</span>
                      {item.rejectionReason && (
                        <span className={styles.reason}>
                          {COPY[lang].reason}:{' '}
                          {item.rejectionReason === 'expired' ? COPY[lang].expired : item.rejectionReason}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={styles.reviewCell}>
                    {item.excerpt || COPY[lang].emptyText}
                    {item.status === 'draft' && (
                      <button
                        type="button"
                        className={styles.editButton}
                        onClick={() => onEdit(item.id)}
                      >
                        {COPY[lang].edit}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
        </ProfileTable>
        {editor}
        {total > PAGE_SIZE && (
          <Pagination
            lang={lang}
            total={total}
            limit={PAGE_SIZE}
            offset={offset}
            onOffsetChange={onOffsetChange}
          />
        )}
      </>
    )}
  </section>
);

/** Личные отзывы об объектах и продуктах в двух независимых списках. */
export const MyReviews = () => {
  const { lang } = useCatalogLanguage();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const [listingOffset, setListingOffset] = useState(0);
  const [productOffset, setProductOffset] = useState(0);
  const [selected, setSelected] = useState<{ kind: 'listing' | 'product'; id: string } | null>(
    null
  );
  const listingReviews = useGetMyListingReviewsQuery(
    accessToken ? { limit: PAGE_SIZE, offset: listingOffset } : skipToken
  );
  const productReviews = useGetMyProductReviewsQuery(
    accessToken ? { limit: PAGE_SIZE, offset: productOffset } : skipToken
  );
  const selectedListing =
    selected?.kind === 'listing'
      ? listingReviews.data?.items.find((item) => item.id === selected.id)
      : undefined;
  const selectedProduct =
    selected?.kind === 'product'
      ? productReviews.data?.items.find((item) => item.id === selected.id)
      : undefined;

  return (
    <div className={styles.root}>
      <ReviewSection
        lang={lang}
        title={COPY[lang].listingReviews}
        kind="listing"
        items={(listingReviews.data?.items ?? []).map((item) => listingDisplay(item, lang))}
        total={listingReviews.data?.meta.total ?? 0}
        offset={listingOffset}
        loading={listingReviews.isLoading}
        error={listingReviews.isError}
        onRetry={listingReviews.refetch}
        onOffsetChange={(next) => {
          setSelected(null);
          setListingOffset(next);
        }}
        onEdit={(id) => setSelected({ kind: 'listing', id })}
        editor={
          selectedListing && (
            <ListingReviewEditor
              lang={lang}
              key={selectedListing.id}
              review={selectedListing}
              onClose={() => setSelected(null)}
            />
          )
        }
      />
      <ReviewSection
        lang={lang}
        title={COPY[lang].productReviews}
        kind="product"
        items={(productReviews.data?.items ?? []).map((item) => productDisplay(item, lang))}
        total={productReviews.data?.meta.total ?? 0}
        offset={productOffset}
        loading={productReviews.isLoading}
        error={productReviews.isError}
        onRetry={productReviews.refetch}
        onOffsetChange={(next) => {
          setSelected(null);
          setProductOffset(next);
        }}
        onEdit={(id) => setSelected({ kind: 'product', id })}
        editor={
          selectedProduct && (
            <ProductReviewEditor
              lang={lang}
              key={selectedProduct.id}
              review={selectedProduct}
              onClose={() => setSelected(null)}
            />
          )
        }
      />
    </div>
  );
};
