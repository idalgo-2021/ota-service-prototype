/** Иконка человека (голова и плечи в круге), цвет берётся из `currentColor`. */
export const UserIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="12" fill="currentColor" opacity="0.2" />
    <circle cx="12" cy="9.5" r="4" fill="currentColor" />
    <path d="M4.5 19.5c1.6-2.9 4.3-4.5 7.5-4.5s5.9 1.6 7.5 4.5" fill="currentColor" />
  </svg>
);
