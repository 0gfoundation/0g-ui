/**
 * Where the header switches between the desktop bar and the phone row
 * with its menu button (SiteHeader's `collapse`). "lg" (64rem, 1024px)
 * is the drafts' and the default; "md" (48rem, 768px) keeps the bar on
 * tablets, for a site whose nav fits there (0g.ai's five groups need
 * about 670px).
 *
 * Every class is written out in full per breakpoint because the host's
 * Tailwind generates only class names it finds in the shipped modules.
 * The same breakpoint drives the phone scroll behaviour (ShellScroll's
 * `collapse`, shell.css under [data-shell-collapse]) and the menu's
 * close-on-resize, so all three move together.
 */
export type ShellCollapse = "lg" | "md";

export const COLLAPSE_QUERY: Record<ShellCollapse, { phone: string; desktop: string }> = {
  lg: { phone: "(width < 64rem)", desktop: "(width >= 64rem)" },
  md: { phone: "(width < 48rem)", desktop: "(width >= 48rem)" },
};

export const COLLAPSE_CLASSES = {
  lg: {
    header: "lg:px-8 lg:pt-6",
    row: "lg:relative lg:mx-auto",
    rowFixed: "lg:max-w-[1000px]",
    rowGrow: "lg:max-w-[max(1000px,calc(70vw_-_8px))]",
    bar: "lg:rounded-[20px] lg:border lg:border-glass-line lg:bg-glass lg:px-3.5 lg:shadow-glass lg:backdrop-blur-xl",
    gap: "lg:gap-4",
    showNav: "lg:block",
    hideOnDesktop: "lg:hidden",
  },
  md: {
    header: "md:px-8 md:pt-6",
    row: "md:relative md:mx-auto",
    rowFixed: "md:max-w-[1000px]",
    rowGrow: "md:max-w-[max(1000px,calc(70vw_-_8px))]",
    bar: "md:rounded-[20px] md:border md:border-glass-line md:bg-glass md:px-3.5 md:shadow-glass md:backdrop-blur-xl",
    gap: "md:gap-4",
    showNav: "md:block",
    hideOnDesktop: "md:hidden",
  },
} as const satisfies Record<ShellCollapse, Record<string, string>>;
