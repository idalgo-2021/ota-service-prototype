/** Кровать — оценка качества сна. */
export const BedIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M3 15h18M6 10V7h5a3 3 0 0 1 3 3M3 18v2m18-2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
