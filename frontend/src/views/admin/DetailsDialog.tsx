'use client';

import { Box, Dialog, Portal, Stack, Text } from '@chakra-ui/react';
import { translateAdmin, useAdminLanguage } from './adminLocale';

export const DetailsDialog = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  const lang = useAdminLanguage();
  return (
    <Dialog.Root open onOpenChange={({ open }) => !open && onClose()} placement="center">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            maxW="800px"
            maxH="calc(100dvh - 32px)"
            overflowY="auto"
            p="20px"
            border="1px solid #e5e5ea"
            borderRadius="16px"
            boxShadow="0 8px 40px rgba(45, 49, 55, 0.3)"
          >
            <Dialog.Title fontSize="20px" fontWeight="600" mb="16px">
              {translateAdmin(title, lang)}
            </Dialog.Title>
            <Dialog.Body p="0">{children}</Dialog.Body>
            <Dialog.CloseTrigger
              position="absolute"
              top="12px"
              right="16px"
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              w="40px"
              h="40px"
              borderRadius="8px"
              color="gray.600"
              aria-label={lang === 'en' ? 'Close' : 'Закрыть'}
              _hover={{ bg: 'gray.100' }}
            >
              ×
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => {
  const lang = useAdminLanguage();
  return (
    <Stack
      direction={{ base: 'column', sm: 'row' }}
      gap="4px"
      borderBottom="1px solid"
      borderColor="#f0f0f2"
      py="10px"
    >
      <Text color="gray.500" minW="185px" fontSize="13px">
        {translateAdmin(label, lang)}
      </Text>
      <Box overflowWrap="anywhere" fontSize="13px">
        {value || '—'}
      </Box>
    </Stack>
  );
};
