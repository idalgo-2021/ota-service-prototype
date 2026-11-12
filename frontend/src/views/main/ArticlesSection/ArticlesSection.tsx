'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Flex, Heading, Image, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useGetPublicArticlesQuery } from '@/lib/api';
import { useCatalogLanguage } from '@/lib/useCatalogLanguage';
import { IconButton } from '@/shared/icon-button';

const getArticleText = (html: string) =>
  html
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getReadingTime = (html: string, lang: 'ru' | 'en') => {
  const minutes = Math.max(
    1,
    Math.ceil(getArticleText(html).split(' ').filter(Boolean).length / 200)
  );
  return lang === 'en' ? `${minutes} min` : `${minutes} мин`;
};

export const ArticlesSection = () => {
  const { lang } = useCatalogLanguage();
  const { data } = useGetPublicArticlesQuery({ limit: 12, offset: 0 });
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);
  const articles = [...(data?.items ?? [])]
    .sort(
      (left, right) =>
        new Date(right.published_at ?? right.created_at).getTime() -
        new Date(left.published_at ?? left.created_at).getTime()
    )
    .map((article) => ({
      ...article,
      category: article.tags[0] || (lang === 'en' ? 'Travel' : 'Путешествия'),
      description: getArticleText(article.content_html).slice(0, 150),
      image: article.cover_image_url,
      href: `/articles/${encodeURIComponent(article.slug)}`,
      readingTime: getReadingTime(article.content_html, lang),
    }));

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) {
      return;
    }

    const updateScrollState = () => {
      const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;
      setCanScrollBack(carousel.scrollLeft > 2);
      setCanScrollForward(maxScrollLeft - carousel.scrollLeft > 2);
    };

    updateScrollState();
    carousel.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      carousel.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [articles.length]);

  const scrollCarousel = (direction: 'back' | 'forward') => {
    carouselRef.current?.scrollBy({
      left: (carouselRef.current.clientWidth * 0.86 + 20) * (direction === 'forward' ? 1 : -1),
      behavior: 'smooth',
    });
  };

  const arrowStyle = {
    display: { base: 'inline-flex', md: 'inline-flex' },
    alignItems: 'center',
    justifyContent: 'center',
    w: '40px',
    h: '40px',
    borderRadius: '12px',
    border: '1px solid',
    borderColor: 'gray.200',
    bg: 'white',
    color: 'gray.800',
    transition: 'background .2s, border-color .2s, color .2s, opacity .2s',
    _hover: { bg: 'teal.50', borderColor: 'teal.300', color: 'teal.700' },
    _disabled: {
      opacity: 0.35,
      cursor: 'not-allowed',
      _hover: { bg: 'white', borderColor: 'gray.200', color: 'gray.800' },
    },
  } as const;

  return (
    <Box as="section" w="100%" maxW="1200px" mx="auto" py="48px" px="20px">
      <Flex justify="space-between" align="end" mb="24px" gap="16px">
        <Box>
          <Heading as="h2" fontSize={{ base: '26px', md: '36px' }}>
            {lang === 'en'
              ? 'Places to inspire your next trip'
              : 'Места, в которые хочется отправиться'}
          </Heading>
        </Box>
        <Flex align="center" gap="14px">
          <Link href="/articles">
            <Text fontWeight="600" whiteSpace="nowrap" _hover={{ color: 'teal.700' }}>
              {lang === 'en' ? 'All articles →' : 'Все статьи →'}
            </Text>
          </Link>
          {articles.length > 1 && (
            <Flex gap="8px">
              <IconButton
                label={lang === 'en' ? 'Previous articles' : 'Предыдущие статьи'}
                {...arrowStyle}
                disabled={!canScrollBack}
                onClick={() => scrollCarousel('back')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m14.5 5-7 7 7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconButton>
              <IconButton
                label={lang === 'en' ? 'Next articles' : 'Следующие статьи'}
                {...arrowStyle}
                disabled={!canScrollForward}
                onClick={() => scrollCarousel('forward')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m9.5 5 7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconButton>
            </Flex>
          )}
        </Flex>
      </Flex>

      <Flex
        ref={carouselRef}
        gap="20px"
        overflowX="auto"
        pb="16px"
        scrollSnapType="x mandatory"
        css={{
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {articles.map((article) => (
          <Box
            key={article.id}
            as="article"
            flex="0 0 auto"
            w={{ base: '280px', md: '340px' }}
            scrollSnapAlign="start"
            borderRadius="20px"
            overflow="hidden"
            bg="white"
          >
            <Link href={article.href}>
              <Box overflow="hidden" borderRadius="18px">
                <Image
                  src={article.image}
                  alt={article.title}
                  w="100%"
                  h="220px"
                  objectFit="cover"
                  transition="transform .3s"
                  _hover={{ transform: 'scale(1.04)' }}
                />
              </Box>

              <Box pt="16px">
                <Flex justify="space-between" mb="10px">
                  <Text fontSize="xs" fontWeight="700" color="teal.600">
                    {article.category}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {article.readingTime}
                  </Text>
                </Flex>

                <Heading as="h3" fontSize="xl" lineHeight="1.3" mb="8px">
                  {article.title}
                </Heading>

                <Text fontSize="sm" color="gray.600" lineHeight="1.6">
                  {article.description}
                </Text>
              </Box>
            </Link>
          </Box>
        ))}
      </Flex>
    </Box>
  );
};
