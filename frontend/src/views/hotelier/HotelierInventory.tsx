'use client';

import { useState, type SubmitEvent } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  Box,
  Dialog,
  Flex,
  Image,
  NativeSelect,
  Portal,
  Stack,
  Table,
  Text,
  chakra,
} from '@chakra-ui/react';
import {
  getErrorMessage,
  useCreateHotelierUnitImageMutation,
  useCreateHotelierUnitMutation,
  useDeleteHotelierUnitImageMutation,
  useGetHotelierUnitsQuery,
  useUpdateHotelierUnitMutation,
  type HotelierListing,
  type HotelierUnitInput,
  type ListingUnit,
  type UnitType,
  useGetDictionariesQuery,
} from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { Button } from '@/shared/button';
import { Checkbox } from '@/shared/checkbox';
import { Input } from '@/shared/input';
import { CloseIcon } from '@/shared/icons';
import { HotelierTable, HotelierTableAction } from './HotelierTable';
import { HotelierMobileCard, HotelierMobileField, HotelierMobileList } from './HotelierMobileCards';

const UNIT_TYPES: { value: UnitType; ru: string; en: string }[] = [
  { value: 'property', ru: 'Объект целиком', en: 'Entire property' },
  { value: 'room', ru: 'Номер или комната', en: 'Room' },
  { value: 'bed', ru: 'Место в комнате', en: 'Bed' },
];
const typeName = (type: UnitType, lang: 'ru' | 'en') =>
  UNIT_TYPES.find((item) => item.value === type)?.[lang] ?? type;

const UnitDialog = ({
  listingId,
  unit,
  onClose,
  lang,
}: {
  listingId: string;
  unit?: ListingUnit;
  onClose: () => void;
  lang: 'ru' | 'en';
}) => {
  const unitsQuery = useGetHotelierUnitsQuery({ listingId });
  const currentUnit = unit
    ? (unitsQuery.data?.find((item) => item.id === unit.id) ?? unit)
    : undefined;
  const dictionaries = useGetDictionariesQuery('ru');
  const [create, createState] = useCreateHotelierUnitMutation();
  const [update, updateState] = useUpdateHotelierUnitMutation();
  const [addImage, addImageState] = useCreateHotelierUnitImageMutation();
  const [deleteImage, deleteImageState] = useDeleteHotelierUnitImageMutation();
  const [type, setType] = useState<UnitType>(unit?.type ?? 'room');
  const [parentId, setParentId] = useState(unit?.parent_unit_id ?? '');
  const [name, setName] = useState(unit?.name ?? '');
  const [nameRu, setNameRu] = useState(unit?.name_ru ?? '');
  const [price, setPrice] = useState(unit?.price_per_night ?? '');
  const [currency, setCurrency] = useState(unit?.currency ?? 'RUB');
  const [adults, setAdults] = useState(String(unit?.capacity_adults ?? 2));
  const [children, setChildren] = useState(String(unit?.capacity_children ?? 0));
  const [pets, setPets] = useState(unit?.pets_allowed ?? false);
  const [active, setActive] = useState(unit?.is_active ?? true);
  const [imageUrl, setImageUrl] = useState('');
  const mutationError = createState.isError
    ? getErrorMessage(createState.error)
    : updateState.isError
      ? getErrorMessage(updateState.error)
      : undefined;
  const imageError = addImageState.isError || deleteImageState.isError;

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (unit) {
      const result = await update({
        listingId,
        unitId: unit.id,
        body: {
          name: name.trim(),
          name_ru: nameRu.trim() || null,
          price_per_night: price,
          currency,
          capacity_adults: Number(adults),
          capacity_children: Number(children),
          pets_allowed: pets,
          is_active: active,
        },
      });
      if ('data' in result) {
        onClose();
      }
      return;
    }
    const body: HotelierUnitInput = {
      type,
      parent_unit_id: type === 'bed' ? parentId || null : null,
      name: name.trim(),
      name_ru: nameRu.trim() || null,
      price_per_night: price,
      currency,
      capacity_adults: Number(adults),
      capacity_children: Number(children),
      pets_allowed: pets,
      is_active: active,
    };
    const result = await create({ listingId, body });
    if ('data' in result) {
      onClose();
    }
  };

  const handleAddImage = async () => {
    if (!unit || !imageUrl.trim()) {
      return;
    }
    const order = Math.max(-1, ...(currentUnit?.images ?? []).map((image) => image.sort_order)) + 1;
    const result = await addImage({
      listingId,
      unitId: unit.id,
      url: imageUrl.trim(),
      sortOrder: order,
    });
    if ('data' in result) {
      setImageUrl('');
    }
  };

  const rooms = (unitsQuery.data ?? []).filter((item) => item.type === 'room');

  return (
    <Dialog.Root open onOpenChange={({ open }) => !open && onClose()} placement="center">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            w="720px"
            maxW="calc(100vw - 24px)"
            maxH="calc(100dvh - 24px)"
            overflowY="auto"
            overflowX="hidden"
            p={{ base: '16px', md: '22px' }}
            borderRadius="16px"
          >
            <chakra.form onSubmit={handleSubmit}>
              <Dialog.Title fontSize="19px" fontWeight="600" mb="18px">
                {unit
                  ? `${lang === 'en' ? 'Edit' : 'Изменить'}: ${lang === 'en' ? unit.name : unit.name_ru || unit.name}`
                  : lang === 'en'
                    ? 'Add unit'
                    : 'Добавить фонд'}
              </Dialog.Title>
              <Dialog.Body p="0">
                <Stack gap="12px">
                  {!unit && (
                    <Field label={lang === 'en' ? 'Unit type' : 'Тип фонда'}>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          value={type}
                          onChange={(event) => setType(event.target.value as UnitType)}
                        >
                          {UNIT_TYPES.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item[lang]}
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field>
                  )}
                  {!unit && type === 'bed' && (
                    <Field label={lang === 'en' ? 'Room' : 'Комната'}>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          value={parentId}
                          onChange={(event) => setParentId(event.target.value)}
                        >
                          <option value="">
                            {lang === 'en' ? 'Select a room' : 'Выберите комнату'}
                          </option>
                          {rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.name_ru || room.name}
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field>
                  )}
                  <Flex gap="12px" flexDirection={{ base: 'column', sm: 'row' }}>
                    <Field label={lang === 'en' ? 'Name (English)' : 'Название (англ.)'}>
                      <Input
                        value={name}
                        required
                        onChange={(event) => setName(event.target.value)}
                      />
                    </Field>
                    <Field label={lang === 'en' ? 'Name (Russian)' : 'Название (рус.)'}>
                      <Input value={nameRu} onChange={(event) => setNameRu(event.target.value)} />
                    </Field>
                  </Flex>
                  <Flex gap="12px" flexDirection={{ base: 'column', sm: 'row' }}>
                    <Field label={lang === 'en' ? 'Price per night' : 'Цена за ночь'}>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        required
                        onChange={(event) => setPrice(event.target.value)}
                      />
                    </Field>
                    <Field label={lang === 'en' ? 'Currency' : 'Валюта'}>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          value={currency}
                          onChange={(event) => setCurrency(event.target.value)}
                        >
                          {(dictionaries.data?.currencies ?? []).map((item) => (
                            <option key={item.code} value={item.code}>
                              {item.code}
                            </option>
                          ))}
                          {!dictionaries.data?.currencies.some(
                            (item) => item.code === currency
                          ) && <option value={currency}>{currency}</option>}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field>
                  </Flex>
                  <Flex gap="12px" flexDirection={{ base: 'column', sm: 'row' }}>
                    <Field label={lang === 'en' ? 'Adults' : 'Взрослых'}>
                      <Input
                        type="number"
                        min="0"
                        value={adults}
                        required
                        onChange={(event) => setAdults(event.target.value)}
                      />
                    </Field>
                    <Field label={lang === 'en' ? 'Children' : 'Детей'}>
                      <Input
                        type="number"
                        min="0"
                        value={children}
                        required
                        onChange={(event) => setChildren(event.target.value)}
                      />
                    </Field>
                  </Flex>
                  <Flex gap="20px" wrap="wrap">
                    <Checkbox
                      checked={pets}
                      onCheckedChange={(details) => setPets(details.checked === true)}
                    >
                      {lang === 'en' ? 'Pets allowed' : 'Можно с питомцами'}
                    </Checkbox>
                    <Checkbox
                      checked={active}
                      onCheckedChange={(details) => setActive(details.checked === true)}
                    >
                      {lang === 'en' ? 'Available for booking' : 'Доступен для брони'}
                    </Checkbox>
                  </Flex>
                  {mutationError && (
                    <Text role="alert" color="red.600">
                      {mutationError}
                    </Text>
                  )}
                  <Flex justify="flex-end" gap="8px" mt="6px">
                    <Button type="button" appearance="soft" onClick={onClose}>
                      {lang === 'en' ? 'Cancel' : 'Отмена'}
                    </Button>
                    <Button type="submit" loading={createState.isLoading || updateState.isLoading}>
                      {unit
                        ? lang === 'en'
                          ? 'Save changes'
                          : 'Сохранить'
                        : lang === 'en'
                          ? 'Create unit'
                          : 'Создать фонд'}
                    </Button>
                  </Flex>
                </Stack>
              </Dialog.Body>
            </chakra.form>

            {unit && (
              <Stack mt="20px" pt="16px" gap="12px" borderTop="1px solid" borderColor="gray.200">
                <Text fontWeight="600" fontSize="14px">
                  {lang === 'en' ? 'Unit photos' : 'Фотографии фонда'}
                </Text>
                {currentUnit?.images.length ? (
                  <Box
                    display="grid"
                    gridTemplateColumns="repeat(auto-fill, minmax(min(120px, 100%), 1fr))"
                    gap="10px"
                    minW="0"
                  >
                    {[...currentUnit.images]
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((image) => (
                        <Box
                          key={image.id}
                          position="relative"
                          aspectRatio="4 / 3"
                          overflow="hidden"
                          borderRadius="10px"
                          bg="gray.100"
                        >
                          <Image
                            src={image.url}
                            alt={lang === 'en' ? 'Unit photo' : 'Фото фонда'}
                            w="100%"
                            h="100%"
                            objectFit="cover"
                          />
                          <chakra.button
                            type="button"
                            aria-label={lang === 'en' ? 'Delete photo' : 'Удалить фото'}
                            position="absolute"
                            top="6px"
                            right="6px"
                            w="28px"
                            h="28px"
                            display="grid"
                            placeItems="center"
                            borderRadius="8px"
                            bg="whiteAlpha.900"
                            color="red.600"
                            disabled={deleteImageState.isLoading}
                            onClick={() =>
                              void deleteImage({ listingId, unitId: unit.id, imageId: image.id })
                            }
                          >
                            <CloseIcon size={16} />
                          </chakra.button>
                        </Box>
                      ))}
                  </Box>
                ) : (
                  <Text fontSize="13px" color="fg.muted">
                    {lang === 'en' ? 'No photos yet.' : 'Фото пока нет.'}
                  </Text>
                )}
                <Flex gap="8px" flexDirection={{ base: 'column', sm: 'row' }}>
                  <Input
                    type="url"
                    value={imageUrl}
                    placeholder={lang === 'en' ? 'https://… photo URL' : 'https://… ссылка на фото'}
                    aria-label={lang === 'en' ? 'Photo URL' : 'Ссылка на фотографию'}
                    onChange={(event) => setImageUrl(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleAddImage();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    loading={addImageState.isLoading}
                    disabled={!imageUrl.trim()}
                    onClick={() => void handleAddImage()}
                  >
                    {lang === 'en' ? 'Add photo' : 'Добавить фото'}
                  </Button>
                </Flex>
                {imageError && (
                  <Text role="alert" color="red.600">
                    {lang === 'en' ? 'Could not update photos.' : 'Не удалось обновить фотографии.'}
                  </Text>
                )}
              </Stack>
            )}
            <Dialog.CloseTrigger
              position="absolute"
              top="12px"
              right="16px"
              aria-label={lang === 'en' ? 'Close' : 'Закрыть'}
            >
              ×
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Stack gap="5px" flex="1" minW="0">
    <Text fontSize="12px" color="fg.muted">
      {label}
    </Text>
    {children}
  </Stack>
);

export const HotelierInventory = ({
  listings,
  lang,
}: {
  listings: HotelierListing[];
  lang: 'ru' | 'en';
}) => {
  const [listingId, setListingId] = useState(listings[0]?.id ?? '');
  const [editing, setEditing] = useState<ListingUnit | null | undefined>(undefined);
  const activeListingId = listings.some((item) => item.id === listingId)
    ? listingId
    : (listings[0]?.id ?? '');
  const units = useGetHotelierUnitsQuery(
    activeListingId ? { listingId: activeListingId } : skipToken
  );

  return (
    <Stack gap="16px">
      <Flex align="flex-end" justify="space-between" gap="12px" wrap="wrap">
        <Field label={lang === 'en' ? 'Property' : 'Объект'}>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={activeListingId}
              onChange={(event) => setListingId(event.target.value)}
            >
              {listings.map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {lang === 'en'
                    ? listing.title || listing.title_ru
                    : listing.title_ru || listing.title}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field>
        <Button
          type="button"
          size="sm"
          minH="34px"
          h="34px"
          px="10px"
          fontSize="12px"
          onClick={() => setEditing(null)}
        >
          {lang === 'en' ? 'Add unit' : 'Добавить фонд'}
        </Button>
      </Flex>
      {units.isLoading ? (
        <Text color="fg.muted">{lang === 'en' ? 'Loading units…' : 'Загружаем фонды…'}</Text>
      ) : units.isError ? (
        <Text role="alert" color="red.600">
          {lang === 'en'
            ? 'Could not load this property’s units.'
            : 'Не удалось загрузить фонды объекта.'}
        </Text>
      ) : units.data?.length ? (
        <>
          <HotelierMobileList>
            {units.data.map((unit) => {
              const thumbnail = [...unit.images].sort((a, b) => a.sort_order - b.sort_order)[0];
              const unitName = lang === 'en' ? unit.name : unit.name_ru || unit.name;
              return (
                <HotelierMobileCard key={unit.id}>
                  <Flex gap="12px" align="flex-start" minW="0">
                    {thumbnail ? (
                      <Image
                        src={thumbnail.url}
                        alt=""
                        w="72px"
                        h="72px"
                        objectFit="cover"
                        borderRadius="8px"
                        flexShrink="0"
                      />
                    ) : (
                      <Box w="72px" h="72px" bg="gray.100" borderRadius="8px" flexShrink="0" />
                    )}
                    <Stack gap="4px" flex="1" minW="0">
                      <Text
                        fontSize="16px"
                        fontWeight="600"
                        lineHeight="1.3"
                        overflowWrap="anywhere"
                      >
                        {unitName}
                      </Text>
                      <Text fontSize="13px" color="gray.600">
                        {typeName(unit.type, lang)}
                      </Text>
                      <Text
                        fontSize="13px"
                        color={unit.is_active ? 'green.700' : 'gray.600'}
                        fontWeight="600"
                      >
                        {unit.is_active
                          ? lang === 'en'
                            ? 'Available'
                            : 'Доступен'
                          : lang === 'en'
                            ? 'Hidden'
                            : 'Скрыт'}
                      </Text>
                    </Stack>
                  </Flex>
                  <Flex gap="12px" wrap="wrap">
                    <Box flex="1" minW="130px">
                      <HotelierMobileField label={lang === 'en' ? 'Capacity' : 'Вместимость'}>
                        {lang === 'en'
                          ? `${unit.capacity_adults} adults, ${unit.capacity_children} children`
                          : `${unit.capacity_adults} взр., ${unit.capacity_children} дет.`}
                      </HotelierMobileField>
                    </Box>
                    <Box flex="1" minW="130px">
                      <HotelierMobileField
                        label={lang === 'en' ? 'Price per night' : 'Цена за ночь'}
                      >
                        {formatMoney(unit.price_per_night, unit.currency)}
                      </HotelierMobileField>
                    </Box>
                  </Flex>
                  {(unit.parent_name || unit.pets_allowed) && (
                    <Text fontSize="13px" color="gray.600" overflowWrap="anywhere">
                      {[
                        unit.parent_name &&
                          `${lang === 'en' ? 'Room' : 'Комната'}: ${unit.parent_name}`,
                        unit.pets_allowed && (lang === 'en' ? 'Pets allowed' : 'Можно с питомцем'),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  )}
                  <Button
                    type="button"
                    appearance="soft"
                    minH="44px"
                    w="100%"
                    onClick={() => setEditing(unit)}
                  >
                    {lang === 'en' ? 'Edit unit' : 'Изменить фонд'}
                  </Button>
                </HotelierMobileCard>
              );
            })}
          </HotelierMobileList>
          <Box display={{ base: 'none', lg: 'block' }}>
            <HotelierTable>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>{lang === 'en' ? 'Photo' : 'Фото'}</Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Unit' : 'Фонд'}</Table.ColumnHeader>
                  <Table.ColumnHeader>
                    {lang === 'en' ? 'Accommodation type' : 'Тип размещения'}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>
                    {lang === 'en' ? 'Capacity' : 'Вместимость'}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>
                    {lang === 'en' ? 'Price per night' : 'Цена за ночь'}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Status' : 'Статус'}</Table.ColumnHeader>
                  <Table.ColumnHeader>{lang === 'en' ? 'Actions' : 'Действия'}</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {units.data.map((unit) => {
                  const thumbnail = [...unit.images].sort((a, b) => a.sort_order - b.sort_order)[0];
                  return (
                    <Table.Row key={unit.id}>
                      <Table.Cell>
                        <chakra.button
                          type="button"
                          aria-label={`${lang === 'en' ? 'Edit unit' : 'Изменить фонд'} ${lang === 'en' ? unit.name : unit.name_ru || unit.name}`}
                          display="block"
                          cursor="pointer"
                          onClick={() => setEditing(unit)}
                        >
                          {thumbnail ? (
                            <Image
                              src={thumbnail.url}
                              alt={unit.name_ru || unit.name}
                              w="76px"
                              h="56px"
                              objectFit="cover"
                              borderRadius="8px"
                            />
                          ) : (
                            <Box w="76px" h="56px" bg="gray.100" borderRadius="8px" />
                          )}
                        </chakra.button>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontWeight="600">{unit.name_ru || unit.name}</Text>
                        {unit.parent_name && (
                          <Text mt="3px" fontSize="12px" color="fg.muted">
                            {lang === 'en' ? 'Room:' : 'Комната:'} {unit.parent_name}
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>{typeName(unit.type, lang)}</Table.Cell>
                      <Table.Cell>
                        {lang === 'en'
                          ? `${unit.capacity_adults} adults, ${unit.capacity_children} children`
                          : `${unit.capacity_adults} взр., ${unit.capacity_children} дет.`}
                        <Text fontSize="12px" color="fg.muted">
                          {unit.pets_allowed
                            ? lang === 'en'
                              ? 'Pets allowed'
                              : 'Можно с питомцем'
                            : lang === 'en'
                              ? 'No pets'
                              : 'Без питомцев'}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>{formatMoney(unit.price_per_night, unit.currency)}</Table.Cell>
                      <Table.Cell>
                        {unit.is_active
                          ? lang === 'en'
                            ? 'Available'
                            : 'Доступен'
                          : lang === 'en'
                            ? 'Hidden'
                            : 'Скрыт'}
                      </Table.Cell>
                      <Table.Cell>
                        <HotelierTableAction
                          type="button"
                          appearance="soft"
                          onClick={() => setEditing(unit)}
                        >
                          {lang === 'en' ? 'Edit' : 'Изменить'}
                        </HotelierTableAction>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </HotelierTable>
          </Box>
        </>
      ) : (
        <Stack gap="8px" p="22px" border="1px dashed" borderColor="gray.300" borderRadius="14px">
          <Text fontWeight="600">
            {lang === 'en' ? 'No units configured yet' : 'Фонд еще не настроен'}
          </Text>
          <Text fontSize="14px" color="fg.muted">
            {lang === 'en'
              ? 'Add an entire property, a room or a bed so guests can book a stay.'
              : 'Добавьте объект целиком, номер или место в комнате, чтобы гости могли бронировать проживание.'}
          </Text>
        </Stack>
      )}
      {editing !== undefined && (
        <UnitDialog
          key={editing?.id ?? 'new-unit'}
          listingId={activeListingId}
          unit={editing ?? undefined}
          lang={lang}
          onClose={() => setEditing(undefined)}
        />
      )}
    </Stack>
  );
};
