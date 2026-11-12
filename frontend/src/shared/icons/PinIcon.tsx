/** Метка места на карте, цвет берётся из `currentColor`. */
export const PinIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 2a7 7 0 00-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 00-7-7z" fill="currentColor" />
    <circle cx="12" cy="9" r="2.6" fill="#fff" />
  </svg>
);
