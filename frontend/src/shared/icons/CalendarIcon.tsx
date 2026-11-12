/** Иконка календаря (контур листа с кольцами), цвет берётся из `currentColor`. */
export const CalendarIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
    <rect
      x="1.75"
      y="2.75"
      width="12.5"
      height="11.5"
      rx="2.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path d="M1.75 6.5h12.5M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
