/** Колокольчик уведомлений; цвет задаёт родитель. */
export const NotificationIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
