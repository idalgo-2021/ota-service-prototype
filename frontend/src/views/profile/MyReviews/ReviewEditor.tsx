'use client';

import { useRef, useState, type SubmitEvent } from 'react';
import {
  usePatchListingReviewMutation,
  usePatchProductReviewMutation,
  useSubmitListingReviewMutation,
  useSubmitProductReviewMutation,
  type CatalogLanguage,
  type ListingReview,
  type ListingReviewPatch,
  type ProductReview,
} from '@/lib/api';
import styles from './MyReviews.module.css';

const CRITERIA = [
  ['cleanliness_rating', 'Чистота', 'Cleanliness'],
  ['staff_rating', 'Персонал', 'Staff'],
  ['comfort_rating', 'Комфорт', 'Comfort'],
  ['location_rating', 'Расположение', 'Location'],
  ['sleep_rating', 'Качество сна', 'Sleep quality'],
  ['bathroom_rating', 'Ванная', 'Bathroom'],
  ['wifi_rating', 'Wi-Fi', 'Wi-Fi'],
] as const;

const COPY = {
  ru: {
    listingTitle: 'Отзыв об объекте размещения',
    productTitle: 'Отзыв о продукте',
    overall: 'Общая оценка',
    purpose: 'Цель поездки',
    party: 'С кем путешествовали',
    unspecifiedPurpose: 'Не указана',
    unspecifiedParty: 'Не указано',
    tourism: 'Отдых',
    business: 'Работа',
    other: 'Другое',
    alone: 'Один / одна',
    couple: 'Парой',
    family: 'С семьей',
    friends: 'С друзьями',
    colleagues: 'С коллегами',
    positive: 'Что понравилось',
    negative: 'Что можно улучшить',
    criteria: 'Оценки по критериям',
    close: 'Закрыть',
    save: 'Сохранить черновик',
    submit: 'Отправить на модерацию',
    missingListingText: 'Напишите хотя бы один текст: что понравилось или что можно улучшить.',
    missingProductText: 'Поставьте оценку и напишите отзыв перед отправкой.',
    saved: 'Черновик сохранен.',
    submitError: 'Черновик сохранен, но отправить его не удалось. Попробуйте еще раз.',
    saveError: 'Не удалось сохранить черновик. Возможно, срок заполнения истек.',
    rating: 'Оценка',
    selectRating: 'Выберите оценку',
    reviewText: 'Ваш отзыв',
  },
  en: {
    listingTitle: 'Accommodation review',
    productTitle: 'Product review',
    overall: 'Overall rating',
    purpose: 'Purpose of trip',
    party: 'Who travelled with you',
    unspecifiedPurpose: 'Not specified',
    unspecifiedParty: 'Not specified',
    tourism: 'Leisure',
    business: 'Business',
    other: 'Other',
    alone: 'Alone',
    couple: 'As a couple',
    family: 'With family',
    friends: 'With friends',
    colleagues: 'With colleagues',
    positive: 'What you liked',
    negative: 'What could be improved',
    criteria: 'Ratings by category',
    close: 'Close',
    save: 'Save draft',
    submit: 'Submit for moderation',
    missingListingText: 'Write what you liked or what could be improved.',
    missingProductText: 'Add a rating and review before submitting.',
    saved: 'Draft saved.',
    submitError: 'Draft saved, but could not be submitted. Please try again.',
    saveError: 'Could not save draft. The review window may have expired.',
    rating: 'Rating',
    selectRating: 'Select a rating',
    reviewText: 'Your review',
  },
} as const;

type Criterion = (typeof CRITERIA)[number][0];
type ListingForm = Record<Criterion, string> & {
  overall_rating: string;
  positive_review: string;
  negative_review: string;
  trip_purpose: string;
  party_type: string;
};

const initialListingForm = (review: ListingReview): ListingForm => ({
  overall_rating: review.overall_rating?.toString() ?? '',
  positive_review: review.positive_review ?? '',
  negative_review: review.negative_review ?? '',
  cleanliness_rating: review.cleanliness_rating?.toString() ?? '',
  staff_rating: review.staff_rating?.toString() ?? '',
  comfort_rating: review.comfort_rating?.toString() ?? '',
  location_rating: review.location_rating?.toString() ?? '',
  sleep_rating: review.sleep_rating?.toString() ?? '',
  bathroom_rating: review.bathroom_rating?.toString() ?? '',
  wifi_rating: review.wifi_rating?.toString() ?? '',
  trip_purpose: review.trip_purpose ?? '',
  party_type: review.party_type ?? '',
});

const fieldNumber = (value: string) => (value === '' ? null : Number(value));

export const ListingReviewEditor = ({
  review,
  onClose,
  lang,
}: {
  review: ListingReview;
  onClose: () => void;
  lang: CatalogLanguage;
}) => {
  const t = COPY[lang];
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState(() => initialListingForm(review));
  const [message, setMessage] = useState('');
  const [patch, { isLoading: saving }] = usePatchListingReviewMutation();
  const [submit, { isLoading: submitting }] = useSubmitListingReviewMutation();
  const busy = saving || submitting;

  const setField = (name: keyof ListingForm, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    setMessage('');
  };

  const handleSave = async (send: boolean) => {
    if (!formRef.current?.reportValidity()) {
      return;
    }
    if (send && !form.positive_review.trim() && !form.negative_review.trim()) {
      setMessage(t.missingListingText);
      return;
    }
    const body: ListingReviewPatch = {
      overall_rating: fieldNumber(form.overall_rating),
      positive_review: form.positive_review.trim() || null,
      negative_review: form.negative_review.trim() || null,
      trip_purpose: form.trip_purpose || null,
      party_type: form.party_type || null,
    };
    for (const [key] of CRITERIA) {
      body[key] = fieldNumber(form[key]);
    }
    try {
      await patch({ id: review.id, body }).unwrap();
      if (send) {
        try {
          await submit(review.id).unwrap();
          onClose();
        } catch {
          setMessage(t.submitError);
        }
      } else {
        setMessage(t.saved);
      }
    } catch {
      setMessage(t.saveError);
    }
  };

  return (
    <form
      ref={formRef}
      className={styles.editor}
      onSubmit={(event: SubmitEvent<HTMLFormElement>) => event.preventDefault()}
      aria-label={t.listingTitle}
    >
      <h4>{t.listingTitle}</h4>
      <div className={styles.formGrid}>
        <label>
          {t.overall}
          <input
            type="number"
            min="1"
            max="10"
            step="0.1"
            value={form.overall_rating}
            onChange={(event) => setField('overall_rating', event.target.value)}
          />
        </label>
        <label>
          {t.purpose}
          <select
            value={form.trip_purpose}
            onChange={(event) => setField('trip_purpose', event.target.value)}
          >
            <option value="">{t.unspecifiedPurpose}</option>
            <option value="tourism">{t.tourism}</option>
            <option value="business">{t.business}</option>
            <option value="other">{t.other}</option>
          </select>
        </label>
        <label>
          {t.party}
          <select
            value={form.party_type}
            onChange={(event) => setField('party_type', event.target.value)}
          >
            <option value="">{t.unspecifiedParty}</option>
            <option value="alone">{t.alone}</option>
            <option value="couple">{t.couple}</option>
            <option value="family">{t.family}</option>
            <option value="friends">{t.friends}</option>
            <option value="colleagues">{t.colleagues}</option>
            <option value="other">{t.other}</option>
          </select>
        </label>
      </div>
      <label>
        {t.positive}
        <textarea
          rows={3}
          value={form.positive_review}
          onChange={(event) => setField('positive_review', event.target.value)}
        />
      </label>
      <label>
        {t.negative}
        <textarea
          rows={3}
          value={form.negative_review}
          onChange={(event) => setField('negative_review', event.target.value)}
        />
      </label>
      <details>
        <summary>{t.criteria}</summary>
        <div className={styles.formGrid}>
          {CRITERIA.map(([key, ru, en]) => (
            <label key={key}>
              {lang === 'en' ? en : ru}
              <input
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={form[key]}
                onChange={(event) => setField(key, event.target.value)}
              />
            </label>
          ))}
        </div>
      </details>
      {message && (
        <p className={styles.formMessage} role="status">
          {message}
        </p>
      )}
      <div className={styles.formActions}>
        <button type="button" className={styles.secondaryButton} disabled={busy} onClick={onClose}>
          {t.close}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={busy}
          onClick={() => void handleSave(false)}
        >
          {t.save}
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={busy}
          onClick={() => void handleSave(true)}
        >
          {t.submit}
        </button>
      </div>
    </form>
  );
};

export const ProductReviewEditor = ({
  review,
  onClose,
  lang,
}: {
  review: ProductReview;
  onClose: () => void;
  lang: CatalogLanguage;
}) => {
  const t = COPY[lang];
  const [rating, setRating] = useState(review.rating?.toString() ?? '');
  const [reviewText, setReviewText] = useState(review.review_text ?? '');
  const [message, setMessage] = useState('');
  const [patch, { isLoading: saving }] = usePatchProductReviewMutation();
  const [submit, { isLoading: submitting }] = useSubmitProductReviewMutation();
  const busy = saving || submitting;

  const handleSave = async (send: boolean) => {
    if (send && (!rating || !reviewText.trim())) {
      setMessage(t.missingProductText);
      return;
    }
    try {
      await patch({
        id: review.id,
        body: { rating: rating ? Number(rating) : undefined, review_text: reviewText.trim() },
      }).unwrap();
      if (send) {
        try {
          await submit(review.id).unwrap();
          onClose();
        } catch {
          setMessage(t.submitError);
        }
      } else {
        setMessage(t.saved);
      }
    } catch {
      setMessage(t.saveError);
    }
  };

  return (
    <form
      className={styles.editor}
      onSubmit={(event) => event.preventDefault()}
      aria-label={t.productTitle}
    >
      <h4>{t.productTitle}</h4>
      <label>
        {t.rating}
        <select
          value={rating}
          onChange={(event) => {
            setRating(event.target.value);
            setMessage('');
          }}
        >
          <option value="">{t.selectRating}</option>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t.reviewText}
        <textarea
          rows={4}
          value={reviewText}
          onChange={(event) => {
            setReviewText(event.target.value);
            setMessage('');
          }}
        />
      </label>
      {message && (
        <p className={styles.formMessage} role="status">
          {message}
        </p>
      )}
      <div className={styles.formActions}>
        <button type="button" className={styles.secondaryButton} disabled={busy} onClick={onClose}>
          {t.close}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={busy}
          onClick={() => void handleSave(false)}
        >
          {t.save}
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={busy}
          onClick={() => void handleSave(true)}
        >
          {t.submit}
        </button>
      </div>
    </form>
  );
};
