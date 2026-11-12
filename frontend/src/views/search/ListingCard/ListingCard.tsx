'use client';

import { chakra, Flex, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Guests, Listing } from '@/lib/api';
import { formatCount, formatMoney, formatStartingPrice } from '@/lib/format';
import { formatRating, getPraise, type ListingReviews } from '@/lib/reviews';
import { formatGuestsForPrice, formatNights } from '@/lib/stay';
import { Button } from '@/shared/button';
import { CompareButton } from '@/shared/hotel-compare/CompareButton';
import { useAppSelector } from '@/lib/hooks';
import { Card } from '@/shared/card';
import { ImageCarousel, orderedImageUrls } from '@/shared/image-carousel';
import { SparklesIcon, StarIcon } from '@/shared/icons';
import {
  addressStyle,
  cardStyle,
  descriptionStyle,
  footerStyle,
  imageStyle,
  infoStyle,
  linkButtonStyle,
  lineStyle,
  praiseIconStyle,
  praiseStyle,
  priceStyle,
  priceTextStackStyle,
  priceTotalStyle,
  ratingRowStyle,
  ratingStyle,
  reviewsStyle,
  starStyle,
  rowStyle,
  titleStyle,
  typeStyle,
} from './ListingCard.styles';
import { useController } from './useController';
import type { SearchItem } from '../useListingsSearch';

type ListingCardProps = {
  listing: Listing;
  /** Без дат — базовая цена; с датами — самый дешёвый подходящий вариант. */
  price?: SearchItem['price'];
  nights?: number;
  guests: Guests;
  /** Страница объекта с теми же датами и гостями */
  href: string;
  typeName?: string;
  locationName?: string;
  reviews: ListingReviews;
  selected?: boolean;
  onSelect?: () => void;
};

/**
 * Карточка объявления в выдаче: главное фото; название и справа тип жилья; оценка с числом
 * отзывов и справа адрес; сразу под оценкой — что хвалят гости; чуть ниже описание
 * в две строки; внизу — цена «от … за ночь» с итогом за поездку,
 * если выбраны даты, и кнопка перехода к вариантам размещения. Нажатие на карточку (или
 * Enter/пробел) выбирает объявление; выбранная карточка обведена и прокручивается
 * в видимую часть списка.
 */
export const ListingCard = ({
  listing,
  price,
  nights,
  guests,
  href,
  typeName,
  locationName,
  reviews,
  selected = false,
  onSelect,
}: ListingCardProps) => {
  const router = useRouter();
  const { cardRef, handleKeyDown } = useController(selected, onSelect);
  const compared = useAppSelector((state) => state.hotelCompare.ids.includes(listing.id));
  const address = [locationName, listing.address].filter(Boolean).join(', ');
  const praise = getPraise(reviews);
  const pricedGuests =
    price && !price.starting && nights ? formatGuestsForPrice(guests) : undefined;
  const images = orderedImageUrls(listing.main_picture, listing.images);

  return (
    <Card
      ref={cardRef}
      data-compared={compared}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={listing.title}
      onClick={() => router.push(href)}
      onKeyDown={handleKeyDown}
      {...cardStyle}
    >
      <Flex {...rowStyle}>
        <ImageCarousel images={images} title={listing.title} imageStyle={imageStyle} />
        <Stack {...infoStyle}>
          <Flex {...lineStyle}>
            <Text {...titleStyle}>{listing.title}</Text>
            <Flex align="center" gap="8px">
              {typeName && <Text {...typeStyle}>{typeName}</Text>}
              <CompareButton id={listing.id} title={listing.title} />
            </Flex>
          </Flex>
          <Stack {...reviewsStyle}>
            <Flex {...lineStyle}>
              <Flex {...ratingRowStyle}>
                <chakra.span {...starStyle}>
                  <StarIcon size={18} />
                </chakra.span>
                <Text as="span" {...ratingStyle}>
                  {formatRating(reviews.rating)}
                </Text>
                · {formatCount(reviews.count, ['отзыв', 'отзыва', 'отзывов'])}
              </Flex>
              {address && <Text {...addressStyle}>{address}</Text>}
            </Flex>
            {praise && (
              <Flex {...praiseStyle}>
                <chakra.span {...praiseIconStyle}>
                  <SparklesIcon size={18} />
                </chakra.span>
                Гости хвалят: {praise}
              </Flex>
            )}
          </Stack>
          {listing.description && (
            <Text {...descriptionStyle} title={listing.description}>
              {listing.description}
            </Text>
          )}
          <Flex {...footerStyle}>
            {price && (
              <Stack {...priceTextStackStyle}>
                <Text {...priceStyle}>
                  {price.starting
                    ? formatStartingPrice(price.perNight, price.currency, price.unitType)
                    : `от ${formatMoney(price.perNight, price.currency)} за ночь`}
                </Text>
                {nights && (
                  <Text {...priceTotalStyle}>
                    {formatMoney(price.perNight * nights, price.currency)} за {formatNights(nights)}
                  </Text>
                )}
                {pricedGuests && (
                  <Text {...priceTotalStyle} display={{ base: 'none', md: 'block' }}>
                    {pricedGuests}
                  </Text>
                )}
              </Stack>
            )}
            <Button asChild {...linkButtonStyle}>
              <Link href={href}>{price ? 'Смотреть варианты' : 'Подробнее'}</Link>
            </Button>
          </Flex>
        </Stack>
      </Flex>
    </Card>
  );
};
