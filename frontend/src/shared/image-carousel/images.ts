export const orderedImageUrls = (
  primary: string | null | undefined,
  images: readonly { url: string; sort_order?: number }[] = []
): string[] => [
  ...new Set(
    [
      primary,
      ...[...images]
        .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
        .map(({ url }) => url),
    ].filter((url): url is string => Boolean(url))
  ),
];
