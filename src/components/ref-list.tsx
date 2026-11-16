// Requirement identifiers contain hyphens, which browsers will otherwise break
// across lines ("FR-TWN-03 · FR-" / "UX-10"). Each reference stays whole; the
// separator provides the only break opportunity.
export function RefList({ refs }: { refs: readonly string[] }) {
  return (
    <>
      {refs.map((ref, index) => (
        <span key={ref}>
          {index > 0 ? ' · ' : ''}
          <span className="whitespace-nowrap">{ref}</span>
        </span>
      ))}
    </>
  );
}
