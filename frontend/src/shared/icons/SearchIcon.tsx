/** Иконка лупы, цвет берётся из `currentColor`. */
export const SearchIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
    <path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
