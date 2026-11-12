'use client';

import { Image, Text } from '@chakra-ui/react';
import { useState } from 'react';

export const MediaThumbnail = ({ src, alt }: { src?: string; alt: string }) => {
  const [failedSrc, setFailedSrc] = useState<string>();
  if (!src || failedSrc === src) {
    return <Text color="gray.500">—</Text>;
  }
  return (
    <Image
      src={src}
      alt={alt}
      width="64px"
      height="48px"
      objectFit="cover"
      borderRadius="6px"
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  );
};
