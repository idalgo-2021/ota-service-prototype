/** Звонок на стойке — сервис, цвет берется из `currentColor`. */
export const BellIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 17a8 8 0 0116 0H4z" fill="currentColor" />
    <rect x="3" y="18" width="18" height="2" rx="1" fill="currentColor" />
    <rect x="11" y="6" width="2" height="3" rx="1" fill="currentColor" />
  </svg>
);
