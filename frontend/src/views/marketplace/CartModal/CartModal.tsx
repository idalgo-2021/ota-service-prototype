'use client';

import { Dialog, Flex, Portal } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { useCatalogLanguage } from '@/lib/useCatalogLanguage';
import { colors } from '@/shared/colors';
import { IconButton } from '@/shared/icon-button';

export const CartModal = ({
  children,
  open,
  onClose,
}: {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
}) => {
  const { lang } = useCatalogLanguage();
  const title = lang === 'en' ? 'Cart' : 'Корзина';
  const closeLabel = lang === 'en' ? 'Close cart' : 'Закрыть корзину';

  return (
    <Dialog.Root
      open={open}
      placement="center"
      closeOnInteractOutside={false}
      onOpenChange={({ open }) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner p={{ base: 0, md: '16px' }}>
          <Dialog.Content
            w={{ base: '100vw', md: 'min(900px, calc(100vw - 32px))' }}
            h={{ base: '100dvh', md: 'min(800px, calc(100dvh - 32px))' }}
            maxW="none"
            maxH="none"
            overflow="hidden"
            display="flex"
            flexDirection="column"
            borderRadius={{ base: 0, md: '16px' }}
            bg={colors.white}
          >
            <Flex
              alignItems="center"
              justifyContent="space-between"
              flexShrink={0}
              minH="52px"
              px="16px"
              borderBottom={`1px solid ${colors.borderLight}`}
            >
              <Dialog.Title fontSize="16px" fontWeight="600" color={colors.text}>
                {title}
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <IconButton
                  label={closeLabel}
                  w="36px"
                  h="36px"
                  borderRadius="8px"
                  fontSize="28px"
                  lineHeight="1"
                  color={colors.text}
                  _hover={{ bg: colors.hoverBg }}
                >
                  ×
                </IconButton>
              </Dialog.CloseTrigger>
            </Flex>
            <Dialog.Body flex="1" minH={0} overflowY="auto" p={0}>
              {children}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
