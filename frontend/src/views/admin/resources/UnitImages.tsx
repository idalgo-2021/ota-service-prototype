'use client';

import { Text } from '@chakra-ui/react';
import { useGetAdminRecordQuery } from '@/lib/adminApi';
import { ImagesEditor, type EditableImage } from './ImagesEditor';
import { translateAdmin, useAdminLanguage } from '../adminLocale';

export const UnitImages = ({ listingId, unitId }: { listingId: string; unitId: string }) => {
  const lang = useAdminLanguage();
  const t = (text: string) => translateAdmin(text, lang);
  const path = `/admin/listings/${listingId}/units/${unitId}`;
  const { data, isLoading, isError } = useGetAdminRecordQuery(path);
  if (isLoading) {
    return <Text>{t('Загружаем фото…')}</Text>;
  }
  if (isError) {
    return <Text role="alert">{t('Не удалось загрузить фото номера.')}</Text>;
  }
  return (
    <ImagesEditor
      images={(data?.images as EditableImage[] | undefined) ?? []}
      addPath={`${path}/images`}
    />
  );
};
