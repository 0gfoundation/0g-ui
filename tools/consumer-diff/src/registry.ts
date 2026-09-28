/**
 * The consumer registry and the manifests it points at.
 *
 * `consumers.json` at the repository root is a list: each site that
 * installs this package, its repository, the ref to read, and where in it
 * the site keeps its manifest. Nothing about a site's header is copied
 * here.
 *
 * The manifest is a TypeScript module in the site's own repository that
 * exports `manifest`. The site's header reads its nav, its width and its
 * menu from it, so what the consumer diff renders is what the site
 * renders. The diff fetches the file and evaluates it on its own
 * (manifest.ts), so it may import types and nothing else. `fixture` holds
 * what only the diff needs: the size of the site's own lockup and
 * controls, the site CSS that reaches the shell, the page to stand on.
 */

export type LinkEntry = {
  href: string;
  label: string;
  /** An export of `@0gfoundation/0g-ui/shell` ("DiscoverIcon"). */
  icon?: string;
  shortLabel?: string;
  description?: string;
  links?: readonly { href: string; label: string; external?: boolean }[];
  external?: boolean;
};

export type GroupEntry = {
  label: string;
  sections: readonly { heading?: string; items: readonly LinkEntry[] }[];
};

export type NavEntry = LinkEntry | GroupEntry;

/** A control the site draws itself, at its size, or a package component. */
export type Control =
  | { stub: string; width: number; height?: number }
  | { component: "ThemeButton"; toDarkLabel: string; toLightLabel: string };

/** One row of consumers.json. */
export type ConsumerEntry = {
  /** Short and stable: the report's row, the fixture's URL, the file names. */
  name: string;
  /** owner/name on GitHub. */
  repo: string;
  /** The branch the manifest is read from, usually the site's main. */
  ref: string;
  /** The manifest's path in the site's repository. */
  manifest: string;
  url?: string;
};

export type Registry = { consumers: ConsumerEntry[] };

/** What a site's manifest module exports as `manifest`. */
export type Manifest = {
  /** The stylesheet the site imports: the source entry for a Tailwind 4
   *  host, the compiled file for any other. */
  css: "tailwind.css" | "shell.css";
  /** "dark" only where something stamps `data-theme="dark"`. */
  themes: readonly ("light" | "dark")[];
  /** When set, every label below is a key in this JSON file (under
   *  `namespace`), as the site's i18n resolves it. */
  messages?: { file: string; namespace?: string };
  header: {
    navLabel: string;
    items: readonly NavEntry[];
    width?: "fixed" | "grow";
    menu?: { label: string; closeLabel: string };
  };
  /** The phone tab bar, over the header's items. */
  tabBar?: { label: string };
  fixture: {
    /** The page the fixture stands on, for the active nav entry. */
    path: string;
    logo: { label: string; width: number; height: number };
    /** A heading kept in the header for assistive tech. */
    title?: string;
    controls?: readonly Control[];
    /** The column the header sits in, and whether the content is pulled
     *  up under the header. */
    layout?: { maxWidth?: number; contentUnderHeader?: boolean };
    /** The site's own CSS that reaches the shell: token overrides, the
     *  body's type, the dark variant. Compiled by the same Tailwind run
     *  as the shell's entry. */
    hostCss?: readonly string[];
  };
};

/** A manifest resolved for rendering: labels in English, the fixture's
 *  facts beside the header. What the fixture page receives. */
export type Consumer = {
  name: string;
  repo: string;
  ref: string;
  css: Manifest["css"];
  themes: Manifest["themes"];
  path: string;
  hostCss?: readonly string[];
  layout?: { maxWidth?: number; contentUnderHeader?: boolean };
  header: {
    logo: { label: string; width: number; height: number };
    title?: string;
    navLabel: string;
    items: NavEntry[];
    controls?: readonly Control[];
    width?: "fixed" | "grow";
    menu?: { label: string; closeLabel: string };
  };
  tabBar?: { label: string };
};

export function isGroupEntry(entry: NavEntry): entry is GroupEntry {
  return "sections" in entry;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Problems with consumers.json itself. */
export function checkRegistry(registry: Registry): string[] {
  const problems: string[] = [];
  const names = new Set<string>();
  for (const c of registry.consumers) {
    const at = `consumers.json ${c.name}`;
    if (!/^[a-z0-9-]+$/.test(c.name)) problems.push(`${at}: name must be lowercase letters, digits, dashes`);
    if (names.has(c.name)) problems.push(`${at}: name is not unique`);
    names.add(c.name);
    if (!/^[\w.-]+\/[\w.-]+$/.test(c.repo)) problems.push(`${at}: repo must be owner/name`);
    if (!c.ref) problems.push(`${at}: ref is empty`);
    if (!/\.tsx?$/.test(c.manifest)) problems.push(`${at}: manifest must be a .ts file`);
  }
  return problems;
}

/** Problems with a manifest's shape, as evaluated from the site's file. */
export function checkManifest(value: unknown): string[] {
  if (!isObject(value)) return ["exports no `manifest` object"];
  const m = value as Partial<Manifest>;
  const problems: string[] = [];
  if (m.css !== "tailwind.css" && m.css !== "shell.css") problems.push("css must be tailwind.css or shell.css");
  if (!Array.isArray(m.themes) || m.themes.length === 0 || m.themes.some((t) => t !== "light" && t !== "dark")) {
    problems.push("themes must list light and/or dark");
  }
  if (!isObject(m.header) || typeof m.header.navLabel !== "string" || !Array.isArray(m.header.items)) {
    problems.push("header needs navLabel and items");
  }
  if (!isObject(m.fixture) || typeof m.fixture.path !== "string" || !isObject(m.fixture.logo)) {
    problems.push("fixture needs path and logo");
  }
  return problems;
}

/** Looks a label up in the site's messages, or returns it as written. */
function labeller(manifest: Manifest, messages: unknown): (key: string) => string {
  if (!manifest.messages) return (key) => key;
  const ns = manifest.messages.namespace;
  const table = ns && isObject(messages) ? messages[ns] : messages;
  return (key) => {
    const value = isObject(table) ? table[key] : undefined;
    if (typeof value !== "string") {
      throw new Error(`label ${ns ? `${ns}.` : ""}${key} is not in ${manifest.messages!.file}`);
    }
    return value;
  };
}

/** A manifest as the fixture renders it, labels resolved. */
export function resolveManifest(entry: ConsumerEntry, ref: string, manifest: Manifest, messages?: unknown): Consumer {
  const say = labeller(manifest, messages);
  const link = (l: LinkEntry): LinkEntry => ({
    ...l,
    label: say(l.label),
    ...(l.shortLabel ? { shortLabel: say(l.shortLabel) } : {}),
    ...(l.links ? { links: l.links.map((x) => ({ ...x, label: say(x.label) })) } : {}),
  });
  const items = manifest.header.items.map((e): NavEntry =>
    isGroupEntry(e)
      ? { label: say(e.label), sections: e.sections.map((s) => ({ ...s, heading: s.heading && say(s.heading), items: s.items.map(link) })) }
      : link(e),
  );
  const { fixture, header } = manifest;
  return {
    name: entry.name,
    repo: entry.repo,
    ref,
    css: manifest.css,
    themes: manifest.themes,
    path: fixture.path,
    hostCss: fixture.hostCss,
    layout: fixture.layout,
    header: {
      logo: fixture.logo,
      title: fixture.title,
      navLabel: say(header.navLabel),
      items,
      controls: fixture.controls,
      width: header.width,
      menu: header.menu && { label: say(header.menu.label), closeLabel: say(header.menu.closeLabel) },
    },
    tabBar: manifest.tabBar && { label: say(manifest.tabBar.label) },
  };
}

/** What a build of the package cannot give a site: an icon it names that
 *  the build does not export, a tab bar over groups or over too many. */
export function checkConsumer(c: Consumer, exports: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const links = c.header.items.flatMap((e) => (isGroupEntry(e) ? e.sections.flatMap((s) => s.items) : [e]));
  for (const link of links) {
    if (link.icon && typeof exports[link.icon] !== "function") {
      problems.push(`icon ${link.icon} is not an export of @0gfoundation/0g-ui/shell`);
    }
  }
  if (c.tabBar) {
    if (c.header.items.some(isGroupEntry)) problems.push("a tab bar takes links only, and the items hold groups");
    if (c.header.items.length > 5) problems.push("a tab bar takes at most five items");
    if (c.header.items.some((e) => !isGroupEntry(e) && !e.icon)) problems.push("every tab needs an icon");
  }
  return problems;
}
