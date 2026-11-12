import { useGetAdminPageQuery, useGetAdminRecordQuery } from '@/lib/adminApi';
import type { EditableImage } from '../ImagesEditor';
import { unitsConfig } from '../configs/units';

export const useController = (listingId: string) => {
  const listing = useGetAdminRecordQuery(`/admin/listings/${listingId}`);
  const units = useGetAdminPageQuery({ path: `/admin/listings/${listingId}/units` });
  const rooms = (units.data?.items ?? [])
    .filter((unit) => unit.type === 'room')
    .map((unit) => ({ value: String(unit.id), label: String(unit.name_ru ?? unit.name) }));

  return {
    record: listing.data,
    loadError: listing.isError,
    images: (listing.data?.images as EditableImage[] | undefined) ?? [],
    imagesLoading: !listing.data && !listing.isError,
    unitsConfig: unitsConfig(listingId, rooms),
  };
};
