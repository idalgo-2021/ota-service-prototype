/** Отдельный знак для личных отзывов. */
export const ReviewIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 4h16v13H9l-5 4V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
