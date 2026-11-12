'use client';

import { Box, Flex, Heading, Image, Skeleton, Stack, Text } from '@chakra-ui/react';
import { DEFAULT_GUESTS } from '@/lib/stay';
import { useGetPublicArticleQuery } from '@/lib/api';
import { useCatalogLanguage } from '@/lib/useCatalogLanguage';
import { BackButton } from '@/shared/back-button';
import { SearchForm } from '../SearchForm';

const formatPublishedDate = (value: string | null | undefined, language: string) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date);
};

export const ArticlePage = ({ slug }: { slug: string }) => {
  const { lang } = useCatalogLanguage();
  const article = useGetPublicArticleQuery(slug);

  if (article.isError) {
    return (
      <Stack w="100%" maxW="900px" mx="auto" px={{ base: 4, md: 8 }} py={8} gap={5}>
        <BackButton />
        <Heading as="h1" fontSize={{ base: '28px', md: '36px' }}>
          Статья не найдена
        </Heading>
        <Text color="gray.600">Возможно, статья снята с публикации или адрес изменился.</Text>
      </Stack>
    );
  }

  if (!article.data) {
    return (
      <Stack w="100%" maxW="1440px" mx="auto" px={{ base: 4, md: 8 }} py={8} gap={5}>
        <BackButton />
        <Skeleton h={{ base: '240px', md: '420px' }} borderRadius="24px" />
        <Skeleton h="40px" maxW="720px" />
        <Skeleton h="240px" borderRadius="16px" />
      </Stack>
    );
  }

  const publicationDate = formatPublishedDate(article.data.published_at, lang);

  return (
    <Stack w="100%" maxW="1440px" mx="auto" px={{ base: 4, md: 8 }} py={8} gap={6}>
      <BackButton />
      <Box
        display="grid"
        gridTemplateColumns={{ base: '1fr', lg: 'minmax(0, 1fr) 340px' }}
        gap={{ base: 8, lg: 10 }}
        alignItems="start"
      >
        <Box as="article" minW="0">
          <Stack gap={5}>
            <Stack gap={3}>
              <Flex gap={2} wrap="wrap">
                {article.data.tags.map((tag) => (
                  <Text
                    key={tag}
                    px={3}
                    py={1}
                    borderRadius="full"
                    bg="teal.50"
                    color="teal.700"
                    fontSize="sm"
                    fontWeight="600"
                  >
                    {tag}
                  </Text>
                ))}
              </Flex>
              <Heading as="h1" fontSize={{ base: '30px', md: '46px' }} lineHeight="1.15">
                {article.data.title}
              </Heading>
              <Flex gap={3} color="gray.600" fontSize="sm" wrap="wrap">
                {article.data.author_name && <Text>{article.data.author_name}</Text>}
                {publicationDate && <Text>{publicationDate}</Text>}
              </Flex>
            </Stack>

            {article.data.cover_image_url && (
              <Image
                src={article.data.cover_image_url}
                alt={article.data.title}
                w="100%"
                maxH={{ base: '280px', md: '520px' }}
                objectFit="cover"
                borderRadius="24px"
              />
            )}

            <Box
              color="gray.800"
              fontSize={{ base: '16px', md: '18px' }}
              lineHeight="1.8"
              overflowWrap="anywhere"
              css={{
                '& h1, & h2, & h3, & h4, & h5, & h6': {
                  fontWeight: '700',
                  lineHeight: '1.25',
                  marginTop: '1.5em',
                  marginBottom: '0.6em',
                },
                '& p, & ul, & ol, & blockquote, & pre, & table': { marginBottom: '1em' },
                '& ul, & ol': { paddingInlineStart: '1.5em' },
                '& img': { maxWidth: '100%', height: 'auto', borderRadius: '16px' },
                '& a': { color: 'teal.700', textDecoration: 'underline' },
                '& blockquote': {
                  borderLeft: '4px solid',
                  borderColor: 'teal.400',
                  paddingLeft: '1em',
                  color: 'gray.600',
                },
                '& table': { display: 'block', overflowX: 'auto', maxWidth: '100%' },
                '& th, & td': { border: '1px solid', borderColor: 'gray.200', padding: '8px' },
              }}
              dangerouslySetInnerHTML={{ __html: article.data.content_html }}
            />
          </Stack>
        </Box>
        {article.data.location_id && (
          <Stack
            as="aside"
            gap={4}
            p={{ base: 4, md: 5 }}
            border="1px solid"
            borderColor="gray.200"
            borderRadius="20px"
            bg="white"
            boxShadow="sm"
            position={{ lg: 'sticky' }}
            top={{ lg: '88px' }}
          >
            <Box>
              <Heading as="h2" fontSize="20px" mb={1}>
                Найдите проживание
              </Heading>
              <Text color="gray.600" fontSize="sm">
                Направление из статьи уже выбрано.
              </Text>
            </Box>
            <SearchForm
              layout="sidebar"
              initialValues={{
                destination: '',
                locationIds: [article.data.location_id],
                stay: { guests: DEFAULT_GUESTS },
                guestsExplicit: false,
              }}
            />
          </Stack>
        )}
      </Box>
    </Stack>
  );
};
