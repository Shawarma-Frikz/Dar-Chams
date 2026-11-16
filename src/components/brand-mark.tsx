type BrandMarkProps = {
  className?: string;
};

/**
 * The Dar Chams mark: an arched doorway framing the sun disc (DEC-040).
 * Geometry is fixed by docs/identity.md §2 on a 24 × 24 grid.
 */
export function BrandMark({ className = 'h-8 w-8' }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M4 22V10A8 8 0 0 1 20 10V22"
        stroke="var(--blue)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="3.6" fill="var(--sun)" />
    </svg>
  );
}
