'use client';

import { chakra, Text } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { colors } from '@/shared/colors';
import { LinkedRecordDialog } from './LinkedRecordDialog';
import type { ResourceConfig } from './types';
import { useAdminLanguage } from '../adminLocale';
import { recordLinkStyle } from '../table.styles';

const publicRecordHref = (key: ResourceConfig['key'], id: string) => {
  if (key === 'listings') {
    return `/listings/${encodeURIComponent(id)}`;
  }
  if (key === 'products') {
    return `/products/${encodeURIComponent(id)}`;
  }
  return undefined;
};

export const RelatedRecordButton = ({
  config,
  id,
  main,
  sub,
  maxWidth = '180px',
}: {
  config: ResourceConfig;
  id: string;
  main: string;
  sub?: string;
  maxWidth?: string;
}) => {
  const [open, setOpen] = useState(false);
  const lang = useAdminLanguage();
  const href = publicRecordHref(config.key, id);

  if (href) {
    return (
      <Link
        href={href}
        aria-label={`${lang === 'en' ? 'Open record' : 'Открыть карточку'}: ${main}`}
        style={{
          display: 'block',
          width: '100%',
          minWidth: 0,
          maxWidth,
          textAlign: 'left',
          color: colors.primary,
          fontWeight: 600,
        }}
      >
        <Text
          as="span"
          display="block"
          lineClamp={2}
          whiteSpace="normal"
          overflowWrap="anywhere"
          title={main}
        >
          {main}
        </Text>
        {sub && (
          <Text as="span" display="block" fontSize="12px" truncate title={sub}>
            {sub}
          </Text>
        )}
      </Link>
    );
  }

  return (
    <>
      <chakra.button
        type="button"
        w="100%"
        minW="0"
        maxW={maxWidth}
        textAlign="left"
        {...recordLinkStyle}
        cursor="pointer"
        aria-label={`${lang === 'en' ? 'Open record' : 'Открыть карточку'}: ${main}`}
        onClick={() => setOpen(true)}
      >
        <Text
          as="span"
          display="block"
          lineClamp={2}
          whiteSpace="normal"
          overflowWrap="anywhere"
          title={main}
        >
          {main}
        </Text>
        {sub && (
          <Text as="span" display="block" fontSize="12px" truncate title={sub}>
            {sub}
          </Text>
        )}
      </chakra.button>
      {open && <LinkedRecordDialog config={config} id={id} onClose={() => setOpen(false)} />}
    </>
  );
};

/** Кликабельное содержимое, которое открывает карточку связанной записи. */
export const RelatedRecordThumbnail = ({
  config,
  id,
  children,
  label,
}: {
  config: ResourceConfig;
  id: string;
  children: ReactNode;
  label: string;
}) => {
  const [open, setOpen] = useState(false);
  const lang = useAdminLanguage();
  const href = publicRecordHref(config.key, id);

  if (href) {
    return (
      <Link
        href={href}
        aria-label={`${lang === 'en' ? 'Open record' : 'Открыть карточку'}: ${label}`}
        style={{ display: 'block', borderRadius: '6px' }}
      >
        {children}
      </Link>
    );
  }

  return (
    <>
      <chakra.button
        type="button"
        display="block"
        cursor="pointer"
        borderRadius="6px"
        aria-label={`${lang === 'en' ? 'Open record' : 'Открыть карточку'}: ${label}`}
        onClick={() => setOpen(true)}
        _focusVisible={{ outline: '2px solid', outlineColor: 'blue.500', outlineOffset: '2px' }}
      >
        {children}
      </chakra.button>
      {open && <LinkedRecordDialog config={config} id={id} onClose={() => setOpen(false)} />}
    </>
  );
};
