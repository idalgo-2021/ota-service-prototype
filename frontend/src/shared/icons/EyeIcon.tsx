/**
 * Иконка глаза для показа пароля: открытого или, с `closed`, зажмуренного.
 * Цвет берётся из `currentColor`.
 */
export const EyeIcon = ({ size = 16, closed = false }: { size?: number; closed?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    {closed ? (
      <path
        d="M3 10c2.2 3 5.3 4.5 9 4.5s6.8-1.5 9-4.5M6.5 13l-1.5 2.5M12 14.5V17M17.5 13l1.5 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    ) : (
      <>
        <path
          d="M2.5 12c2.2-4 5.4-6 9.5-6s7.3 2 9.5 6c-2.2 4-5.4 6-9.5 6s-7.3-2-9.5-6z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      </>
    )}
  </svg>
);
