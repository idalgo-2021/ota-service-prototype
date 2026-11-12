'use client';

import { useState, type SubmitEvent } from 'react';
import { Box, Dialog, Portal, Stack, Text, chakra } from '@chakra-ui/react';
import { Checkbox } from '@/shared/checkbox';
import {
  getErrorMessage,
  useCreateHotelierListingMutation,
  type Dictionaries,
} from '@/lib/api';
import { Button } from '@/shared/button';
import { IconButton } from '@/shared/icon-button/IconButton';
import {
  HotelierListingFormFields,
  type HotelierListingFormValues,
} from './HotelierListingFormFields';

export const HotelierListingCreateDialog = ({
  dictionaries,
  lang,
  onClose,
}: {
  dictionaries: Dictionaries;
  lang: 'ru' | 'en';
  onClose: () => void;
}) => {
  const [create, state] = useCreateHotelierListingMutation();
  const [title, setTitle] = useState('');
  const [titleRu, setTitleRu] = useState('');
  const [address, setAddress] = useState('');
  const [addressRu, setAddressRu] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionRu, setDescriptionRu] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [featureIDs, setFeatureIDs] = useState<number[]>([]);
  const [listingTypeId, setListingTypeId] = useState(
    String(dictionaries.listing_types[0]?.id ?? '')
  );
  const [locationId, setLocationId] = useState(String(dictionaries.locations[0]?.id ?? ''));
  const [error, setError] = useState('');
  const t = (ru: string, en: string) => (lang === 'en' ? en : ru);
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
    const result = await create({
      title,
      title_ru: titleRu,
      address,
      address_ru: addressRu,
      description,
      description_ru: descriptionRu,
      listing_type_id: Number(listingTypeId),
      location_id: Number(locationId),
      images,
      feature_ids: featureIDs,
    });
    if ('data' in result) {
      const listingId = result.data?.id;
      if (!listingId) {
        setError(t('Сервер не вернул ID объекта.', 'The server did not return the property ID.'));
        return;
      }
      onClose();
    } else {
      setError(
        getErrorMessage(result.error) ??
          t('Не удалось создать объект.', 'Could not create property.')
      );
    }
  };

  const canCreate = dictionaries.listing_types.length > 0 && dictionaries.locations.length > 0;
  return (
    <Dialog.Root open onOpenChange={({ open }) => !open && onClose()} placement="center">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            w="760px"
            maxW="calc(100vw - 24px)"
            maxH="calc(100dvh - 24px)"
            overflowY="auto"
            p={{ base: '16px', md: '22px' }}
            borderRadius="16px"
          >
            <chakra.form onSubmit={submit}>
              <Dialog.Title fontSize="22px" fontWeight="650" mb="5px" pr="40px">
                {t('Новый объект', 'New property')}
              </Dialog.Title>
              <Text color="fg.muted" fontSize="14px" mb="20px">
                {t(
                  'Добавьте основные сведения об объекте размещения.',
                  'Add the essential details for this property.'
                )}
              </Text>
              <Dialog.Body p="0">
                <Stack gap="22px">
                  <HotelierListingFormFields
                    values={values}
                    onChange={onChange}
                    images={images}
                    onImagesChange={setImages}
                    lang={lang}
                    listingTypes={dictionaries.listing_types}
                    locations={dictionaries.locations}
                    listingTypeId={listingTypeId}
                    locationId={locationId}
                    onListingTypeChange={setListingTypeId}
                    onLocationChange={setLocationId}
                  />
                  <Box>
                    <Text fontSize="15px" fontWeight="600" mb="10px">
                      {t('Особенности объекта', 'Property features')}
                    </Text>
                    <Stack gap="8px">
                      {dictionaries.features.map((feature) => (
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
                  </Box>
                  {!canCreate && (
                    <Text role="alert" color="red.600" fontSize="14px">
                      {t(
                        'Справочники типов и городов пока недоступны.',
                        'Property types and cities are unavailable.'
                      )}
                    </Text>
                  )}
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
                  <Button
                    type="submit"
                    loading={state.isLoading}
                    disabled={!canCreate}
                  >
                    {t('Создать', 'Create')}
                  </Button>
                </Box>
              </Dialog.Footer>
            </chakra.form>
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
