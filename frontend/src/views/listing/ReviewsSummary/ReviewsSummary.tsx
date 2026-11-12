'use client';

import { chakra, Flex, Stack, Text } from '@chakra-ui/react';
import { useState } from 'react';
import {
  BathIcon,
  BedIcon,
  BellIcon,
  CheckCircleIcon,
  PinIcon,
  SofaIcon,
  SparklesIcon,
  StarIcon,
  UserIcon,
  WifiIcon,
} from '@/shared/icons';
import type { ListingReviews } from '@/lib/reviews';
import {
  chipStyle,
  countStyle,
  getStarStyle,
  ratingCardStyle,
  ratingStyle,
  rootStyle,
  sparklesStyle,
  starsStyle,
  summaryStyle,
  summaryTextStyle,
  summaryTitleStyle,
  summaryToggleStyle,
  ratingDetailsStyle,
  ratingDetailChipStyle,
  ratingDetailIconStyle,
  verifiedStyle,
} from './ReviewsSummary.styles';
import { useController } from './useController';

const RATING_DETAILS: Record<
  string,
  { label: string; Icon: (props: { size?: number }) => React.ReactNode }
> = {
  bathroom_rating: { label: 'Ванная', Icon: BathIcon },
  cleanliness_rating: { label: 'Чистота', Icon: CheckCircleIcon },
  comfort_rating: { label: 'Комфорт', Icon: SofaIcon },
  location_rating: { label: 'Расположение', Icon: PinIcon },
  sleep_rating: { label: 'Качество сна', Icon: BedIcon },
  staff_rating: { label: 'Персонал', Icon: UserIcon },
  wifi_rating: { label: 'Wi-Fi', Icon: WifiIcon },
};

type ReviewsSummaryProps = {
  reviews: ListingReviews;
  average_rating_details?: Record<string, number>
};

/**
 * Сводка отзывов об объекте: оценка со звёздами и числом отзывов, отметка о проверке,
 * пересказ отзывов от ИИ и компактные оценки отдельных аспектов проживания.
 */
const SUMMARY_COLLAPSE_THRESHOLD = 180;

export const ReviewsSummary = ({ reviews, average_rating_details }: ReviewsSummaryProps) => {
  const { rating, stars, count } = useController(reviews);
  const [isExpanded, setIsExpanded] = useState(false);
  const canExpand = reviews.summary.length > SUMMARY_COLLAPSE_THRESHOLD;

  return (
    <chakra.section aria-label="Отзывы" {...rootStyle}>
      <Stack {...ratingCardStyle}>
        <Text {...ratingStyle}>{rating}</Text>
        <Flex {...starsStyle} role="img" aria-label={`Оценка ${rating} из 10`}>
          {stars.map((filled, index) => (
            <chakra.span key={index} {...getStarStyle(filled)}>
              <StarIcon size={18}/>
            </chakra.span>
          ))}
        </Flex>
        <Text {...countStyle}>{count}</Text>
        {reviews.verified && (
          <Flex {...verifiedStyle}>
            <CheckCircleIcon size={14}/>
            Проверенный объект
          </Flex>
        )}
      </Stack>

      <Stack {...summaryStyle}>
        <Flex {...summaryTitleStyle} >
          <chakra.span {...sparklesStyle}>
            <SparklesIcon size={20}/>
          </chakra.span>
          ИИ-саммари отзывов
        </Flex>
        <Text
          id="listing-review-summary-text"
          {...summaryTextStyle}
          lineClamp={canExpand && !isExpanded ? 4 : undefined}
        >
          {reviews.summary}
        </Text>
        {canExpand && (
          <chakra.button
            type="button"
            aria-controls="listing-review-summary-text"
            aria-expanded={isExpanded}
            {...summaryToggleStyle}
            onClick={() => setIsExpanded((expanded) => !expanded)}
          >
            {isExpanded ? 'Свернуть' : 'Развернуть'}
          </chakra.button>
        )}
      </Stack>
      {average_rating_details && Object.keys(average_rating_details).length > 0 && (
        <chakra.ul {...ratingDetailsStyle} aria-label="Оценки гостей">
          {Object.entries(average_rating_details).map(([key, value]) => {
            const detail = RATING_DETAILS[key];
            const Icon = detail?.Icon ?? StarIcon;
            const label = detail?.label ?? key.replace(/rating/gi, '').replace(/_/g, ' ').trim();

            return (
              <chakra.li key={key} {...ratingDetailChipStyle}>
                <chakra.span {...ratingDetailIconStyle}>
                  <Icon size={16} />
                </chakra.span>
                <chakra.span>{label}</chakra.span>
                <chakra.span fontWeight="600">{value.toFixed(1)}</chakra.span>
              </chakra.li>
            );
          })}
        </chakra.ul>
      )}
    </chakra.section>
);
};
