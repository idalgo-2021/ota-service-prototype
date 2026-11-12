/** Две встречные стрелки — сортировка, цвет берется из `currentColor`. */
export const SortIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M8 19V5m0 0L4.5 8.5M8 5l3.5 3.5M16 5v14m0 0l-3.5-3.5M16 19l3.5-3.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
