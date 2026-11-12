/** Искорки — знак того, что текст собрал ИИ; цвет берётся из `currentColor`. */
export const SparklesIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M10 3l1.8 5.2L17 10l-5.2 1.8L10 17l-1.8-5.2L3 10l5.2-1.8L10 3z" fill="currentColor" />
    <path
      d="M18 14l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9L18 14z"
      fill="currentColor"
      opacity="0.7"
    />
    <path
      d="M18.5 2l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4L16.5 4l1.4-.6.6-1.4z"
      fill="currentColor"
      opacity="0.7"
    />
  </svg>
);
