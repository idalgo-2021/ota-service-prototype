'use client';

import { Box, Heading, Image, SimpleGrid, Skeleton, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useGetPublicArticlesQuery } from '@/lib/api';
import { BackButton } from '@/shared/back-button';

export const ArticlesIndex = () => {
  const { data, isError, isLoading } = useGetPublicArticlesQuery({ limit: 100, offset: 0 });
  const articles = data?.items ?? [];

  return (
    <Stack w="100%" maxW="1200px" mx="auto" px={{ base: 4, md: 8 }} py={8} gap={6}>
      <BackButton />
      <Heading as="h1" fontSize={{ base: '30px', md: '42px' }}>
        Статьи о путешествиях
      </Heading>
      {isLoading && <Skeleton h="320px" borderRadius="20px" />}
      {isError && <Text color="gray.600">Не удалось загрузить статьи.</Text>}
      {!isLoading && !isError && articles.length === 0 && (
        <Text color="gray.600">Пока нет опубликованных статей.</Text>
      )}
      {articles.length > 0 && (
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={6}>
          {articles.map((article) => (
            <Link key={article.id} href={`/articles/${encodeURIComponent(article.slug)}`}>
              <Box borderRadius="20px" overflow="hidden" bg="white" h="100%">
                <Image
                  src={article.cover_image_url}
                  alt={article.title}
                  w="100%"
                  h="220px"
                  objectFit="cover"
                />
                <Stack p={5} gap={3}>
                  <Text fontSize="sm" fontWeight="600" color="teal.700">
                    {article.tags[0] || 'Путешествия'}
                  </Text>
                  <Heading as="h2" fontSize="xl" lineHeight="1.3">
                    {article.title}
                  </Heading>
                  {article.author_name && <Text color="gray.600">{article.author_name}</Text>}
                </Stack>
              </Box>
            </Link>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
};
