'use client';

import { Box, chakra, Flex, Heading, Skeleton, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { getDemoReviews } from '@/lib/reviews';
import { formatStartingPrice } from '@/lib/format';
import type { Stay } from '@/lib/stay';
import { DateRangePicker } from '@/shared/date-range-picker';
import { GuestsPicker } from '@/shared/guests-picker';
import { MapIcon, PinIcon } from '@/shared/icons';
import { ResultPlaceholder } from '@/shared/result-placeholder';
import { ShareButton } from '@/shared/share-button';
import { Showcase } from '@/views/marketplace';
import { BookingSummary } from '../BookingSummary';
import { Gallery } from '../Gallery';
import { LISTING_MAP_ID, ListingMap } from '../ListingMap';
import { ReviewsSummary } from '../ReviewsSummary';
import { ListingFeatureTags } from './ListingFeatureTags';
import { UnitCard } from '../UnitCard';
import {
  aboutMetaStyle,
  aboutStyle,
  addressRowStyle,
  addressStyle,
  asideStyle,
  carouselControlsStyle,
  carouselControlStyle,
  carouselItemStyle,
  carouselStyle,
  backLinkStyle,
  contentStyle,
  datesStyle,
  descriptionStyle,
  guestsStyle,
  gallerySkeletonStyle,
  headerStyle,
  mainStyle,
  mapBlockStyle,
  mapLinkStyle,
  messageStyle,
  pinStyle,
  rootStyle,
  sectionTitleStyle,
  sectionHeadingRowStyle,
  startingPriceStyle,
  showcaseStyle,
  stayRowStyle,
  titleBlockStyle,
  titleRowStyle,
  titleSkeletonStyle,
  titleStyle,
} from './ListingPage.styles';
import { useController, type SearchFiltersParams } from './useController';

export type { SearchFiltersParams };

type ListingPageProps = {
  id: string;
  stay: Stay;
  /** Параметры и фильтры поиска, из выдачи которого открыли объект */
  searchFilters?: SearchFiltersParams;
  /** Направление поиска, из выдачи которого открыли объект (устарело, используйте searchFilters) */
  searchQuery?: string;
};

/**
 * Страница объекта: ссылка обратно к выдаче, если пришли из поиска; название, адрес,
 * кнопка «На карте» к блоку с картой и «Поделиться»; сводка отзывов, галерея фото
 * и «Об объекте» (тип, время заезда, описание); под ними выбор дат и гостей, список
 * свободных на эти даты номеров в горизонтальной ленте, компактная карта справа
 * и экскурсии и услуги в городе объекта.
 * Справа расположена сводка поездки: номера, добавленные услуги, общий итог и кнопка
 * «Забронировать», которая оформляет всё сразу. Даты и гости меняются прямо здесь
 * и сохраняются в адресе. Экскурсии на витрине предлагаются в выбранные даты поездки.
 */
export const ListingPage = ({ id, stay: initialStay, searchFilters, searchQuery }: ListingPageProps) => {
  const effectiveFilters: SearchFiltersParams =
    searchFilters ?? (searchQuery !== undefined ? { query: searchQuery } : {});
  const {
    images,
    position,
    handleShowMap,
    mapOpen,
    openMap,
    closeMap,
    backHref,
    lang,
    listing,
    listingError,
    typeName,
    locationName,
    stay,
    nights,
    trip,
    units,
    unitsRef,
    unitScroll,
    updateUnitScroll,
    handleScrollUnits,
    unitsLoading,
    unitsError,
    selectedIds,
    selectedUnits,
    shortage,
    fits,
    total,
    currency,
    isSignedIn,
    authRestored,
    cart,
    bookingPending,
    bookingError,
    handleDatesChange,
    handleGuestsChange,
    handleToggleUnit,
    handleBook,
  } = useController(id, initialStay, effectiveFilters);
  const reviews = listing ? getDemoReviews(listing) : null;

  if (listingError) {
    return (
      <Box {...rootStyle}>
        <Text {...messageStyle}>
          Не удалось открыть объект. Возможно, его уже сняли с публикации.
        </Text>
      </Box>
    );
  }

  const renderUnits = () => {
    if (!nights) {
      return (
        <Stack gap="4px">
          {listing?.starting_price && (
            <Text {...startingPriceStyle}>
              {formatStartingPrice(
                listing.starting_price.amount,
                listing.starting_price.currency,
                listing.starting_price.unit_type
              )}
            </Text>
          )}
          <Text {...messageStyle}>
            Выберите даты, чтобы увидеть доступные варианты и итоговую стоимость.
          </Text>
        </Stack>
      );
    }
    if (unitsLoading) {
      return (
        <>
          <ResultPlaceholder />
          <ResultPlaceholder />
        </>
      );
    }
    if (unitsError) {
      return (
        <Text {...messageStyle}>
          Не удалось загрузить варианты размещения. Попробуйте обновить страницу.
        </Text>
      );
    }
    if (!units.length) {
      return (
        <Text {...messageStyle}>На эти даты свободных вариантов нет. Попробуйте другие даты.</Text>
      );
    }
    return (
      <>
        <Box
          ref={unitsRef}
          role="region"
          aria-label="Варианты размещения"
          tabIndex={0}
          onScroll={updateUnitScroll}
          {...carouselStyle}
        >
          {units.map((unit) => (
            <Box key={unit.id} {...carouselItemStyle}>
              <UnitCard
                unit={unit}
                nights={nights}
                guests={stay.guests}
                selected={selectedIds.includes(unit.id)}
                onToggle={() => handleToggleUnit(unit.id)}
              />
            </Box>
          ))}
        </Box>
      </>
    );
  };

  const address = [locationName, listing?.address].filter(Boolean).join(', ');

  return (
    <Stack {...rootStyle}>
      {backHref && (
        <Link href={backHref} style={backLinkStyle}>
          ← К результатам поиска
        </Link>
      )}
      <Stack as="header" {...headerStyle}>
        {listing ? (
          <Flex {...titleRowStyle}>
            <Stack {...titleBlockStyle}>
              <Heading as="h1" {...titleStyle}>
                {listing.title}
              </Heading>
              <Flex {...addressRowStyle}>
                {address && (
                  <Flex {...addressStyle}>
                    <chakra.span {...pinStyle}>
                      <PinIcon size={18} />
                    </chakra.span>
                    {address}
                  </Flex>
                )}
                {position && (
                  <chakra.a href={`#${LISTING_MAP_ID}`} {...mapLinkStyle} onClick={handleShowMap}>
                    <MapIcon size={18} />
                    На карте
                  </chakra.a>
                )}
              </Flex>
            </Stack>
            <ShareButton title={listing.title} />
          </Flex>
        ) : (
          <Skeleton {...titleSkeletonStyle} />
        )}
      </Stack>

      {listing && reviews && (
        <ReviewsSummary
          key={listing.id}
          reviews={{ ...reviews, summary: listing.review_summary?.trim() || reviews.summary }}
          average_rating_details={listing.average_rating_details}
        />
      )}

      {listing ? (
        <Gallery images={images} title={listing.title} />
      ) : (
        <Skeleton {...gallerySkeletonStyle} />
      )}

      {listing && (
        <Stack as="section" {...aboutStyle}>
          <Flex {...sectionHeadingRowStyle}>
            <Heading as="h2" {...sectionTitleStyle}>
              Об объекте
            </Heading>
            <Text {...aboutMetaStyle}>
              {[typeName, `заезд с ${listing.check_in_time.slice(0, 5)}`]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Flex>
          {listing.description && <Text {...descriptionStyle}>{listing.description}</Text>}
          {listing.features?.length ? (
            <ListingFeatureTags features={listing.features} lang={lang} />
          ) : null}
        </Stack>
      )}

      <Box {...contentStyle}>
        <Stack as="main" {...mainStyle}>
          <Flex {...sectionHeadingRowStyle}>
            <Heading as="h2" {...sectionTitleStyle}>
              Варианты размещения
            </Heading>
            {units.length > 1 && (
              <Flex {...carouselControlsStyle}>
                <chakra.button
                  type="button"
                  aria-label="Прокрутить варианты влево"
                  disabled={!unitScroll.left}
                  onClick={() => handleScrollUnits(-1)}
                  {...carouselControlStyle}
                >
                  <chakra.svg viewBox="0 0 24 24" w="20px" h="20px" aria-hidden="true">
                    <path
                      d="m14 5-7 7 7 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </chakra.svg>
                </chakra.button>
                <chakra.button
                  type="button"
                  aria-label="Прокрутить варианты вправо"
                  disabled={!unitScroll.right}
                  onClick={() => handleScrollUnits(1)}
                  {...carouselControlStyle}
                >
                  <chakra.svg viewBox="0 0 24 24" w="20px" h="20px" aria-hidden="true">
                    <path
                      d="m10 5 7 7-7 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </chakra.svg>
                </chakra.button>
              </Flex>
            )}
          </Flex>
          <Flex {...stayRowStyle}>
            <DateRangePicker
              {...datesStyle}
              forBooking
              fromLabel="Заезд"
              toLabel="Выезд"
              fromPlaceholder="Выбрать дату"
              toPlaceholder="Выбрать дату"
              value={{ from: stay.checkin, to: stay.checkout }}
              onValueChange={handleDatesChange}
            />
            <GuestsPicker {...guestsStyle} value={stay.guests} onValueChange={handleGuestsChange} />
          </Flex>
          <Stack>{renderUnits()}</Stack>
        </Stack>

        <Box as="aside" {...asideStyle}>
          <BookingSummary
            stay={stay}
            nights={nights}
            selectedUnits={selectedUnits}
            shortage={shortage}
            fits={fits}
            total={total}
            currency={currency}
            isSignedIn={isSignedIn}
            authRestored={authRestored}
            pending={bookingPending}
            error={bookingError}
            onBook={handleBook}
          />
        </Box>

        {listing && position && (
          <Box {...mapBlockStyle}>
            <ListingMap
              id={listing.id}
              title={listing.title}
              city={locationName ?? ''}
              address={address}
              latitude={position.latitude}
              longitude={position.longitude}
              mobileOpen={mapOpen}
              onMobileOpen={openMap}
              onMobileClose={closeMap}
            />
          </Box>
        )}

        {listing && (
          <Box {...showcaseStyle}>
            <Showcase
              locationId={listing.location_id}
              title={
                locationName ? `Экскурсии и услуги: ${locationName}` : 'Экскурсии и услуги рядом'
              }
              trip={trip}
              cart={cart}
              defaultQuantity={stay.guests.adults + stay.guests.children}
            />
          </Box>
        )}
      </Box>
    </Stack>
  );
};
