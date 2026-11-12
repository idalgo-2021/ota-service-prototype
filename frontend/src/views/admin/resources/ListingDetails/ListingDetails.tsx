'use client';

import { Box, Image, Skeleton, Stack, Text } from '@chakra-ui/react';
import { ImagesEditor } from '../ImagesEditor';
import { ResourceSection } from '../ResourceSection';
import { rootStyle, sectionStyle, sectionTitleStyle, skeletonStyle } from './ListingDetails.styles';
import { useController } from './useController';
import { translateAdmin, useAdminLanguage } from '../../adminLocale';

/**
 * Подробности объекта размещения для сотрудника: галерея фото объекта с добавлением
 * и удалением, ниже — номера и места с ценами, вместимостью и их собственными фото.
 */
export const ListingDetails = ({ listingId }: { listingId: string }) => {
  const lang = useAdminLanguage();
  const t = (text: string) => translateAdmin(text, lang);
  const { record, loadError, images, imagesLoading, unitsConfig } = useController(listingId);
  const metadata = record?.source_metadata;
  const ratingDetails = record?.average_rating_details;
  const mainPicture = typeof record?.main_picture === 'string' ? record.main_picture : undefined;

  return (
    <Stack {...rootStyle}>
      {loadError && <Text role="alert">{t('Не удалось загрузить карточку объекта.')}</Text>}
      {record && (
        <Stack {...sectionStyle}>
          <Text {...sectionTitleStyle}>{t('Карточка объекта')}</Text>
          <Text>
            {t('Название RU')}: {String(record.title_ru ?? '—')}
          </Text>
          <Text>
            {t('Название EN')}: {String(record.title ?? '—')}
          </Text>
          <Text>
            {t('Средняя оценка')}: {String(record.average_overall_rating ?? '—')}
          </Text>
          <Text>
            {t('Количество общих оценок')}: {String(record.overall_rating_count ?? 0)}
          </Text>
          <Box as="details">
            <Box as="summary" cursor="pointer">
              {t('Дополнительные средние оценки')}
            </Box>
            <Box as="pre" whiteSpace="pre-wrap" maxH="240px" overflowY="auto">
              {JSON.stringify(ratingDetails ?? {}, null, 2)}
            </Box>
          </Box>
          <Box as="details">
            <Box as="summary" cursor="pointer">
              {t('Исходные данные')} (source_metadata)
            </Box>
            <Box
              as="pre"
              whiteSpace="pre-wrap"
              overflowWrap="anywhere"
              maxH="320px"
              overflowY="auto"
            >
              {JSON.stringify(metadata ?? {}, null, 2)}
            </Box>
          </Box>
        </Stack>
      )}
      <Stack {...sectionStyle}>
        <Text {...sectionTitleStyle}>
          {t('Фото объекта')} ({images.length + (mainPicture ? 1 : 0)})
        </Text>
        {mainPicture && (
          <Image
            src={mainPicture}
            alt={t('Главное фото объекта')}
            maxW="320px"
            maxH="220px"
            objectFit="cover"
            borderRadius="8px"
          />
        )}
        {loadError ? null : imagesLoading ? (
          <Skeleton {...skeletonStyle} />
        ) : (
          <ImagesEditor
            images={images}
            addPath={`/admin/listings/${listingId}/images`}
            emptyText={mainPicture ? t('Других фото пока нет.') : undefined}
          />
        )}
      </Stack>
      <Stack {...sectionStyle}>
        <Text {...sectionTitleStyle}>{t('Номера и места')}</Text>
        <ResourceSection config={unitsConfig} />
      </Stack>
    </Stack>
  );
};
