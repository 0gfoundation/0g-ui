/**
 * The shell's own stroke glyphs, at label size: the outbound arrow, the
 * disclosure chevron, and the phone menu's open and close marks. Not
 * surface icons (icons.tsx has those); internal to the package.
 */
function Glyph({ size, className, d }: { size: number; className?: string; d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

/** Outbound, not a chevron (owner, 2026-09-20: the draft's chevron reads
 *  as "more", and an outbound link leaves the site). The same arrow the
 *  hub's Discover doors and Activity links wear, at label size. */
export function OutboundIcon() {
  return <Glyph size={13} d="M7 17 17 7M8 7h9v9" />;
}

/** A group's disclosure: points down closed, up open. */
export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <Glyph
      size={16}
      d="m6 9 6 6 6-6"
      className={open ? "rotate-180 transition-transform" : "transition-transform"}
    />
  );
}

/** A link's "go": after every title in a panel and the phone menu, and
 *  on a closed phone-menu group (it turns down when open). */
export function ChevronRightIcon({ size, className }: { size: number; className?: string }) {
  return <Glyph size={size} d="m9 6 6 6-6 6" className={className} />;
}

export function MenuIcon() {
  return <Glyph size={16} d="M4 7h16M4 12h16M4 17h16" />;
}

export function CloseIcon({ size = 22 }: { size?: number }) {
  return <Glyph size={size} d="M6 6l12 12M18 6 6 18" />;
}
