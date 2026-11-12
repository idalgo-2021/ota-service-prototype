'use client';

import type { ReactNode } from 'react';
import { Box, Table } from '@chakra-ui/react';
import { Button, type ButtonProps } from '@/shared/button';

export const HotelierTable = ({
  children,
  minW = '880px',
  compact = false,
}: {
  children: ReactNode;
  minW?: string;
  compact?: boolean;
}) => (
  <Box
    w="100%"
    minW="0"
    overflowX="auto"
    border="1px solid #e5e5ea"
    borderRadius="14px"
    bg="white"
    boxShadow="0 1px 2px rgba(0,0,0,0.035)"
  >
    <Table.Root
      size="sm"
      w="100%"
      minW={minW}
      tableLayout="fixed"
      fontSize="13px"
      css={{
        '& th': {
          px: compact ? '8px' : '14px',
          py: '12px',
          bg: '#f9f9fb',
          color: '#6e6e73',
          fontSize: '11px',
          fontWeight: 600,
          lineHeight: 1.3,
          whiteSpace: 'normal',
          borderBottom: '1px solid #e5e5ea',
        },
        '& td': {
          px: compact ? '8px' : '14px',
          py: '12px',
          verticalAlign: 'middle',
          overflowWrap: 'anywhere',
          borderColor: '#f0f0f2',
        },
        '& tbody tr:last-child td': { borderBottom: 'none' },
        '& tbody tr': { transition: 'background-color 160ms ease-out' },
        '& tbody tr:hover': { backgroundColor: '#fafaff' },
        '&:focus-visible': { outline: '2px solid #0a66e8', outlineOffset: '2px' },
      }}
    >
      {children}
    </Table.Root>
  </Box>
);

export const HotelierTableAction = (props: ButtonProps) => (
  <Button
    h="32px"
    minH="32px"
    minW="0"
    px="10px"
    py="0"
    fontSize="12px"
    lineHeight="1.2"
    borderRadius="8px"
    whiteSpace="nowrap"
    {...props}
  />
);
