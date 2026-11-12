import { useState } from 'react';

// Справа от большого фото помещается сетка 2×2.
const THUMBS = 4;

export const useController = (images: readonly string[]) => {
  const [index, setIndex] = useState(0);
  const count = images.length;
  const current = Math.min(index, Math.max(count - 1, 0));

  // Миниатюры — следующие фото после первого; если фото больше, на последней «+N фото».
  const thumbs = images.slice(1, THUMBS + 1).map((url, offset) => ({
    url,
    index: offset + 1,
    more: offset === THUMBS - 1 && count > THUMBS + 1 ? count - (THUMBS + 1) : 0,
  }));

  return {
    current,
    count,
    thumbs,
    handlePrev: () => setIndex((current - 1 + count) % count),
    handleNext: () => setIndex((current + 1) % count),
    handleSelect: (next: number) => () => setIndex(next),
  };
};
