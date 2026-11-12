'use client';

import { chakra } from '@chakra-ui/react';
import {
  BellIcon,
  CheckCircleIcon,
  CityIcon,
  CupIcon,
  PinIcon,
  SofaIcon,
  WifiIcon,
} from '@/shared/icons';
import type { CatalogLanguage, FeatureTag } from '@/lib/api';
import {
  chipStyle,
  getChipIconStyle,
  highlightsStyle,
} from '../ReviewsSummary/ReviewsSummary.styles';

type ListingFeatureTagsProps = {
  features: FeatureTag[];
  lang: CatalogLanguage;
};

const iconForTag = (slug: string) => {
  if (/location|metro|nearby|shopping|shops|restaurants|cafes/.test(slug)) return PinIcon;
  if (/breakfast|cafe/.test(slug)) return CupIcon;
  if (/wifi|wi-fi|internet/.test(slug)) return WifiIcon;
  if (/staff|concierge|front-desk/.test(slug)) return BellIcon;
  if (/relax|work|coworking|quiet|terrace/.test(slug)) return SofaIcon;
  if (/city/.test(slug)) return CityIcon;
  return CheckCircleIcon;
};

export const ListingFeatureTags = ({ features, lang }: ListingFeatureTagsProps) => (
  <chakra.ul
    {...highlightsStyle}
    aria-label={lang === 'ru' ? 'Особенности объекта' : 'Property features'}
  >
    {features.map((feature) => {
      const Icon = iconForTag(feature.slug);
      return (
        <chakra.li key={feature.id} {...chipStyle}>
          <chakra.span {...getChipIconStyle('positive')} aria-hidden="true">
            <Icon size={16} />
          </chakra.span>
          {lang === 'ru' ? feature.name_ru : feature.name}
        </chakra.li>
      );
    })}
  </chakra.ul>
);
