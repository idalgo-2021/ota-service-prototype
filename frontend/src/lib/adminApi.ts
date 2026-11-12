import { api, type Page, type PageMeta } from './api';

/**
 * Запись служебного справочника или каталога в том виде, как её отдаёт бэкенд. Поля
 * у каждой сущности свои, их описывает конфиг раздела админки.
 */
export type AdminRecord = Record<string, unknown>;
export type HotelierListingAssignment = { listing_id: string; created_at: string };

export type AdminQueryParams = Record<string, string | number | boolean | undefined>;

type Envelope<T> = { data: T; meta?: PageMeta };

const toQuery = (params: AdminQueryParams = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });
  const text = query.toString();
  return text ? `?${text}` : '';
};

/** Тег списка: первая часть пути, например `listings` для `/admin/listings/{id}/units`. */
const resourceTag = (path: string) => ({
  type: 'AdminResource' as const,
  id: path.split('/').filter(Boolean)[1] ?? path,
});

/** Справочники видны и на сайте, поэтому после их правки перечитываем публичный словарь. */
const DICTIONARY_RESOURCES = ['countries', 'locations', 'listing_types', 'currencies'];

const invalidatesFor = (path: string) => {
  const tag = resourceTag(path);
  if (DICTIONARY_RESOURCES.includes(tag.id)) {
    return [tag, 'Dictionaries' as const];
  }
  return path.startsWith('/admin/articles') ? [tag, 'Articles' as const] : [tag];
};

/**
 * Общие запросы разделов админки: список (постраничный или целиком), создание, изменение,
 * удаление и действия вроде «одобрить отзыв». Путь передаётся целиком, начиная с `/admin`.
 */
export const adminApi = api
  .enhanceEndpoints({
    addTagTypes: ['AdminResource', 'Dictionaries'],
    endpoints: { getDictionaries: { providesTags: ['Dictionaries'] } },
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getAdminPage: build.query<Page<AdminRecord>, { path: string; params?: AdminQueryParams }>({
        query: ({ path, params }) => `${path}${toQuery(params)}`,
        transformResponse: ({ data, meta }: Envelope<AdminRecord[]>) => ({
          items: data,
          meta: meta ?? { limit: data.length, offset: 0, total: data.length },
        }),
        providesTags: (_result, _error, { path }) => [resourceTag(path)],
      }),
      getAdminRecord: build.query<AdminRecord, string>({
        query: (path) => path,
        transformResponse: ({ data }: Envelope<AdminRecord>) => data,
        providesTags: (_result, _error, path) => [resourceTag(path)],
      }),
      createAdminRecord: build.mutation<AdminRecord, { path: string; body: AdminRecord }>({
        query: ({ path, body }) => ({ url: path, method: 'POST', body }),
        transformResponse: ({ data }: Envelope<AdminRecord>) => data,
        invalidatesTags: (_result, error, { path }) => (error ? [] : invalidatesFor(path)),
      }),
      updateAdminRecord: build.mutation<AdminRecord, { path: string; body: AdminRecord }>({
        query: ({ path, body }) => ({ url: path, method: 'PATCH', body }),
        transformResponse: ({ data }: Envelope<AdminRecord>) => data,
        invalidatesTags: (_result, error, { path }) => (error ? [] : invalidatesFor(path)),
      }),
      deleteAdminRecord: build.mutation<void, string>({
        query: (path) => ({ url: path, method: 'DELETE' }),
        invalidatesTags: (_result, error, path) => (error ? [] : invalidatesFor(path)),
      }),
      getAdminHotelierListings: build.query<string[], string>({
        query: (userId) => `/admin/users/${encodeURIComponent(userId)}/listings`,
        transformResponse: ({ data }: Envelope<string[]>) => data,
        providesTags: (_result, _error, userId) => [
          { type: 'AdminResource', id: `hotelier-listings-${userId}` },
        ],
      }),
      getAdminHotelierListingAssignments: build.query<HotelierListingAssignment[], string>({
        query: (userId) => `/admin/users/${encodeURIComponent(userId)}/listing-assignments`,
        transformResponse: ({ data }: Envelope<HotelierListingAssignment[]>) => data,
        providesTags: (_result, _error, userId) => [
          { type: 'AdminResource', id: `hotelier-listings-${userId}` },
        ],
      }),
      setAdminHotelierListings: build.mutation<string[], { userId: string; listingIds: string[] }>({
        query: ({ userId, listingIds }) => ({
          url: `/admin/users/${encodeURIComponent(userId)}/listings`,
          method: 'PUT',
          body: { listing_ids: listingIds },
        }),
        transformResponse: ({ data }: Envelope<string[]>) => data,
        invalidatesTags: (_result, error, { userId }) =>
          error ? [] : [{ type: 'AdminResource', id: `hotelier-listings-${userId}` }],
      }),
    }),
  });

export const {
  useGetAdminPageQuery,
  useGetAdminRecordQuery,
  useCreateAdminRecordMutation,
  useUpdateAdminRecordMutation,
  useDeleteAdminRecordMutation,
  useGetAdminHotelierListingsQuery,
  useGetAdminHotelierListingAssignmentsQuery,
  useSetAdminHotelierListingsMutation,
} = adminApi;
