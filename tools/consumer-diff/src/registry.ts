/**
 * The consumer registry, `consumers.json` at the repository root: every
 * site that installs this package, and what its header passes the shell.
 * The consumer diff renders each entry from two builds of the package;
 * a later downstream check reads the repository list from the same file.
 *
 * An entry mirrors the site's own code, not an idea of it. `source` names
 * the files it was taken from, so a change there is a change here. Nav
 * entries and the menu are the site's data verbatim. The logo and the
 * controls are the site's own components, so they are stubs of the same
 * size: the shell lays them out, it does not draw them. Package
 * components a site passes as controls (ThemeButton) render for real.
 *
 * Props are deliberately untyped against the package: an entry describes
 * what the site passes, and the base build of a PR may not know a prop
 * the head adds. The fixture hands them over as they are.
 */

export type LinkEntry = {
  href: string;
  label: string;
  /** An export of `@0gfoundation/0g-ui/shell` ("DiscoverIcon"). */
  icon?: string;
  shortLabel?: string;
  description?: string;
  links?: { href: string; label: string; external?: boolean }[];
  external?: boolean;
};

export type GroupEntry = {
  label: string;
  sections: { heading?: string; items: LinkEntry[] }[];
};

export type NavEntry = LinkEntry | GroupEntry;

/** A control the site draws itself, at its size, or a package component. */
export type Control =
  | { stub: string; width: number; height?: number }
  | { component: "ThemeButton"; toDarkLabel: string; toLightLabel: string };

export type Consumer = {
  /** Short and stable: the report's row, the fixture's URL, the file names. */
  name: string;
  repo: string;
  url?: string;
  stack: string;
  /** Where the entry was read from: the ref and the files. */
  source: { ref: string; files: string[] };
  /** The stylesheet the site imports: the source entry for a Tailwind 4
   *  host, the compiled file for any other. */
  css: "tailwind.css" | "shell.css";
  /** The themes the site renders. "dark" only where something stamps
   *  `data-theme="dark"` (the theme entry or the site's own system). */
  themes: ("light" | "dark")[];
  /** The page the fixture sits on, for the active nav entry. */
  path: string;
  /** CSS of the site's own that reaches the shell: token overrides, the
   *  body's type, the dark variant. Lines of one stylesheet, compiled by
   *  the same Tailwind run as the shell's entry. */
  hostCss?: string[];
  /** The page around the header, as the site's layout has it: the
   *  column the header sits in, and whether the content is pulled up
   *  under the header (0g-site's `-mt-14 lg:-mt-20`). */
  layout?: { maxWidth?: number; contentUnderHeader?: boolean };
  header: {
    logo: { label: string; width: number; height: number };
    /** A heading kept in the header for assistive tech. */
    title?: string;
    navLabel: string;
    items: NavEntry[];
    controls?: Control[];
    width?: "fixed" | "grow";
    menu?: { label: string; closeLabel: string };
  };
  /** The phone tab bar, over the header's items. */
  tabBar?: { label: string };
};

export type Registry = { consumers: Consumer[] };

export function isGroupEntry(entry: NavEntry): entry is GroupEntry {
  return "sections" in entry;
}

/** A structural check of the file, so a typo fails loudly rather than
 *  rendering a site that is not there. Returns the problems found. */
export function checkRegistry(registry: Registry, exports: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const names = new Set<string>();
  for (const c of registry.consumers) {
    const at = `consumers.json ${c.name}`;
    if (!/^[a-z0-9-]+$/.test(c.name)) problems.push(`${at}: name must be lowercase letters, digits, dashes`);
    if (names.has(c.name)) problems.push(`${at}: name is not unique`);
    names.add(c.name);
    if (!/^[\w.-]+\/[\w.-]+$/.test(c.repo)) problems.push(`${at}: repo must be owner/name`);
    if (c.css !== "tailwind.css" && c.css !== "shell.css") problems.push(`${at}: css must be tailwind.css or shell.css`);
    if (c.themes.length === 0) problems.push(`${at}: themes is empty`);
    if (!c.path.startsWith("/")) problems.push(`${at}: path must start with /`);
    const links = c.header.items.flatMap((e) => (isGroupEntry(e) ? e.sections.flatMap((s) => s.items) : [e]));
    for (const link of links) {
      if (link.icon && typeof exports[link.icon] !== "function") {
        problems.push(`${at}: icon ${link.icon} is not an export of @0gfoundation/0g-ui/shell`);
      }
    }
    if (c.tabBar) {
      const groups = c.header.items.filter(isGroupEntry);
      if (groups.length > 0) problems.push(`${at}: a tab bar takes links only, and the items hold groups`);
      if (c.header.items.length > 5) problems.push(`${at}: a tab bar takes at most five items`);
      if (c.header.items.some((e) => !isGroupEntry(e) && !e.icon)) problems.push(`${at}: every tab needs an icon`);
    }
  }
  return problems;
}
