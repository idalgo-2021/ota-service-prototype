'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Box, Flex, Stack, Text } from '@chakra-ui/react';
import { StatusBadge, type StatusTone } from '@/shared/status-badge';
import { StarIcon } from '@/shared/icons';

export type ReviewDisplayStatus = {
  label: string;
  tone: StatusTone;
};

export const getReviewDisplayStatus = (
  status: string | undefined,
  hidden: boolean,
  lang: 'ru' | 'en'
): ReviewDisplayStatus => {
  if (hidden) {
    return { label: lang === 'en' ? 'Hidden' : 'Скрыт', tone: 'canceled' };
  }
  const labels: Record<string, ReviewDisplayStatus> = {
    draft: { label: lang === 'en' ? 'Draft' : 'Черновик', tone: 'waiting' },
    pending_moderation: {
      label: lang === 'en' ? 'Pending moderation' : 'На модерации',
      tone: 'waiting',
    },
    approved: { label: lang === 'en' ? 'Published' : 'Опубликован', tone: 'done' },
    rejected: { label: lang === 'en' ? 'Rejected' : 'Отклонен', tone: 'canceled' },
  };
  return labels[status ?? ''] ?? { label: status || '—', tone: 'waiting' };
};

export const ReviewDetailsLayout = ({
  entityLabel,
  entityName,
  entityHref,
  author,
  source,
  createdAt,
  status,
  rating,
  ratingMax,
  children,
}: {
  entityLabel: string;
  entityName?: string;
  entityHref?: string;
  author: string;
  source: string;
  createdAt?: string;
  status: ReviewDisplayStatus;
  rating?: string;
  ratingMax: number;
  children: ReactNode;
}) => (
  <Stack gap="22px" minW="0">
    <Flex
      align={{ base: 'flex-start', sm: 'center' }}
      justify="space-between"
      gap="18px"
      wrap="wrap"
      p={{ base: '16px', md: '20px' }}
      bg="#f8f9fc"
      border="1px solid"
      borderColor="gray.100"
      borderRadius="14px"
    >
      <Stack gap="14px" minW="0" flex="1">
        <Stack gap="4px" minW="0">
          <Text fontSize="11px" fontWeight="700" color="gray.500" letterSpacing="0.06em">
            {entityLabel.toLocaleUpperCase()}
          </Text>
          {entityHref ? (
            <Link href={entityHref}>
              <Text
                color="blue.700"
                fontSize="17px"
                fontWeight="700"
                lineHeight="1.35"
                overflowWrap="anywhere"
                _hover={{ textDecoration: 'underline' }}
              >
                {entityName || '—'}
              </Text>
            </Link>
          ) : (
            <Text fontSize="17px" fontWeight="700" lineHeight="1.35" overflowWrap="anywhere">
              {entityName || '—'}
            </Text>
          )}
        </Stack>
        <Stack gap="3px">
          <Text fontSize="15px" fontWeight="600" color="gray.800">
            {author}
          </Text>
          <Text fontSize="13px" color="gray.600">
            {[source, createdAt].filter(Boolean).join(' · ') || '—'}
          </Text>
        </Stack>
      </Stack>
      <Stack align={{ base: 'flex-start', sm: 'flex-end' }} gap="10px" flexShrink="0">
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        <Flex align="baseline" gap="4px" color="blue.700">
          <StarIcon size={22} />
          <Text fontSize="32px" lineHeight="1" fontWeight="700" fontVariantNumeric="tabular-nums">
            {rating || '—'}
          </Text>
          <Text fontSize="14px" color="gray.600">
            / {ratingMax}
          </Text>
        </Flex>
      </Stack>
    </Flex>
    {children}
  </Stack>
);

export const ReviewDetailSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <Box borderTop="1px solid" borderColor="gray.200" pt="18px">
    <Text fontSize="16px" fontWeight="700" mb="14px">
      {title}
    </Text>
    {children}
  </Box>
);

export const ReviewDetailGrid = ({ children }: { children: ReactNode }) => (
  <Box
    display="grid"
    gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }}
    columnGap="24px"
    rowGap="16px"
  >
    {children}
  </Box>
);

export const ReviewDetailValue = ({ label, value }: { label: string; value?: ReactNode }) => (
  <Stack gap="3px" minW="0">
    <Text fontSize="12px" color="gray.600">
      {label}
    </Text>
    <Box fontSize="14px" color="gray.800" overflowWrap="anywhere">
      {value || '—'}
    </Box>
  </Stack>
);

export const ReviewRatingBar = ({
  label,
  value,
  scale,
}: {
  label: string;
  value: number;
  scale: number;
}) => (
  <Stack gap="6px" minW="0">
    <Flex align="baseline" justify="space-between" gap="8px">
      <Text fontSize="14px" color="gray.700">
        {label}
      </Text>
      <Text fontSize="14px" fontWeight="700" fontVariantNumeric="tabular-nums">
        {value}
      </Text>
    </Flex>
    <Box h="5px" bg="gray.100" borderRadius="full" overflow="hidden" aria-hidden="true">
      <Box
        h="100%"
        w={`${Math.max(0, Math.min(value, scale)) * (100 / scale)}%`}
        bg="blue.600"
        borderRadius="full"
      />
    </Box>
  </Stack>
);

export const ReviewMetadata = ({ children, label }: { children: ReactNode; label: string }) => (
  <Box as="details" border="1px solid" borderColor="gray.200" borderRadius="12px" p="14px">
    <Box
      as="summary"
      cursor="pointer"
      fontSize="13px"
      fontWeight="600"
      color="gray.700"
      _hover={{ color: 'blue.700' }}
    >
      {label}
    </Box>
    <Box pt="14px">{children}</Box>
  </Box>
);
