'use client';

import { chakra } from '@chakra-ui/react';
import {
  BellIcon,
  CheckCircleIcon,
  CityIcon,
  CupIcon,
  HeartIcon,
  PinIcon,
  SofaIcon,
} from '@/shared/icons';
import type { ListingReviews, ReviewTopic } from '@/lib/reviews';
import { chipStyle, getChipIconStyle, highlightsStyle } from './ReviewsSummary.styles';

type ReviewHighlightsProps = {
  highlights: ListingReviews['highlights'];
};

const TOPIC_ICONS: Record<ReviewTopic, (props: { size?: number }) => React.ReactNode> = {
  interior: SofaIcon,
  location: PinIcon,
  cleanliness: CheckCircleIcon,
  view: CityIcon,
  service: BellIcon,
  breakfast: CupIcon,
  noise: HeartIcon,
};

export const ReviewHighlights = ({ highlights }: ReviewHighlightsProps) => (
  <chakra.ul {...highlightsStyle} aria-label="Что гости отмечают в отзывах">
    {highlights.map(({ topic, label, tone }) => {
      const Icon = TOPIC_ICONS[topic];

      return (
        <chakra.li key={label} {...chipStyle}>
          <chakra.span {...getChipIconStyle(tone)}>
            <Icon size={16} />
          </chakra.span>
          {label}
        </chakra.li>
      );
    })}
  </chakra.ul>
);
