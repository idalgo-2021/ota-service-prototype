/** Чашка — завтрак, цвет берется из `currentColor`. */
export const CupIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 8h12v6a5 5 0 01-5 5H9a5 5 0 01-5-5V8z" fill="currentColor" />
    <path d="M16 10h1.5a2.5 2.5 0 010 5H16" stroke="currentColor" strokeWidth="2" />
    <rect x="3" y="20" width="14" height="1.6" rx="0.8" fill="currentColor" />
  </svg>
);
