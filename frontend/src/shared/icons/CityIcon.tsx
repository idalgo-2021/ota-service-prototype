/** Дома города — вид из окна, цвет берётся из `currentColor`. */
export const CityIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M3 21V10l5-3v14H3z" fill="currentColor" opacity="0.6" />
    <path d="M9 21V4h8v17H9z" fill="currentColor" />
    <path d="M18 21v-8h3v8h-3z" fill="currentColor" opacity="0.6" />
    <path
      d="M11 7h1.5M13.5 7H15M11 10h1.5M13.5 10H15M11 13h1.5M13.5 13H15"
      stroke="#fff"
      strokeWidth="1.2"
    />
  </svg>
);
