/** A small check mark, drawn in currentColor. Decorative: always beside text that says the same thing. */
export default function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3.2 8.6l3.1 3.1 6.5-7" />
    </svg>
  );
}
