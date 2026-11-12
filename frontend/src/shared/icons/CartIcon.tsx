/** Корзина покупок; не используется для уже оформленных заказов. */
export const CartIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="19" r="1.2" fill="currentColor" />
    <circle cx="17" cy="19" r="1.2" fill="currentColor" />
  </svg>
);
