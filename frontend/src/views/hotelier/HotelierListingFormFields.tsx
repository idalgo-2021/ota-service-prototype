'use client';

import { useState } from 'react';
import {
  Box,
  Field,
  Flex,
  Grid,
  Image,
  NativeSelect,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react';
import type { ListingType, Location } from '@/lib/api';
import { IconButton } from '@/shared/icon-button/IconButton';
import { Input } from '@/shared/input';

export type HotelierListingFormValues = {
  title: string;
  titleRu: string;
  address: string;
  addressRu: string;
  description: string;
  descriptionRu: string;
};

export const HotelierListingFormFields = ({
  values,
  onChange,
  images,
  onImagesChange,
  lang,
  listingTypes,
  locations,
  listingTypeId,
  locationId,
  onListingTypeChange,
  onLocationChange,
}: {
  values: HotelierListingFormValues;
  onChange: (field: keyof HotelierListingFormValues, value: string) => void;
  images: string[];
  onImagesChange: (images: string[]) => void;
  lang: 'ru' | 'en';
  listingTypes?: ListingType[];
  locations?: Location[];
  listingTypeId?: string;
  locationId?: string;
  onListingTypeChange?: (id: string) => void;
  onLocationChange?: (id: string) => void;
}) => {
  const [uploadError, setUploadError] = useState('');
  const t = (ru: string, en: string) => (lang === 'en' ? en : ru);

  const addImages = async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }
    const selected = Array.from(files);
    if (
      selected.some(
        (file) =>
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
          file.size > 5 * 1024 * 1024
      )
    ) {
      setUploadError(
        t(
          'Поддерживаются JPG, PNG и WebP до 5 МБ каждый.',
          'Use JPG, PNG, or WebP files up to 5 MB each.'
        )
      );
      return;
    }
    if (images.length + selected.length > 20) {
      setUploadError(t('Можно добавить не более 20 фотографий.', 'You can add up to 20 photos.'));
      return;
    }
    const currentBytes = images.reduce((sum, image) => sum + image.length * 0.75, 0);
    if (currentBytes + selected.reduce((sum, file) => sum + file.size, 0) > 11 * 1024 * 1024) {
      setUploadError(
        t(
          'Общий размер загружаемых фото не должен превышать 11 МБ.',
          'Uploaded photos must total no more than 11 MB.'
        )
      );
      return;
    }
    try {
      const uploaded = await Promise.all(
        selected.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                typeof reader.result === 'string'
                  ? resolve(reader.result)
                  : reject(new Error('Unable to read image'));
              reader.onerror = () => reject(new Error('Unable to read image'));
              reader.readAsDataURL(file);
            })
        )
      );
      onImagesChange([...images, ...uploaded]);
      setUploadError('');
    } catch {
      setUploadError(
        t('Не удалось прочитать выбранное фото.', 'Could not read the selected image.')
      );
    }
  };

  return (
    <Stack gap="22px">
      <Box>
        <Text fontSize="15px" fontWeight="600" mb="12px">
          {t('Основная информация', 'Property details')}
        </Text>
        <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }} gap="12px">
          <Field.Root>
            <Field.Label>{t('Название', 'Name')}</Field.Label>
            <Input
              value={values.title}
              onChange={(e) => onChange('title', e.target.value)}
              required
              placeholder={t('Например, «Северный берег»', 'For example, “North Shore”')}
            />
          </Field.Root>
          <Field.Root>
            <Field.Label>{t('Название на русском', 'Name (Russian)')}</Field.Label>
            <Input
              value={values.titleRu}
              onChange={(e) => onChange('titleRu', e.target.value)}
              placeholder={t('Название кириллицей', 'Russian name')}
            />
          </Field.Root>
          <Field.Root>
            <Field.Label>{t('Адрес', 'Address')}</Field.Label>
            <Input
              value={values.address}
              onChange={(e) => onChange('address', e.target.value)}
              placeholder={t('Улица и номер дома', 'Street and building number')}
            />
          </Field.Root>
          <Field.Root>
            <Field.Label>{t('Адрес на русском', 'Address (Russian)')}</Field.Label>
            <Input
              value={values.addressRu}
              onChange={(e) => onChange('addressRu', e.target.value)}
              placeholder={t('Улица и номер дома', 'Russian address')}
            />
          </Field.Root>
          {listingTypes && locations && (
            <>
              <Field.Root>
                <Field.Label>{t('Тип объекта', 'Property type')}</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={listingTypeId}
                    onChange={(e) => onListingTypeChange?.(e.target.value)}
                  >
                    {listingTypes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {lang === 'en' ? item.name : item.name_ru || item.name}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
              <Field.Root>
                <Field.Label>{t('Город', 'City')}</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={locationId}
                    onChange={(e) => onLocationChange?.(e.target.value)}
                  >
                    {locations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {lang === 'en' ? item.name : item.name_ru || item.name}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            </>
          )}
        </Grid>
      </Box>

      <Box borderTop="1px solid" borderColor="gray.200" pt="18px">
        <Text fontSize="15px" fontWeight="600" mb="12px">
          {t('Описание', 'Description')}
        </Text>
        <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }} gap="12px">
          <Field.Root>
            <Field.Label>{t('На английском', 'English')}</Field.Label>
            <Textarea
              value={values.description}
              onChange={(e) => onChange('description', e.target.value)}
              rows={4}
              resize="vertical"
              placeholder={t(
                'Расскажите о проживании и особенностях объекта',
                'Describe the stay and what makes this property special'
              )}
            />
          </Field.Root>
          <Field.Root>
            <Field.Label>{t('На русском', 'Russian')}</Field.Label>
            <Textarea
              value={values.descriptionRu}
              onChange={(e) => onChange('descriptionRu', e.target.value)}
              rows={4}
              resize="vertical"
              placeholder={t('Расскажите об объекте', 'Describe this property in Russian')}
            />
          </Field.Root>
        </Grid>
      </Box>

      <Box borderTop="1px solid" borderColor="gray.200" pt="18px">
        <Flex align="baseline" justify="space-between" gap="12px" mb="12px">
          <Text fontSize="15px" fontWeight="600">
            {t('Фотографии', 'Photos')}
          </Text>
          <Text fontSize="12px" color="fg.muted">
            {images.length}/20
          </Text>
        </Flex>
        <Stack gap="12px">
          <Box
            as="label"
            position="relative"
            display="flex"
            alignItems="center"
            justifyContent="center"
            minH="116px"
            border="1px dashed"
            borderColor="gray.300"
            borderRadius="12px"
            bg="gray.50"
            cursor="pointer"
            transition="background 120ms ease, border-color 120ms ease"
            _hover={{ bg: 'blue.50', borderColor: 'blue.400' }}
            _focusWithin={{ outline: '2px solid', outlineColor: 'blue.500', outlineOffset: '2px' }}
          >
            <Stack align="center" gap="4px" pointerEvents="none">
              <Box color="blue.700" aria-hidden="true">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
                </svg>
              </Box>
              <Text fontSize="14px" fontWeight="600" color="blue.800">
                {t('Выбрать фотографии', 'Choose photos')}
              </Text>
              <Text fontSize="12px" color="fg.muted">
                {t('JPG, PNG или WebP · до 5 МБ на фото', 'JPG, PNG, or WebP · up to 5 MB each')}
              </Text>
            </Stack>
            <Input
              id="hotelier-listing-photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              position="absolute"
              inset="0"
              w="100%"
              h="100%"
              opacity="0"
              cursor="pointer"
              onChange={(event) => {
                void addImages(event.target.files);
                event.currentTarget.value = '';
              }}
            />
          </Box>
          {images.length === 0 ? (
            <Text fontSize="13px" color="fg.muted">
              {t(
                'Фотографии можно добавить сейчас или позже в редактировании объекта.',
                'You can add photos now or later when editing the property.'
              )}
            </Text>
          ) : (
            <Grid templateColumns="repeat(auto-fill, minmax(112px, 1fr))" gap="10px">
              {images.map((image, index) => (
                <Box
                  key={`${index}-${image.slice(0, 36)}`}
                  position="relative"
                  aspectRatio="4 / 3"
                  overflow="hidden"
                  borderRadius="10px"
                  bg="gray.100"
                >
                  <Image
                    src={image}
                    alt={`${t('Фото', 'Photo')} ${index + 1}`}
                    w="100%"
                    h="100%"
                    objectFit="cover"
                  />
                  <IconButton
                    label={t('Удалить фото', 'Remove photo')}
                    position="absolute"
                    top="6px"
                    right="6px"
                    display="inline-flex"
                    alignItems="center"
                    justifyContent="center"
                    w="30px"
                    h="30px"
                    borderRadius="full"
                    bg="white"
                    color="red.600"
                    boxShadow="0 1px 4px rgba(0,0,0,0.18)"
                    _hover={{ bg: 'red.50' }}
                    onClick={() => onImagesChange(images.filter((_, i) => i !== index))}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 6h18M8 6V4h8v2m3 0-.9 14H5.9L5 6m4 4v7m6-7v7" />
                    </svg>
                  </IconButton>
                </Box>
              ))}
            </Grid>
          )}
          {uploadError && (
            <Text role="alert" color="red.600" fontSize="13px">
              {uploadError}
            </Text>
          )}
        </Stack>
      </Box>
    </Stack>
  );
};
