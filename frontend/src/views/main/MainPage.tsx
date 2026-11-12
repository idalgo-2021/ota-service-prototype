'use client';

import { Box, Flex, Heading, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import type { CatalogLanguage, Guests } from '@/lib/api';
import { useCatalogLanguage } from '@/lib/useCatalogLanguage';
import { DEFAULT_GUESTS } from '@/lib/stay';
import { experiencesLinkStyle, headingStyle, rootStyle } from './MainPage.styles';
import { AssistantChat } from './AssistantChat';
import { SearchForm, type SearchFormInitialValues } from './SearchForm';
import { ArticlesSection } from '@/views/main/ArticlesSection/ArticlesSection';

const COPY: Record<CatalogLanguage, { heading: string; experiences: string; description: string }> = {
  ru: {
    heading: 'Ооооочень много отелей и квартир!',
    experiences: 'Ищу впечатление',
    description: 'Походы, экскурсии, туры и товары — локацию можно выбрать потом →',
  },
  en: {
    heading: 'A world of hotels and apartments!',
    experiences: 'Looking for experiences',
    description: 'Hikes, excursions, tours and more — choose a destination later →',
  },
};

/** Главная страница: мятный экран с крупным заголовком и формой поиска под ним. */
export const MainPage = ({ initialValues }: { initialValues?: SearchFormInitialValues }) => {
  const { lang } = useCatalogLanguage();
  const t = COPY[lang];
  const [guests, setGuests] = useState<Guests>(initialValues?.stay.guests ?? DEFAULT_GUESTS);
  const handleGuestsChange = useCallback((value: Guests) => setGuests(value), []);
  const participants = Math.max(1, guests.adults + guests.children);

  return (
    <Flex {...rootStyle}>
      <Heading as="h1" {...headingStyle}>
        {lang === 'ru' ? (
          <>
            Ооооочень много отелей
            <br />и квартир!
          </>
        ) : (
          t.heading
        )}
      </Heading>
      <SearchForm initialValues={initialValues} onGuestsChange={handleGuestsChange} />
      <AssistantChat />
      <Link href={`/products?participants=${participants}`} style={experiencesLinkStyle}>
        <Text as="span" fontWeight="700">
          {t.experiences}
        </Text>
        <Text as="span">{t.description}</Text>
      </Link>
      <Box w="100%" bg="#FAFAF7">
        <ArticlesSection />
      </Box>
    </Flex>
  );
};
