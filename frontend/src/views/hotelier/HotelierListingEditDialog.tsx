'use client';

import { useState, type SubmitEvent } from 'react';
import { Box, Dialog, Field, Flex, Grid, Portal, Stack, Text, chakra } from '@chakra-ui/react';
import {
  getErrorMessage,
  useUpdateHotelierListingCardMutation,
  type FeatureTag,
  type HotelierListing,
} from '@/lib/api';
import { Button } from '@/shared/button';
import { Checkbox } from '@/shared/checkbox';
import { IconButton } from '@/shared/icon-button/IconButton';
import { Input } from '@/shared/input';
import { SegmentedControl, type SegmentedControlOption } from '@/shared/segmented-control';
import {
  HotelierListingFormFields,
  type HotelierListingFormValues,
} from './HotelierListingFormFields';
import { HotelierListingVideos } from './HotelierListingVideos';

export type HotelierListingDialogTab = 'details' | 'videos';

export const HotelierListingEditDialog = ({
  listing,
  featureTags,
  lang,
  initialTab = 'details',
  onClose,
}: {
  listing: HotelierListing;
  featureTags: FeatureTag[];
  lang: 'ru' | 'en';
  initialTab?: HotelierListingDialogTab;
  onClose: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<HotelierListingDialogTab>(initialTab);
  const [update, state] = useUpdateHotelierListingCardMutation();
  const [title, setTitle] = useState(listing.title ?? '');
  const [titleRu, setTitleRu] = useState(listing.title_ru ?? '');
  const [address, setAddress] = useState(listing.address ?? '');
  const [addressRu, setAddressRu] = useState(listing.address_ru ?? '');
  const [description, setDescription] = useState(listing.description ?? '');
  const [descriptionRu, setDescriptionRu] = useState(listing.description_ru ?? '');
  const [checkInTime, setCheckInTime] = useState(listing.check_in_time?.slice(0, 5) ?? '14:00');
  const [images, setImages] = useState<string[]>(() => {
    const gallery = [...(listing.images ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((image) => image.url);
    if (listing.main_picture && !gallery.includes(listing.main_picture)) {
      gallery.unshift(listing.main_picture);
    }
    return gallery;
  });
  const [featureIDs, setFeatureIDs] = useState<number[]>(
    () => listing.features?.map((tag) => tag.id) ?? []
  );
  const [isActive, setIsActive] = useState(listing.is_active);
  const [validationError, setValidationError] = useState('');
  const t = (ru: string, en: string) => (lang === 'en' ? en : ru);

  const tabs: SegmentedControlOption<HotelierListingDialogTab>[] = [
    {
      value: 'details',
      label: t('Основные данные и фото', 'Details & photos'),
      title: t('Основные данные и фото', 'Details & photos'),
    },
    {
      value: 'videos',
      label: t('Видеоролики', 'Videos'),
      title: t('Видеоролики объекта', 'Property videos'),
    },
  ];

  const values: HotelierListingFormValues = {
    title,
    titleRu,
    address,
    addressRu,
    description,
    descriptionRu,
  };
  const onChange = (field: keyof HotelierListingFormValues, value: string) => {
    const setters = {
      title: setTitle,
      titleRu: setTitleRu,
      address: setAddress,
      addressRu: setAddressRu,
      description: setDescription,
      descriptionRu: setDescriptionRu,
    };
    setters[field](value);
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError('');
    const result = await update({
      listingId: listing.id,
      body: {
        title,
        title_ru: titleRu,
        address,
        address_ru: addressRu,
        description,
        description_ru: descriptionRu,
        images,
        feature_ids: featureIDs,
        is_active: isActive,
        check_in_time: checkInTime,
      },
    });
    if ('data' in result) {
      onClose();
    }
  };
  const error = validationError || (state.isError ? getErrorMessage(state.error) : '');

  return (
    <Dialog.Root open onOpenChange={({ open }) => !open && onClose()} placement="center">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            w="780px"
            maxW="calc(100vw - 24px)"
            maxH="calc(100dvh - 24px)"
            overflowY="auto"
            p={{ base: '16px', md: '22px' }}
            borderRadius="16px"
          >
            <Dialog.Title fontSize="22px" fontWeight="650" mb="4px" pr="40px">
              {t('Редактировать объект', 'Edit property')}
            </Dialog.Title>
            <Text color="fg.muted" fontSize="14px" mb="14px">
              {lang === 'en' ? listing.title : listing.title_ru || listing.title}
            </Text>

            <Box mb="20px">
              <SegmentedControl
                options={tabs}
                value={activeTab}
                onValueChange={setActiveTab}
              />
            </Box>

            {activeTab === 'details' ? (
              <chakra.form onSubmit={submit}>
                <Dialog.Body p="0">
                  <Stack gap="22px">
                    <Box>
                      <Text fontSize="15px" fontWeight="600" mb="12px">
                        {t('Дополнительная информация', 'Additional information')}
                      </Text>
                      <Grid
                        templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }}
                        gap="12px"
                      >
                        <Field.Root>
                          <Field.Label>{t('Локация', 'Location')}</Field.Label>
                          <Text minH="40px" display="flex" alignItems="center">
                            {lang === 'en'
                              ? listing.location_name || listing.location_name_ru || '—'
                              : listing.location_name_ru || listing.location_name || '—'}
                          </Text>
                        </Field.Root>
                        <Field.Root>
                          <Field.Label>{t('Время заезда', 'Check-in time')}</Field.Label>
                          <Input
                            type="time"
                            value={checkInTime}
                            onChange={(event) => setCheckInTime(event.target.value)}
                            required
                          />
                        </Field.Root>
                        <Field.Root>
                          <Field.Label>{t('Создан', 'Created')}</Field.Label>
                          <Text minH="40px" display="flex" alignItems="center">
                            {new Date(listing.created_at).toLocaleString(
                              lang === 'en' ? 'en-GB' : 'ru-RU'
                            )}
                          </Text>
                        </Field.Root>
                        <Field.Root>
                          <Field.Label>{t('Деактивирован', 'Deactivated')}</Field.Label>
                          <Text minH="40px" display="flex" alignItems="center">
                            {listing.deactivated_at
                              ? new Date(listing.deactivated_at).toLocaleString(
                                  lang === 'en' ? 'en-GB' : 'ru-RU'
                                )
                              : '—'}
                          </Text>
                        </Field.Root>
                      </Grid>
                    </Box>
                    <HotelierListingFormFields
                      values={values}
                      onChange={onChange}
                      images={images}
                      onImagesChange={setImages}
                      lang={lang}
                    />
                    <Checkbox
                      checked={isActive}
                      onCheckedChange={(details) => setIsActive(details.checked === true)}
                    >
                      {t('Объект активен', 'Property is active')}
                    </Checkbox>
                    <Box borderTop="1px solid" borderColor="gray.200" pt="18px">
                      <Text fontSize="15px" fontWeight="600" mb="12px">
                        {t('Особенности объекта', 'Property features')}
                      </Text>
                      <Stack gap="8px">
                        {featureTags.map((feature) => (
                          <Checkbox
                            key={feature.id}
                            checked={featureIDs.includes(feature.id)}
                            onCheckedChange={(details) =>
                              setFeatureIDs((current) =>
                                details.checked === true
                                  ? [...current, feature.id]
                                  : current.filter((id) => id !== feature.id)
                              )
                            }
                          >
                            {lang === 'ru' ? feature.name_ru : feature.name}
                          </Checkbox>
                        ))}
                      </Stack>
                      <Text mt="8px" fontSize="12px" color="fg.muted">
                        {t(
                          'Рейтинг и другие рассчитанные показатели нельзя изменить.',
                          'Ratings and other calculated metrics cannot be edited.'
                        )}
                      </Text>
                    </Box>

                    {/* Баннер перехода к видеороликам */}
                    <Box borderTop="1px solid" borderColor="gray.200" pt="16px">
                      <Flex
                        align="center"
                        justify="space-between"
                        wrap="wrap"
                        gap="10px"
                        bg="#f5f8ff"
                        border="1px solid"
                        borderColor="#d9e6ff"
                        p="14px 16px"
                        borderRadius="12px"
                      >
                        <Flex align="center" gap="10px">
                          <Box color="#0757c7">
                            <svg
                              width="22"
                              height="22"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="2" y="4" width="20" height="16" rx="2" />
                              <path d="m10 9 5 3-5 3V9z" />
                            </svg>
                          </Box>
                          <Box>
                            <Text fontSize="14px" fontWeight="600" color="blue.950">
                              {t('Видеоролики объекта', 'Property videos')}
                            </Text>
                            <Text fontSize="12px" color="blue.800">
                              {t(
                                'Управляйте видеороликами для ленты и карточки отеля',
                                'Manage video clips for the feed and property card'
                              )}
                            </Text>
                          </Box>
                        </Flex>
                        <Button
                          type="button"
                          size="sm"
                          appearance="soft"
                          onClick={() => setActiveTab('videos')}
                        >
                          {t('Управление видео →', 'Manage videos →')}
                        </Button>
                      </Flex>
                    </Box>

                    {error && (
                      <Text role="alert" color="red.600" fontSize="14px">
                        {error}
                      </Text>
                    )}
                  </Stack>
                </Dialog.Body>
                <Dialog.Footer px="0" pt="18px">
                  <Box display="flex" justifyContent="flex-end" gap="8px" w="100%">
                    <Button type="button" appearance="soft" onClick={onClose}>
                      {t('Отмена', 'Cancel')}
                    </Button>
                    <Button type="submit" loading={state.isLoading}>
                      {t('Сохранить', 'Save')}
                    </Button>
                  </Box>
                </Dialog.Footer>
              </chakra.form>
            ) : (
              <Stack gap="18px">
                <Dialog.Body p="0">
                  <HotelierListingVideos listingId={listing.id} lang={lang} />
                </Dialog.Body>
                <Dialog.Footer px="0" pt="18px" borderTop="1px solid" borderColor="gray.200">
                  <Flex justify="space-between" align="center" w="100%">
                    <Button type="button" appearance="soft" onClick={() => setActiveTab('details')}>
                      {t('← К основным данным', '← Back to details')}
                    </Button>
                    <Button type="button" onClick={onClose}>
                      {t('Готово', 'Done')}
                    </Button>
                  </Flex>
                </Dialog.Footer>
              </Stack>
            )}

            <Dialog.CloseTrigger asChild>
              <IconButton
                label={t('Закрыть форму', 'Close form')}
                position="absolute"
                top="12px"
                right="12px"
                display="inline-flex"
                alignItems="center"
                justifyContent="center"
                w="40px"
                h="40px"
                borderRadius="8px"
                color="gray.600"
                _hover={{ bg: 'gray.100' }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M5 5l14 14M19 5 5 19" />
                </svg>
              </IconButton>
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
