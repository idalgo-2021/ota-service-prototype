import type { ReactNode } from 'react';
import { Box, Stack, Text } from '@chakra-ui/react';

export const HotelierMobileList = ({ children }: { children: ReactNode }) => (
  <Stack as="ul" gap="10px" display={{ base: 'flex', lg: 'none' }} listStyleType="none" p="0" m="0">
    {children}
  </Stack>
);

export const HotelierMobileCard = ({ children }: { children: ReactNode }) => (
  <Stack
    as="li"
    gap="14px"
    p="16px"
    minW="0"
    bg="white"
    border="1px solid #e5e5ea"
    borderRadius="14px"
    boxShadow="0 1px 2px rgba(0,0,0,0.035)"
  >
    {children}
  </Stack>
);

export const HotelierMobileField = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <Stack gap="2px" minW="0">
    <Text fontSize="12px" color="gray.600">
      {label}
    </Text>
    <Box fontSize="14px" overflowWrap="anywhere">
      {children}
    </Box>
  </Stack>
);
