import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { getUserId, signedOut, tokensRefreshed, type AuthTokens } from './auth';
import { bookingCreatedNotification } from './assistantNotifications';
import type { RootState } from './store';

export type Country = {
  id: number;
  name: string;
  code: string;
};

export type Location = {
  id: number;
  country_id: number;
  name: string;
  name_ru?: string | null;
};

export type ListingType = {
  id: number;
  slug: string;
  name: string;
  name_ru?: string | null;
};

export type Currency = {
  code: string;
  name: string;
};

export type FeatureTag = {
  id: number;
  slug: string;
  name: string;
  name_ru: string;
};

export type Dictionaries = {
  countries: Country[];
  locations: Location[];
  listing_types: ListingType[];
  currencies: Currency[];
  features: FeatureTag[];
};

export type ListingImage = {
  id: string;
  url: string;
  sort_order: number;
  created_at: string;
};

export type Listing = {
  id: string;
  title: string;
  description: string | null;
  review_summary?: string | null;
  features: FeatureTag[];
  main_picture: string | null;
  listing_type_id: number;
  address: string | null;
  location_id: number;
  latitude: number | null;
  longitude: number | null;
  distance_from_center_km?: number | null;
  is_active: boolean;
  /** Время заезда в формате HH:MM:SS */
  check_in_time: string;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
  average_rating_details: Record<string, number>;
  average_overall_rating?: number | null;
  overall_rating_count?: number;
  images?: ListingImage[];
  /** Минимальная цена активного варианта за ночь; доступность на даты не проверена. */
  starting_price: { amount: Money; currency: string; unit_type: UnitType } | null;
};

export type PageMeta = {
  limit: number;
  offset: number;
  total: number;
};

export type Page<T> = {
  items: T[];
  meta: PageMeta;
};

export type TravelArticle = {
  id: string;
  slug: string;
  title: string;
  content_html: string;
  cover_image_url: string;
  location_id: number;
  tags: string[];
  author_name: string;
  is_published: boolean;
  published_at?: string | null;
  created_at: string;
};

export type CatalogLanguage = 'en' | 'ru';

export type SavedSearchPreferences = {
  version: 1;
  location_ids: number[];
  listing_type_ids: number[];
  nights: number;
  adults_count: number;
  children_count: number;
  has_pets: boolean;
  listing_price_sort: 'asc' | 'desc';
  listing_rating_sort: 'asc' | 'desc';
  product_price_sort: 'asc' | 'desc';
  product_rating_sort: 'asc' | 'desc';
};

export type Gender = 'male' | 'female' | 'other';

export type ClientProfile = {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  birth_year: number | null;
  gender: Gender | null;
  nationality: string | null;
  about: string;
  /** Код языка в верхнем регистре: `RU` или `EN`. */
  language: string;
  currency: string;
  country_id: number;
  location_id: number | null;
  /** Есть, только если клиент сохранил настройки поиска целиком. */
  search_preferences?: SavedSearchPreferences | null;
  created_at: string;
  updated_at: string;
};

/**
 * Изменения профиля: бэкенд меняет только переданные поля. `null` очищает необязательное поле,
 * а для `search_preferences` — удаляет сохранённые настройки поиска.
 */
export type ProfileUpdate = Partial<
  Omit<ClientProfile, 'user_id' | 'email' | 'created_at' | 'updated_at'>
>;

export type ReviewStatus = 'draft' | 'pending_moderation' | 'approved' | 'rejected';
export type MyReviewsParams = { limit: number; offset: number; status?: ReviewStatus };

export type ListingReview = {
  id: string;
  is_imported?: boolean;
  external_source?: string | null;
  reviewer_display_name?: string | null;
  client_name?: string | null;
  listing_id: string;
  listing_title?: string;
  listing_title_ru?: string | null;
  listing_thumbnail_url?: string | null;
  city_name?: string;
  city_name_ru?: string | null;
  country_name?: string;
  country_name_ru?: string | null;
  stay_check_in_date?: string | null;
  stay_check_out_date?: string | null;
  stay_adults_count?: number | null;
  stay_children_count?: number | null;
  stay_has_pets?: boolean | null;
  nights?: number | null;
  status: ReviewStatus;
  overall_rating: number | null;
  positive_review: string | null;
  negative_review: string | null;
  cleanliness_rating: number | null;
  staff_rating: number | null;
  comfort_rating: number | null;
  location_rating: number | null;
  sleep_rating: number | null;
  bathroom_rating: number | null;
  wifi_rating: number | null;
  trip_purpose: string | null;
  party_type: string | null;
  rejection_reason?: string | null;
  created_at: string;
};

export type ProductReview = {
  id: string;
  product_id: string;
  product_name?: string;
  product_name_ru?: string | null;
  product_thumbnail_url?: string | null;
  status: ReviewStatus;
  rating?: number | null;
  review_text?: string | null;
  rejection_reason?: string | null;
  created_at: string;
};

/** Опубликованный отзыв, безопасный для показа всем посетителям. */
export type PublicProductReview = {
  id: string;
  is_imported: boolean;
  external_source?: string | null;
  author_display_name: string;
  rating: number;
  review_text: string;
  created_at: string;
  original_at?: string | null;
};

export type PublicProductReviewSort = {
  created_at?: 'asc' | 'desc';
  rating?: 'asc' | 'desc';
};

export type ListingReviewPatch = Partial<
  Pick<
    ListingReview,
    | 'overall_rating'
    | 'positive_review'
    | 'negative_review'
    | 'cleanliness_rating'
    | 'staff_rating'
    | 'comfort_rating'
    | 'location_rating'
    | 'sleep_rating'
    | 'bathroom_rating'
    | 'wifi_rating'
    | 'trip_purpose'
    | 'party_type'
  >
>;

export type AdminListingsParams = { limit: number; offset?: number };

export type Credentials = {
  email: string;
  password: string;
};

export type SortOrder = 'asc' | 'desc';

/** Деньги бэкенд отдаёт строкой с десятичной дробью, чтобы не терять точность. */
export type Money = string;

/**
 * Валюта цен на сайте. Бэкенд хранит цены в рублях и пересчитывает по курсу; переключателя
 * валют пока нет, поэтому просим рубли явно — бронь без валюты бэкенд не принимает.
 */
export const CURRENCY = 'RUB';

/**
 * Единица размещения: `property` — объект целиком (квартира), `room` — номер или комната,
 * `bed` — место в комнате хостела.
 */
export type UnitType = 'property' | 'room' | 'bed';

export type UnitImage = {
  id: string;
  url: string;
  sort_order: number;
};

export type ListingUnit = {
  id: string;
  listing_id: string;
  parent_unit_id: string | null;
  /** Название комнаты, в которой стоит место */
  parent_name?: string;
  name_ru?: string | null;
  type: UnitType;
  name: string;
  price_per_night: Money;
  currency: string;
  capacity_adults: number;
  capacity_children: number;
  pets_allowed: boolean;
  is_active: boolean;
  images: UnitImage[];
};

export type HotelierListing = {
  id: string;
  is_active: boolean;
  location_name: string;
  location_name_ru?: string | null;
  check_in_time: string;
  created_at: string;
  deactivated_at: string | null;
  title: string;
  title_ru?: string | null;
  main_picture?: string | null;
  address?: string | null;
  address_ru?: string | null;
  listing_type_name: string;
  listing_type_name_ru?: string | null;
  average_overall_rating: number | null;
  published_review_count: number;
  video_count: number;
  description?: string | null;
  description_ru?: string | null;
  images?: { id: string; url: string; sort_order: number }[];
  features: FeatureTag[];
};
export type HotelierListingCardInput = {
  title: string;
  title_ru: string;
  address: string;
  address_ru: string;
  description: string;
  description_ru: string;
  images: string[];
  feature_ids: number[];
  is_active: boolean;
  check_in_time: string;
};
export type CreateHotelierListingInput = Omit<
  HotelierListingCardInput,
  'is_active' | 'check_in_time'
> & {
  listing_type_id: number;
  location_id: number;
};
export type HotelierListingVideo = {
  id: string;
  listing_id: string;
  location_id?: number | null;
  hotelier_id?: string | null;
  title: string;
  subtitle: string;
  author: string;
  sort_order: number;
  is_active: boolean;
  preview_url: string;
  stream_url: string;
  created_at: string;
};
export type HotelierProfile = {
  email: string;
  first_name: string;
  last_name: string;
  language: string;
};

export type HotelierBookingsParams = {
  limit: number;
  offset: number;
  listing_id?: string;
  status?: BookingStatus;
  sort_by?: 'status' | 'created_at' | 'listing_id' | 'id';
  sort_order?: SortOrder;
};

export type HotelierReviewsParams = {
  limit: number;
  offset: number;
  listing_id?: string;
  status?: ReviewStatus;
  created_from?: string;
  created_to?: string;
  is_imported?: boolean;
  sort_by?: 'status' | 'created_at' | 'listing_id' | 'id' | 'overall_rating';
  sort_order?: SortOrder;
};

export type HotelierMessage = {
  id: string;
  hotelier_id: string;
  listing_id: string;
  listing_title?: string;
  message_type: 'client_question' | 'ota_notification' | 'ota_recommendation';
  sender_type: 'ota' | 'known_client' | 'unknown_client' | 'staff' | 'system';
  sender_user_id?: string;
  sender_name?: string;
  sender_email?: string;
  source?: string;
  external_message_id?: string;
  message_text: string;
  hotelier_reply?: string;
  status: 'new' | 'processed';
  created_at: string;
  replied_at?: string;
  processed_at?: string;
};

export type HotelierMessagesParams = {
  limit: number;
  offset: number;
  listing_id?: string;
  type?: HotelierMessage['message_type'];
  status?: HotelierMessage['status'];
  sort_by?: 'created_at' | 'status' | 'listing_id' | 'id';
  sort_order?: SortOrder;
};

export type HotelierUnitInput = {
  type: UnitType;
  parent_unit_id?: string | null;
  name: string;
  name_ru?: string | null;
  price_per_night: string;
  currency: string;
  capacity_adults: number;
  capacity_children: number;
  pets_allowed: boolean;
  is_active: boolean;
};

export type HotelierUnitPatch = Partial<
  Pick<
    HotelierUnitInput,
    | 'name'
    | 'name_ru'
    | 'price_per_night'
    | 'currency'
    | 'capacity_adults'
    | 'capacity_children'
    | 'pets_allowed'
    | 'is_active'
  >
>;

/** Самый дешёвый подходящий вариант одного типа размещения в объекте. */
export type LowestPriceOption = {
  type: UnitType;
  /** Цена за ночь за все единицы варианта: для хостела это может быть несколько мест */
  total_price_per_night: Money;
  currency: string;
  units: ListingUnit[];
};

export type SearchListing = {
  listing: Listing;
  lowest_price_options: LowestPriceOption[] | null;
};

/** Состав гостей. Взрослые и детские места бэкенд считает раздельно. */
export type Guests = {
  adults: number;
  children: number;
  pets: boolean;
};

export type SearchListingsParams = {
  lang: CatalogLanguage;
  availability_mode: 'ignore' | 'for_guests';
  location_ids?: number[];
  /** Точки `[долгота, широта]`: ищем в их выпуклой оболочке, расширенной на `radius_m` метров. */
  geo?: { points: [number, number][]; radius_m: number };
  listing_type_ids?: number[];
  /** Включительные границы расстояния от центра населённого пункта в километрах. */
  min_distance_km?: number;
  max_distance_km?: number;
  check_in_date?: string;
  nights?: number;
  adults_count?: number;
  children_count?: number;
  has_pets?: boolean;
  currency?: string;
  sort?: { price?: 'asc' | 'desc'; rating?: 'asc' | 'desc' };
};

export type AvailableUnitsParams = {
  listingId: string;
  checkInDate: string;
  nights: number;
  pets: boolean;
  lang?: CatalogLanguage;
};

export type CreateBookingRequest = {
  listingId: string;
  unitIds: string[];
  checkInDate: string;
  nights: number;
  guests: Guests;
};

export type BookingStatus = 'confirmed' | 'checked_in' | 'completed' | 'canceled';

export type Booking = {
  id: string;
  listing_id: string;
  listing_title?: string;
  listing_title_ru?: string | null;
  listing_thumbnail_url?: string | null;
  user_id: string;
  client_name?: string;
  client_email?: string;
  check_in_date: string;
  check_out_date: string;
  adults_count: number;
  children_count: number;
  has_pets: boolean;
  total: Money;
  currency: string;
  status: BookingStatus;
  cancellation_reason: string | null;
  canceled_at: string | null;
  checked_in_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  unit_ids: string[];
  units?: { unit_id: string; name: string; name_ru?: string | null; price_per_night: Money }[];
  base_total?: Money;
  rate_id?: string | null;
  quoted_at?: string | null;
  canceled_by?: string | null;
  checked_in_by?: string | null;
  completed_by?: string | null;
};

export type AdminBookingsParams = {
  limit: number;
  offset: number;
  status?: BookingStatus;
  checkInFrom?: string;
  checkInTo?: string;
  sortBy?: 'created_at' | 'check_in_date' | 'check_out_date';
  sortOrder?: SortOrder;
};

export type OrderStatus = 'pending' | 'confirmed' | 'fulfilled' | 'cancelled';

export type OrderItem = {
  product_id: string;
  product_name?: string;
  product_name_ru?: string | null;
  product_thumbnail_url?: string | null;
  quantity: number;
  price: Money;
  currency: string;
  date?: string;
};

export type Order = {
  id: string;
  user_id: string;
  booking_id?: string | null;
  client_name?: string;
  client_email?: string;
  status: OrderStatus;
  total: Money;
  currency: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  fulfilled_at?: string;
  base_total?: Money;
  rate_id?: string | null;
  quoted_at?: string | null;
  cancelled_by?: string | null;
  moderated_at?: string | null;
  moderated_by?: string | null;
};

export type AdminOrdersParams = {
  limit: number;
  offset: number;
  status?: OrderStatus;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: 'created_at' | 'fulfilled_at';
  sortOrder?: SortOrder;
};

/** `tour` — экскурсия, `service` — услуга (трансфер, страховка), `goods` — товар. */
export type ProductType = 'tour' | 'service' | 'goods';

export type ProductImage = {
  url: string;
  width: number;
  height: number;
};

/** Слот экскурсии: день недели от 1 (понедельник) до 7 и время `HH:MM` по местному времени. */
export type TourScheduleEntry = {
  weekday: number;
  time: string;
};

/** Предложение продавца (контрагента) на витрине: экскурсия, услуга или товар. */
export type Product = {
  id: string;
  name: string;
  product_type: ProductType;
  location_id: number | null;
  location_name?: string | null;
  country_name?: string | null;
  counterparty_name: string | null;
  description: string;
  price: Money;
  currency: string;
  thumbnail: ProductImage | null;
  images: ProductImage[];
  /** Характеристики продавца в свободной форме: длительность, класс машины и т.п. */
  attributes: Record<string, string>;
  /** Расписание экскурсии; у экскурсии без него дату согласуют после заказа */
  schedule?: TourScheduleEntry[];
  average_rating?: Money | null;
  review_count: number;
};

export type ProductsParams = {
  locationId: number;
  productType?: ProductType;
  limit: number;
  offset: number;
};

export type ProductSearchParams = {
  lang: CatalogLanguage;
  query?: string;
  location_id?: number;
  product_type?: ProductType;
  sort?: { price?: 'asc' | 'desc'; rating?: 'asc' | 'desc' };
  limit: number;
  offset: number;
};

/** Позиция заказа, как её отправляем: продукт, количество и дата — только для экскурсий. */
export type OrderItemInput = {
  product_id: string;
  quantity: number;
  date?: string;
};

/** Обёртка, в которой бэкенд отдаёт любой успешный ответ. */
type Envelope<T> = {
  data: T;
  meta?: PageMeta;
};

/** Тело ответа бэкенда с ошибкой. */
export type ApiErrorBody = {
  error?: { code: string; message: string };
};

const unwrap = <T>(response: Envelope<T>) => response.data;

const unwrapPage = <T>(response: Envelope<T[]>): Page<T> => ({
  items: response.data,
  meta: response.meta ?? { limit: response.data.length, offset: 0, total: response.data.length },
});

/** Собирает строку запроса, пропуская пустые значения. */
const toQuery = (params: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });
  return query.toString();
};

/** Текст ошибки из ответа бэкенда, если он его прислал. */
export const getErrorMessage = (error: unknown) =>
  ((error as FetchBaseQueryError | undefined)?.data as ApiErrorBody | undefined)?.error?.message;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers, { getState }) => {
    const { accessToken } = (getState() as RootState).auth;
    if (accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return headers;
  },
});

// Один общий запрос обновления на все запросы, получившие 401 одновременно.
let refreshing: Promise<void> | null = null;

const refreshTokens = async (...[, queryApi, extraOptions]: Parameters<typeof rawBaseQuery>) => {
  const { refreshToken } = (queryApi.getState() as RootState).auth;
  const result = refreshToken
    ? await rawBaseQuery(
        { url: '/auth/refresh', method: 'POST', body: { refresh_token: refreshToken } },
        queryApi,
        extraOptions
      )
    : null;
  if (result?.data) {
    queryApi.dispatch(tokensRefreshed((result.data as Envelope<AuthTokens>).data));
  } else {
    queryApi.dispatch(signedOut());
  }
};

/**
 * Базовый запрос с access-токеном. Если бэкенд ответил 401, один раз обновляет пару токенов
 * по refresh-токену и повторяет запрос. Если обновить не вышло — сбрасывает сессию и повторяет
 * запрос уже гостем: публичные ручки с протухшим токеном тоже отвечают 401.
 */
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  queryApi,
  extraOptions
) => {
  const initialUrl = typeof args === 'string' ? args : args.url;
  const initialMethod = typeof args === 'string' ? 'GET' : (args.method ?? 'GET');
  if (initialMethod === 'GET' && initialUrl.startsWith('/admin/')) {
    const parsed = new URL(initialUrl, 'http://admin.local');
    const requestedLimit = Number(parsed.searchParams.get('limit'));
    if (Number.isInteger(requestedLimit) && requestedLimit > 100) {
      const initialOffset = Number(parsed.searchParams.get('offset') ?? 0);
      const items: unknown[] = [];
      let total = Infinity;
      while (items.length < requestedLimit && initialOffset + items.length < total) {
        const remaining = requestedLimit - items.length;
        parsed.searchParams.set('limit', String(Math.min(100, remaining)));
        parsed.searchParams.set('offset', String(initialOffset + items.length));
        const chunk = await baseQuery(`${parsed.pathname}${parsed.search}`, queryApi, extraOptions);
        if (chunk.error) {
          return chunk;
        }
        const envelope = chunk.data as Envelope<unknown[]>;
        items.push(...envelope.data);
        total = envelope.meta?.total ?? items.length;
        if (!envelope.data.length) {
          break;
        }
      }
      return {
        data: { data: items, meta: { limit: requestedLimit, offset: initialOffset, total } },
      };
    }
  }
  const result = await rawBaseQuery(args, queryApi, extraOptions);
  const url = typeof args === 'string' ? args : args.url;
  const hadToken = !!(queryApi.getState() as RootState).auth.accessToken;
  if (result.error?.status !== 401 || !hadToken || url.startsWith('/auth/')) {
    return result;
  }

  refreshing ??= refreshTokens(args, queryApi, extraOptions).finally(() => {
    refreshing = null;
  });
  await refreshing;
  return rawBaseQuery(args, queryApi, extraOptions);
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  // Бронь меняет и списки броней, и свободные номера, поэтому мутации броней сбрасывают все три.
  tagTypes: [
    'AdminBooking',
    'AdminOrder',
    'MyBooking',
    'MyOrder',
    'Availability',
    'Profile',
    'MyListingReview',
    'MyProductReview',
    'HotelierListing',
    'Listing',
    'HotelierBooking',
    'HotelierReview',
    'HotelierMessage',
    'HotelierUnit',
    'HotelierListingVideos',
    'Articles',
  ],
  endpoints: (build) => ({
    login: build.mutation<AuthTokens, Credentials>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      transformResponse: unwrap<AuthTokens>,
    }),
    register: build.mutation<void, Credentials>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      transformResponse: () => undefined,
    }),
    getProfile: build.query<ClientProfile, string>({
      query: () => '/profile',
      transformResponse: unwrap<ClientProfile>,
      providesTags: ['Profile'],
    }),
    updateProfile: build.mutation<ClientProfile, ProfileUpdate>({
      query: (body) => ({ url: '/profile', method: 'PATCH', body }),
      transformResponse: unwrap<ClientProfile>,
      // От языка профиля зависят тексты каталога, поэтому перечитываем профиль во всех местах.
      invalidatesTags: ['Profile'],
    }),
    getMyListingReviews: build.query<Page<ListingReview>, MyReviewsParams>({
      query: (params) => `/listing-reviews?${toQuery(params)}`,
      transformResponse: unwrapPage<ListingReview>,
      providesTags: ['MyListingReview'],
    }),
    getMyProductReviews: build.query<Page<ProductReview>, MyReviewsParams>({
      query: (params) => `/product-reviews?${toQuery(params)}`,
      transformResponse: unwrapPage<ProductReview>,
      providesTags: ['MyProductReview'],
    }),
    patchListingReview: build.mutation<ListingReview, { id: string; body: ListingReviewPatch }>({
      query: ({ id, body }) => ({
        url: `/listing-reviews/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: unwrap<ListingReview>,
      invalidatesTags: ['MyListingReview'],
    }),
    submitListingReview: build.mutation<ListingReview, string>({
      query: (id) => ({
        url: `/listing-reviews/${encodeURIComponent(id)}/submit`,
        method: 'PATCH',
      }),
      transformResponse: unwrap<ListingReview>,
      invalidatesTags: ['MyListingReview'],
    }),
    patchProductReview: build.mutation<
      ProductReview,
      { id: string; body: { rating?: number; review_text?: string } }
    >({
      query: ({ id, body }) => ({
        url: `/product-reviews/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: unwrap<ProductReview>,
      invalidatesTags: ['MyProductReview'],
    }),
    submitProductReview: build.mutation<ProductReview, string>({
      query: (id) => ({
        url: `/product-reviews/${encodeURIComponent(id)}/submit`,
        method: 'PATCH',
      }),
      transformResponse: unwrap<ProductReview>,
      invalidatesTags: ['MyProductReview'],
    }),
    getDictionaries: build.query<Dictionaries, CatalogLanguage | void>({
      query: (lang) => `/dictionaries${lang ? `?lang=${lang}` : ''}`,
      transformResponse: unwrap<Dictionaries>,
    }),
    getPublicArticles: build.query<Page<TravelArticle>, { limit?: number; offset?: number } | void>(
      {
        query: (params) =>
          `/articles?${toQuery({ limit: params?.limit ?? 4, offset: params?.offset ?? 0 })}`,
        transformResponse: unwrapPage<TravelArticle>,
        providesTags: ['Articles'],
      }
    ),
    getPublicArticle: build.query<TravelArticle, string>({
      query: (slug) => `/articles/${encodeURIComponent(slug)}`,
      transformResponse: unwrap<TravelArticle>,
      providesTags: ['Articles'],
    }),
    searchListings: build.query<SearchListing[], SearchListingsParams>({
      query: ({ lang, ...filters }) => ({
        url: `/listings/search?lang=${lang}`,
        method: 'POST',
        body: filters,
      }),
      transformResponse: unwrap<SearchListing[]>,
      providesTags: ['Availability'],
    }),
    getListing: build.query<Listing, string | { id: string; lang: CatalogLanguage }>({
      query: (arg) => {
        const id = typeof arg === 'string' ? arg : arg.id;
        const lang = typeof arg === 'string' ? undefined : arg.lang;
        return `/listings/${encodeURIComponent(id)}${lang ? `?lang=${lang}` : ''}`;
      },
      transformResponse: unwrap<Listing>,
      providesTags: (_result, _error, arg) => [
        { type: 'Listing', id: typeof arg === 'string' ? arg : arg.id },
      ],
    }),
    getHotelierListings: build.query<HotelierListing[], void>({
      query: () => '/hotelier/listings',
      transformResponse: unwrap<HotelierListing[]>,
      providesTags: ['HotelierListing'],
    }),
    updateHotelierListingCard: build.mutation<
      { updated: boolean },
      { listingId: string; body: HotelierListingCardInput }
    >({
      query: ({ listingId, body }) => ({
        url: `/hotelier/listings/${encodeURIComponent(listingId)}/card`,
        method: 'PATCH',
        body,
      }),
      transformResponse: unwrap<{ updated: boolean }>,
      invalidatesTags: (_result, _error, { listingId }) => [
        'HotelierListing',
        'Availability',
        { type: 'Listing', id: listingId },
      ],
    }),
    createHotelierListing: build.mutation<{ id: string }, CreateHotelierListingInput>({
      query: (body) => ({ url: '/hotelier/listings', method: 'POST', body }),
      transformResponse: unwrap<{ id: string }>,
      invalidatesTags: ['HotelierListing'],
    }),
    setHotelierListingActive: build.mutation<
      { is_active: boolean },
      { listingId: string; isActive: boolean }
    >({
      query: ({ listingId, isActive }) => ({
        url: `/hotelier/listings/${encodeURIComponent(listingId)}/status`,
        method: 'PATCH',
        body: { is_active: isActive },
      }),
      transformResponse: unwrap<{ is_active: boolean }>,
      invalidatesTags: ['HotelierListing'],
    }),
    getHotelierListingVideos: build.query<HotelierListingVideo[], string>({
      query: (listingId) => `/hotelier/listings/${encodeURIComponent(listingId)}/videos`,
      transformResponse: unwrap<HotelierListingVideo[]>,
      providesTags: (_result, _error, listingId) => [
        { type: 'HotelierListingVideos', id: listingId },
      ],
    }),
    uploadHotelierListingVideo: build.mutation<
      HotelierListingVideo,
      { listingId: string; formData: FormData }
    >({
      query: ({ listingId, formData }) => ({
        url: `/hotelier/listings/${encodeURIComponent(listingId)}/videos`,
        method: 'POST',
        body: formData,
      }),
      transformResponse: unwrap<HotelierListingVideo>,
      invalidatesTags: (_result, _error, { listingId }) => [
        { type: 'HotelierListingVideos', id: listingId },
        'HotelierListing',
      ],
    }),
    updateHotelierListingVideo: build.mutation<
      HotelierListingVideo,
      {
        listingId: string;
        videoId: string;
        body: {
          title?: string;
          subtitle?: string;
          author?: string;
          sort_order?: number;
          is_active?: boolean;
        };
      }
    >({
      query: ({ listingId, videoId, body }) => ({
        url: `/hotelier/listings/${encodeURIComponent(listingId)}/videos/${encodeURIComponent(videoId)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: unwrap<HotelierListingVideo>,
      invalidatesTags: (_result, _error, { listingId }) => [
        { type: 'HotelierListingVideos', id: listingId },
      ],
    }),
    deleteHotelierListingVideo: build.mutation<
      void,
      { listingId: string; videoId: string }
    >({
      query: ({ listingId, videoId }) => ({
        url: `/hotelier/listings/${encodeURIComponent(listingId)}/videos/${encodeURIComponent(videoId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { listingId }) => [
        { type: 'HotelierListingVideos', id: listingId },
        'HotelierListing',
      ],
    }),
    getHotelierProfile: build.query<HotelierProfile, void>({
      query: () => '/hotelier/profile',
      transformResponse: unwrap<HotelierProfile>,
    }),
    getHotelierBookings: build.query<Page<Booking>, HotelierBookingsParams>({
      query: (params) => `/hotelier/bookings?${toQuery(params)}`,
      transformResponse: unwrapPage<Booking>,
      providesTags: ['HotelierBooking'],
    }),
    getHotelierBooking: build.query<Booking, string>({
      query: (id) => `/hotelier/bookings/${encodeURIComponent(id)}`,
      transformResponse: unwrap<Booking>,
      providesTags: ['HotelierBooking'],
    }),
    hotelierBookingAction: build.mutation<
      Booking,
      { id: string; action: 'check-in' | 'check-out' | 'cancel'; reason?: string }
    >({
      query: ({ id, action, reason }) => ({
        url: `/hotelier/bookings/${encodeURIComponent(id)}/${action}`,
        method: 'PATCH',
        ...(action === 'cancel' ? { body: { reason } } : {}),
      }),
      transformResponse: unwrap<Booking>,
      invalidatesTags: ['HotelierBooking', 'HotelierUnit'],
    }),
    getHotelierReviews: build.query<Page<ListingReview>, HotelierReviewsParams>({
      query: ({ is_imported, ...params }) =>
        `/hotelier/listing-reviews?${toQuery({
          ...params,
          is_imported: is_imported === undefined ? undefined : String(is_imported),
        })}`,
      transformResponse: unwrapPage<ListingReview>,
      providesTags: ['HotelierReview'],
    }),
    getHotelierReview: build.query<ListingReview, string>({
      query: (id) => `/hotelier/listing-reviews/${encodeURIComponent(id)}`,
      transformResponse: unwrap<ListingReview>,
      providesTags: ['HotelierReview'],
    }),
    getHotelierMessages: build.query<Page<HotelierMessage>, HotelierMessagesParams>({
      query: (params) => `/hotelier/messages?${toQuery(params)}`,
      transformResponse: unwrapPage<HotelierMessage>,
      providesTags: ['HotelierMessage'],
    }),
    getHotelierMessage: build.query<HotelierMessage, string>({
      query: (id) => `/hotelier/messages/${encodeURIComponent(id)}`,
      transformResponse: unwrap<HotelierMessage>,
      providesTags: ['HotelierMessage'],
    }),
    replyHotelierMessage: build.mutation<
      HotelierMessage,
      { id: string; reply: string; processed: boolean }
    >({
      query: ({ id, reply, processed }) => ({
        url: `/hotelier/messages/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body: { reply, processed },
      }),
      transformResponse: unwrap<HotelierMessage>,
      invalidatesTags: ['HotelierMessage'],
    }),
    getHotelierUnits: build.query<ListingUnit[], { listingId: string; currency?: string }>({
      query: ({ listingId, currency }) =>
        `/hotelier/listings/${encodeURIComponent(listingId)}/units?${toQuery({ currency })}`,
      transformResponse: unwrap<ListingUnit[]>,
      providesTags: (_result, _error, { listingId }) => [{ type: 'HotelierUnit', id: listingId }],
    }),
    createHotelierUnit: build.mutation<ListingUnit, { listingId: string; body: HotelierUnitInput }>(
      {
        query: ({ listingId, body }) => ({
          url: `/hotelier/listings/${encodeURIComponent(listingId)}/units`,
          method: 'POST',
          body,
        }),
        transformResponse: unwrap<ListingUnit>,
        invalidatesTags: (_result, _error, { listingId }) => [
          { type: 'HotelierUnit', id: listingId },
        ],
      }
    ),
    updateHotelierUnit: build.mutation<
      ListingUnit,
      { listingId: string; unitId: string; body: HotelierUnitPatch }
    >({
      query: ({ listingId, unitId, body }) => ({
        url: `/hotelier/listings/${encodeURIComponent(listingId)}/units/${encodeURIComponent(unitId)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: unwrap<ListingUnit>,
      invalidatesTags: (_result, _error, { listingId }) => [
        { type: 'HotelierUnit', id: listingId },
      ],
    }),
    createHotelierUnitImage: build.mutation<
      UnitImage,
      { listingId: string; unitId: string; url: string; sortOrder: number }
    >({
      query: ({ listingId, unitId, url, sortOrder }) => ({
        url: `/hotelier/listings/${encodeURIComponent(listingId)}/units/${encodeURIComponent(unitId)}/images`,
        method: 'POST',
        body: { url, sort_order: sortOrder },
      }),
      transformResponse: unwrap<UnitImage>,
      invalidatesTags: (_result, _error, { listingId }) => [
        { type: 'HotelierUnit', id: listingId },
      ],
    }),
    deleteHotelierUnitImage: build.mutation<
      void,
      { listingId: string; unitId: string; imageId: string }
    >({
      query: ({ listingId, unitId, imageId }) => ({
        url: `/hotelier/listings/${encodeURIComponent(listingId)}/units/${encodeURIComponent(unitId)}/images/${encodeURIComponent(imageId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { listingId }) => [
        { type: 'HotelierUnit', id: listingId },
      ],
    }),
    getAdminListings: build.query<Page<Listing>, AdminListingsParams>({
      query: (params) => `/admin/listings?${toQuery(params)}`,
      transformResponse: unwrapPage<Listing>,
    }),
    getAvailableUnits: build.query<ListingUnit[], AvailableUnitsParams>({
      query: ({ listingId, checkInDate, nights, pets, lang }) =>
        `/listings/${encodeURIComponent(listingId)}/available-units?${toQuery({
          check_in_date: checkInDate,
          nights,
          has_pets: String(pets),
          currency: CURRENCY,
          sort_by: 'price_per_night',
          lang,
        })}`,
      transformResponse: unwrap<ListingUnit[]>,
      providesTags: ['Availability'],
    }),
    createBooking: build.mutation<Booking, CreateBookingRequest>({
      query: ({ listingId, unitIds, checkInDate, nights, guests }) => ({
        url: '/bookings',
        method: 'POST',
        body: {
          listing_id: listingId,
          unit_ids: unitIds,
          check_in_date: checkInDate,
          nights,
          adults_count: guests.adults,
          children_count: guests.children,
          has_pets: guests.pets,
          currency: CURRENCY,
        },
      }),
      transformResponse: unwrap<Booking>,
      invalidatesTags: ['AdminBooking', 'MyBooking', 'Availability'],
      onQueryStarted: async (_arg, { dispatch, getState, queryFulfilled }) => {
        try {
          const { data: booking } = await queryFulfilled;
          const userId = getUserId((getState() as RootState).auth.accessToken);
          if (userId) {
            dispatch(bookingCreatedNotification({ userId, bookingId: booking.id }));
          }
        } catch {
          // Failed booking requests must not create success notifications.
        }
      },
    }),
    getMyBooking: build.query<Booking, string>({
      query: (id) => `/bookings/${encodeURIComponent(id)}`,
      transformResponse: unwrap<Booking>,
      providesTags: ['MyBooking'],
    }),
    getMyBookings: build.query<Page<Booking>, { limit: number; offset: number }>({
      query: (params) => `/bookings?${toQuery(params)}`,
      transformResponse: unwrapPage<Booking>,
      providesTags: ['MyBooking'],
    }),
    cancelMyBooking: build.mutation<Booking, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/bookings/${encodeURIComponent(id)}/cancel`,
        method: 'PATCH',
        body: { reason },
      }),
      transformResponse: unwrap<Booking>,
      invalidatesTags: ['AdminBooking', 'MyBooking', 'Availability'],
    }),
    getAdminBookings: build.query<Page<Booking>, AdminBookingsParams>({
      query: ({ checkInFrom, checkInTo, sortBy, sortOrder, ...rest }) =>
        `/admin/bookings?${toQuery({
          ...rest,
          check_in_from: checkInFrom,
          check_in_to: checkInTo,
          sort_by: sortBy,
          sort_order: sortOrder,
        })}`,
      transformResponse: unwrapPage<Booking>,
      providesTags: ['AdminBooking'],
    }),
    getAdminBooking: build.query<Booking, string>({
      query: (id) => `/admin/bookings/${encodeURIComponent(id)}`,
      transformResponse: unwrap<Booking>,
      providesTags: ['AdminBooking'],
    }),
    checkInBooking: build.mutation<Booking, string>({
      query: (id) => ({
        url: `/admin/bookings/${encodeURIComponent(id)}/check-in`,
        method: 'PATCH',
      }),
      transformResponse: unwrap<Booking>,
      invalidatesTags: ['AdminBooking', 'MyBooking', 'Availability'],
    }),
    checkOutBooking: build.mutation<Booking, string>({
      query: (id) => ({
        url: `/admin/bookings/${encodeURIComponent(id)}/check-out`,
        method: 'PATCH',
      }),
      transformResponse: unwrap<Booking>,
      invalidatesTags: ['AdminBooking', 'MyBooking', 'Availability'],
    }),
    cancelAdminBooking: build.mutation<Booking, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/admin/bookings/${encodeURIComponent(id)}/cancel`,
        method: 'PATCH',
        body: { reason },
      }),
      transformResponse: unwrap<Booking>,
      invalidatesTags: ['AdminBooking', 'MyBooking', 'Availability'],
    }),
    getAdminOrders: build.query<Page<Order>, AdminOrdersParams>({
      query: ({ createdFrom, createdTo, sortBy, sortOrder, ...rest }) =>
        `/admin/orders?${toQuery({
          ...rest,
          created_from: createdFrom,
          created_to: createdTo,
          sort_by: sortBy,
          sort_order: sortOrder,
        })}`,
      transformResponse: unwrapPage<Order>,
      providesTags: ['AdminOrder'],
    }),
    getAdminOrder: build.query<Order, string>({
      query: (id) => `/admin/orders/${encodeURIComponent(id)}`,
      transformResponse: unwrap<Order>,
      providesTags: ['AdminOrder'],
    }),
    fulfillAdminOrder: build.mutation<Order, string>({
      query: (id) => ({
        url: `/admin/orders/${encodeURIComponent(id)}/fulfill`,
        method: 'PATCH',
      }),
      transformResponse: unwrap<Order>,
      invalidatesTags: ['AdminOrder'],
    }),
    cancelAdminOrder: build.mutation<Order, { id: string; reason: string }>({
      // Причина у заказа необязательна, но пустую строку бэкенд не принимает.
      query: ({ id, reason }) => ({
        url: `/admin/orders/${encodeURIComponent(id)}/cancel`,
        method: 'PATCH',
        body: { reason },
      }),
      transformResponse: unwrap<Order>,
      invalidatesTags: ['AdminOrder'],
    }),
    getProducts: build.query<Page<Product>, ProductsParams>({
      query: ({ locationId, productType, ...rest }) =>
        `/products?${toQuery({
          ...rest,
          location_id: locationId,
          product_type: productType,
          currency: CURRENCY,
        })}`,
      transformResponse: unwrapPage<Product>,
    }),
    searchProducts: build.query<Page<Product>, ProductSearchParams>({
      query: ({ lang, ...body }) => ({
        url: `/products/search?lang=${lang}`,
        method: 'POST',
        body: { ...body, currency: CURRENCY },
      }),
      transformResponse: unwrapPage<Product>,
    }),
    getProduct: build.query<Product, string | { id: string; lang: CatalogLanguage }>({
      query: (arg) => {
        const id = typeof arg === 'string' ? arg : arg.id;
        const lang = typeof arg === 'string' ? undefined : arg.lang;
        return `/products/${encodeURIComponent(id)}?${toQuery({ currency: CURRENCY, lang })}`;
      },
      transformResponse: unwrap<Product>,
    }),
    getProductReviews: build.query<
      Page<PublicProductReview>,
      { id: string; limit: number; offset: number; sort: PublicProductReviewSort }
    >({
      query: ({ id, ...body }) => ({
        url: `/products/${encodeURIComponent(id)}/reviews/search`,
        method: 'POST',
        body,
      }),
      transformResponse: unwrapPage<PublicProductReview>,
    }),
    getMyOrders: build.query<
      Page<Order>,
      { limit: number; offset: number; status?: OrderStatus | OrderStatus[] }
    >({
      query: ({ status, ...params }) =>
        `/orders?${toQuery({ ...params, status: Array.isArray(status) ? status.join(',') : status })}`,
      transformResponse: unwrapPage<Order>,
      providesTags: ['MyOrder'],
    }),
    // Неоформленный (`pending`) заказ служит корзиной: позиции в нём меняются целиком.
    createOrder: build.mutation<Order, { items: OrderItemInput[]; bookingId?: string }>({
      query: ({ items, bookingId }) => ({
        url: '/orders',
        method: 'POST',
        body: { currency: CURRENCY, items, booking_id: bookingId },
      }),
      transformResponse: unwrap<Order>,
      invalidatesTags: ['MyOrder', 'AdminOrder'],
    }),
    updateOrder: build.mutation<Order, { id: string; items: OrderItemInput[] }>({
      query: ({ id, items }) => ({
        url: `/orders/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body: { items },
      }),
      transformResponse: unwrap<Order>,
      invalidatesTags: ['MyOrder', 'AdminOrder'],
    }),
    confirmOrder: build.mutation<Order, string>({
      query: (id) => ({
        url: `/orders/${encodeURIComponent(id)}/confirm`,
        method: 'PATCH',
      }),
      transformResponse: unwrap<Order>,
      invalidatesTags: ['MyOrder', 'AdminOrder'],
    }),
    linkOrderBooking: build.mutation<Order, { id: string; bookingId: string | null }>({
      query: ({ id, bookingId }) => ({
        url: `/orders/${encodeURIComponent(id)}/booking`,
        method: 'PATCH',
        body: { booking_id: bookingId },
      }),
      transformResponse: unwrap<Order>,
      invalidatesTags: ['MyOrder', 'AdminOrder'],
    }),
    cancelMyOrder: build.mutation<Order, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/orders/${encodeURIComponent(id)}/cancel`,
        method: 'PATCH',
        body: reason.trim() ? { reason: reason.trim() } : {},
      }),
      transformResponse: unwrap<Order>,
      invalidatesTags: ['MyOrder', 'AdminOrder'],
    }),
    getAdminProducts: build.query<Page<Product>, { limit: number }>({
      query: ({ limit }) => `/admin/products?${toQuery({ limit })}`,
      transformResponse: unwrapPage<Product>,
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useGetMyListingReviewsQuery,
  useGetMyProductReviewsQuery,
  usePatchListingReviewMutation,
  useSubmitListingReviewMutation,
  usePatchProductReviewMutation,
  useSubmitProductReviewMutation,
  useGetDictionariesQuery,
  useGetPublicArticlesQuery,
  useGetPublicArticleQuery,
  useSearchListingsQuery,
  useGetListingQuery,
  useGetHotelierListingsQuery,
  useUpdateHotelierListingCardMutation,
  useCreateHotelierListingMutation,
  useSetHotelierListingActiveMutation,
  useGetHotelierListingVideosQuery,
  useUploadHotelierListingVideoMutation,
  useUpdateHotelierListingVideoMutation,
  useDeleteHotelierListingVideoMutation,
  useGetHotelierProfileQuery,
  useGetHotelierBookingsQuery,
  useGetHotelierBookingQuery,
  useHotelierBookingActionMutation,
  useGetHotelierReviewsQuery,
  useGetHotelierReviewQuery,
  useGetHotelierMessagesQuery,
  useGetHotelierMessageQuery,
  useReplyHotelierMessageMutation,
  useGetHotelierUnitsQuery,
  useCreateHotelierUnitMutation,
  useUpdateHotelierUnitMutation,
  useCreateHotelierUnitImageMutation,
  useDeleteHotelierUnitImageMutation,
  useGetAdminListingsQuery,
  useGetAvailableUnitsQuery,
  useCreateBookingMutation,
  useGetMyBookingQuery,
  useGetMyBookingsQuery,
  useCancelMyBookingMutation,
  useGetAdminBookingsQuery,
  useGetAdminBookingQuery,
  useCheckInBookingMutation,
  useCheckOutBookingMutation,
  useCancelAdminBookingMutation,
  useGetAdminOrdersQuery,
  useGetAdminOrderQuery,
  useFulfillAdminOrderMutation,
  useCancelAdminOrderMutation,
  useGetAdminProductsQuery,
  useGetProductsQuery,
  useSearchProductsQuery,
  useGetProductQuery,
  useGetProductReviewsQuery,
  useGetMyOrdersQuery,
  useCreateOrderMutation,
  useUpdateOrderMutation,
  useConfirmOrderMutation,
  useLinkOrderBookingMutation,
  useCancelMyOrderMutation,
} = api;
