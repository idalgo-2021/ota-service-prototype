/** Диван — интерьер, цвет берётся из `currentColor`. */
export const SofaIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="5" y="6" width="14" height="7" rx="2" fill="currentColor" opacity="0.5" />
    <path
      d="M3 11a2 2 0 014 0v2h10v-2a2 2 0 014 0v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z"
      fill="currentColor"
    />
    <rect x="5" y="18" width="2" height="2" rx="0.5" fill="currentColor" />
    <rect x="17" y="18" width="2" height="2" rx="0.5" fill="currentColor" />
  </svg>
);
