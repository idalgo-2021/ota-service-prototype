import { api, type CatalogLanguage, type Listing } from './api';

/** Fetch actual listings; the temporary /hotel/compare endpoint returns demo properties. */
export const hotelCompareApi = api.injectEndpoints({
  endpoints: (build) => ({
    compareHotels: build.query<Listing[], { ids: string[]; lang: CatalogLanguage }>({
      async queryFn({ ids, lang }, _api, _extraOptions, fetchWithBQ) {
        const results = await Promise.all(
          ids.map((id) => fetchWithBQ(`/listings/${encodeURIComponent(id)}?lang=${lang}`))
        );
        if (results.every((result) => result.error)) {
          return { error: results[0].error! };
        }
        return {
          data: results.flatMap((result) =>
            result.error ? [] : [(result.data as { data: Listing }).data]
          ),
        };
      },
    }),
  }),
});

export const { useCompareHotelsQuery } = hotelCompareApi;
