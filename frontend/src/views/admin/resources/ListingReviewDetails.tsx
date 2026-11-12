'use client';

import { Grid, Stack, Text } from '@chakra-ui/react';
import { useGetAdminRecordQuery } from '@/lib/adminApi';
import { formatDateTime } from '../format';
import { str } from './configs/cells';
import { useAdminLanguage } from '../adminLocale';
import {
  getReviewDisplayStatus,
  ReviewDetailGrid,
  ReviewDetailSection,
  ReviewDetailsLayout,
  ReviewDetailValue,
  ReviewMetadata,
  ReviewRatingBar,
} from './ReviewDetailsLayout';

const RATING_FIELDS = [
  ['Чистота', 'Cleanliness', 'cleanliness_rating'],
  ['Персонал', 'Staff', 'staff_rating'],
  ['Комфорт', 'Comfort', 'comfort_rating'],
  ['Расположение', 'Location', 'location_rating'],
  ['Качество сна', 'Sleep quality', 'sleep_rating'],
  ['Ванная', 'Bathroom', 'bathroom_rating'],
  ['Wi-Fi', 'Wi-Fi', 'wifi_rating'],
] as const;

const formatDate = (value: string | undefined, lang: 'ru' | 'en') =>
  value ? new Date(value).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ru-RU') : undefined;

export const ListingReviewDetails = ({ id }: { id: string }) => {
  const lang = useAdminLanguage();
  const en = lang === 'en';
  const { data, isLoading, isError } = useGetAdminRecordQuery(
    `/admin/listing-reviews/${encodeURIComponent(id)}`
  );

  if (isLoading) {
    return <Text>{en ? 'Loading review…' : 'Загружаем отзыв…'}</Text>;
  }
  if (isError || !data) {
    return (
      <Text role="alert">{en ? 'Could not load the review.' : 'Не удалось загрузить отзыв.'}</Text>
    );
  }

  const dateTime = (field: string) => {
    const value = str(data, field);
    return value ? formatDateTime(value, lang) : undefined;
  };
  const name =
    (en ? str(data, 'listing_title') : str(data, 'listing_title_ru')) ??
    str(data, 'listing_title') ??
    (en ? 'Property' : 'Объект');
  const reviewer =
    str(data, 'client_name') ?? str(data, 'reviewer_display_name') ?? (en ? 'Guest' : 'Гость');
  const source = data.is_imported
    ? (str(data, 'external_source') ?? (en ? 'External system' : 'Внешняя система'))
    : en
      ? 'Website client'
      : 'Клиент сайта';
  const status = getReviewDisplayStatus(str(data, 'status'), Boolean(data.is_hidden), lang);
  const ratings = RATING_FIELDS.flatMap(([ru, english, field]) => {
    const value = Number(str(data, field));
    return Number.isFinite(value) && str(data, field) ? [{ label: en ? english : ru, value }] : [];
  });
  const overallRating = str(data, 'overall_rating');
  const checkIn = str(data, 'stay_check_in_date');
  const checkOut = str(data, 'stay_check_out_date');
  const listingId = str(data, 'listing_id');
  const stay =
    checkIn && checkOut
      ? `${formatDate(checkIn, lang)} — ${formatDate(checkOut, lang)}`
      : undefined;

  return (
    <ReviewDetailsLayout
      entityLabel={en ? 'Accommodation property' : 'Объект размещения'}
      entityName={name}
      entityHref={listingId ? `/listings/${encodeURIComponent(listingId)}` : undefined}
      author={reviewer}
      source={source}
      createdAt={dateTime('created_at')}
      status={status}
      rating={overallRating}
      ratingMax={10}
    >
      <ReviewDetailSection title={en ? 'Guest comments' : 'Комментарий гостя'}>
        {str(data, 'positive_review') || str(data, 'negative_review') ? (
          <Stack gap="18px">
            {str(data, 'positive_review') && (
              <Stack gap="5px">
                <Text fontSize="12px" fontWeight="700" color="green.700">
                  {en ? 'LIKED' : 'ПОНРАВИЛОСЬ'}
                </Text>
                <Text
                  fontSize="15px"
                  lineHeight="1.6"
                  whiteSpace="pre-wrap"
                  overflowWrap="anywhere"
                >
                  {str(data, 'positive_review')}
                </Text>
              </Stack>
            )}
            {str(data, 'negative_review') && (
              <Stack gap="5px">
                <Text fontSize="12px" fontWeight="700" color="gray.600">
                  {en ? 'DID NOT LIKE' : 'НЕ ПОНРАВИЛОСЬ'}
                </Text>
                <Text
                  fontSize="15px"
                  lineHeight="1.6"
                  whiteSpace="pre-wrap"
                  overflowWrap="anywhere"
                >
                  {str(data, 'negative_review')}
                </Text>
              </Stack>
            )}
          </Stack>
        ) : (
          <Text color="gray.600" fontSize="14px">
            {en ? 'The guest left no comment.' : 'Гость не оставил комментарий.'}
          </Text>
        )}
      </ReviewDetailSection>

      <ReviewDetailSection title={en ? 'Category ratings' : 'Оценки по категориям'}>
        {ratings.length ? (
          <Grid
            templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }}
            columnGap="28px"
            rowGap="18px"
          >
            {ratings.map((item) => (
              <ReviewRatingBar key={item.label} label={item.label} value={item.value} scale={10} />
            ))}
          </Grid>
        ) : (
          <Text color="gray.600" fontSize="14px">
            {en ? 'No category ratings were provided.' : 'Оценки по категориям не указаны.'}
          </Text>
        )}
      </ReviewDetailSection>

      <ReviewDetailSection title={en ? 'Stay details' : 'Детали поездки'}>
        <ReviewDetailGrid>
          <ReviewDetailValue label={en ? 'Stay dates' : 'Даты проживания'} value={stay} />
          <ReviewDetailValue label={en ? 'Nights' : 'Ночей'} value={str(data, 'nights')} />
          <ReviewDetailValue
            label={en ? 'Trip purpose' : 'Цель поездки'}
            value={str(data, 'trip_purpose')}
          />
          <ReviewDetailValue
            label={en ? 'Party type' : 'Состав поездки'}
            value={str(data, 'party_type')}
          />
          <ReviewDetailValue
            label={en ? 'Accommodation type' : 'Тип размещения'}
            value={str(data, 'accommodation_type')}
          />
        </ReviewDetailGrid>
      </ReviewDetailSection>

      <ReviewMetadata label={en ? 'Reviewer and moderation data' : 'Данные автора и модерации'}>
        <ReviewDetailGrid>
          <ReviewDetailValue label={en ? 'Review ID' : 'ID отзыва'} value={id} />
          <ReviewDetailValue
            label={en ? 'Property ID' : 'ID объекта'}
            value={str(data, 'listing_id')}
          />
          <ReviewDetailValue
            label={en ? 'Booking ID' : 'ID брони'}
            value={str(data, 'booking_id')}
          />
          <ReviewDetailValue
            label={en ? 'Client ID' : 'ID клиента'}
            value={str(data, 'reviewer_user_id')}
          />
          <ReviewDetailValue
            label={en ? 'External author ID' : 'Внешний ID автора'}
            value={str(data, 'external_reviewer_id')}
          />
          <ReviewDetailValue
            label={en ? 'Country' : 'Страна'}
            value={str(data, 'reviewer_country')}
          />
          <ReviewDetailValue label={en ? 'Age' : 'Возраст'} value={str(data, 'reviewer_age')} />
          <ReviewDetailValue label={en ? 'Gender' : 'Пол'} value={str(data, 'reviewer_gender')} />
          <ReviewDetailValue
            label={en ? 'Original review date' : 'Дата отзыва'}
            value={dateTime('original_at')}
          />
          <ReviewDetailValue
            label={en ? 'Submitted' : 'Отправлен'}
            value={dateTime('submitted_at')}
          />
          <ReviewDetailValue
            label={en ? 'Moderated' : 'Модерирован'}
            value={dateTime('moderated_at')}
          />
          <ReviewDetailValue
            label={en ? 'Moderator ID' : 'ID модератора'}
            value={str(data, 'moderated_by')}
          />
          <ReviewDetailValue
            label={en ? 'Rejection reason' : 'Причина отклонения'}
            value={str(data, 'rejection_reason')}
          />
          <ReviewDetailValue
            label={en ? 'Hidden reason' : 'Причина скрытия'}
            value={str(data, 'hidden_reason')}
          />
          <ReviewDetailValue label={en ? 'Hidden at' : 'Скрыт в'} value={dateTime('hidden_at')} />
          <ReviewDetailValue
            label={en ? 'Hidden by' : 'ID скрывшего'}
            value={str(data, 'hidden_by')}
          />
          <ReviewDetailValue label={en ? 'Updated' : 'Обновлен'} value={dateTime('updated_at')} />
        </ReviewDetailGrid>
      </ReviewMetadata>
    </ReviewDetailsLayout>
  );
};
