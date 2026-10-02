/**
 * The footer's shared content (0g-ui#9): what every 0G site's footer
 * carries, as data. A site states only how its footer differs
 * (`FooterChanges`, from its manifest) and SiteFooter applies that here
 * when it renders, so a link meant for every site is one edit in this
 * file, not one per site.
 *
 * Every column, link and label has a stable `id` beside its English text.
 * `remove` goes by id, so it survives a label edit, and the ids are the
 * keys a translated site maps to its own strings (`labels`). Only pages
 * and accounts that exist: the designs' Stories, Instagram and Facebook
 * stay out until they do.
 */

/** A link in a footer column. */
export type FooterLink = {
  /** Stable, unique across the footer: what `remove` and `labels` name. */
  id: string;
  label: string;
  href: string;
};

export type FooterColumn = {
  id: string;
  label: string;
  links: readonly FooterLink[];
  /** Shown in the phone layout. The design leaves Enterprise out there,
   *  its one link being the page's own sales call. Default true. */
  phone?: boolean;
};

/** The networks SiteFooter has a glyph for. */
export type FooterNetwork = "linkedin" | "x" | "discord" | "github" | "telegram";

/** A social account: the network names its glyph and its accessible
 *  name. Its id for `remove` is `socials.<network>`, apart from the
 *  links' ids (the Build column has a GitHub link too). */
export type FooterSocial = { network: FooterNetwork; href: string };

export type FooterContent = {
  columns: readonly FooterColumn[];
  socials: readonly FooterSocial[];
};

/** How one site's footer differs from the shared content. Plain data, so
 *  it lives in the site's manifest. */
export type FooterChanges = {
  /** Ids to leave out: a column's, a link's, or `socials.<network>`. */
  remove?: readonly string[];
  /** Links to append to a shared column, by the column's id. */
  add?: Readonly<Record<string, readonly FooterLink[]>>;
  /** Whole columns of the site's own, after the shared ones. */
  columns?: readonly FooterColumn[];
  /** Accounts of the site's own, after the shared ones. */
  socials?: readonly FooterSocial[];
};

export const FOOTER_CONTENT: FooterContent = {
  columns: [
    {
      id: "products",
      label: "Products",
      links: [
        { id: "compute", label: "Compute", href: "https://pc.0g.ai" },
        { id: "storage", label: "Storage", href: "https://storage.0g.ai" },
        { id: "chain", label: "Chain", href: "https://chain.0g.ai" },
        { id: "hub", label: "0G Hub", href: "https://hub.0g.ai" },
        { id: "app", label: "0G App", href: "https://app.0g.ai" },
      ],
    },
    {
      id: "build",
      label: "Build",
      links: [
        { id: "builderHub", label: "Builder Hub", href: "https://build.0g.ai" },
        { id: "docs", label: "Documents", href: "https://docs.0g.ai" },
        { id: "github", label: "GitHub", href: "https://github.com/0gfoundation" },
        { id: "faucet", label: "Faucet", href: "https://faucet.0g.ai" },
      ],
    },
    {
      id: "enterprise",
      label: "Enterprise",
      phone: false,
      links: [{ id: "sales", label: "Sales Team", href: "https://0g.ai/contact" }],
    },
    {
      id: "ecosystem",
      label: "Ecosystem",
      links: [
        { id: "research", label: "Research", href: "https://research.0g.ai" },
        // the FAQ carries the founders; there is no about page
        { id: "about", label: "About Us", href: "https://0g.ai/faq" },
        { id: "blog", label: "Blog", href: "https://0g.ai/blog" },
        { id: "foundation", label: "Foundation", href: "https://www.0gfoundation.ai" },
        { id: "press", label: "Press", href: "https://0g.ai/press" },
      ],
    },
  ],
  socials: [
    { network: "linkedin", href: "https://www.linkedin.com/company/0g-labs/" },
    { network: "x", href: "https://x.com/0G_labs" },
    { network: "discord", href: "https://discord.com/invite/0glabs" },
    { network: "github", href: "https://github.com/0gfoundation" },
    { network: "telegram", href: "https://t.me/zgcommunity" },
  ],
};

/**
 * Every string the footer draws that is not a link, by id, in English.
 * The entity, "Zero Gravity Labs Inc.", is not among them: a company's
 * legal name is not translated.
 */
export const FOOTER_LABELS = {
  /** The nav landmark's accessible name. */
  nav: "Footer",
  newsletter: "Sign up for our newsletter",
  email: "Email",
  subscribe: "Sign up",
  subscribed: "Thanks, you're signed up.",
  subscribeFailed: "Something went wrong.",
  socials: "Socials",
  tagline: "The AI trust layer",
  operator: "Operator and publisher of the 0G Hub.",
  rights: "All rights reserved.",
  terms: "Terms",
  privacy: "Privacy",
} as const;

export type FooterLabelId = keyof typeof FOOTER_LABELS;

/** The legal row's links. Absolute: the hub links to 0g.ai's pages. */
export const FOOTER_LEGAL = {
  entity: "Zero Gravity Labs Inc.",
  terms: "https://0g.ai/terms-of-service",
  privacy: "https://0g.ai/privacy-policy",
} as const;

export const NETWORK_NAMES: Record<FooterNetwork, string> = {
  linkedin: "LinkedIn",
  x: "X",
  discord: "Discord",
  github: "GitHub",
  telegram: "Telegram",
};

/** A social's id for `remove`. */
export function socialId(social: FooterSocial): string {
  return `socials.${social.network}`;
}

/** The shared content with a site's changes applied. Ids the shared
 *  content lacks are ignored here; `checkFooterChanges` reports them. */
export function applyFooterChanges(content: FooterContent, changes: FooterChanges = {}): FooterContent {
  const removed = new Set(changes.remove ?? []);
  const columns = [...content.columns, ...(changes.columns ?? [])]
    .filter((column) => !removed.has(column.id))
    .map((column) => ({
      ...column,
      links: [...column.links, ...(changes.add?.[column.id] ?? [])].filter((link) => !removed.has(link.id)),
    }))
    .filter((column) => column.links.length > 0);
  const socials = [...content.socials, ...(changes.socials ?? [])].filter((s) => !removed.has(socialId(s)));
  return { columns, socials };
}

/** What a site's changes name that does not exist, and ids that would
 *  collide: a typo in `remove` would otherwise silently keep a link. */
export function checkFooterChanges(content: FooterContent, changes: FooterChanges = {}): string[] {
  const problems: string[] = [];
  const columnIds = new Set(content.columns.map((c) => c.id));
  const known = new Set<string>([
    ...columnIds,
    ...content.columns.flatMap((c) => c.links.map((l) => l.id)),
    ...content.socials.map(socialId),
  ]);
  for (const id of changes.remove ?? []) {
    if (!known.has(id)) problems.push(`footer.remove: ${id} is not a shared column, link or social`);
  }
  for (const id of Object.keys(changes.add ?? {})) {
    if (!columnIds.has(id)) problems.push(`footer.add: ${id} is not a shared column (a new one goes in footer.columns)`);
  }
  const added = [
    ...Object.values(changes.add ?? {}).flat(),
    ...(changes.columns ?? []).flatMap((c) => [c, ...c.links]),
  ];
  for (const item of added) {
    if (known.has(item.id)) problems.push(`footer: ${item.id} is already a shared id`);
    known.add(item.id);
  }
  return problems;
}

/** A label by id: the site's string where it gives one, else English. */
export function footerLabel(labels: Partial<Record<string, string>> | undefined, id: string, english: string): string {
  return labels?.[id] ?? english;
}

/** A link's in-app path: the path of `href` when it is on `origin` (or already a path), else null. */
export function localPath(href: string, origin?: string): string | null {
  if (href.startsWith("/")) return href;
  if (!origin) return null;
  const base = origin.replace(/\/+$/, "");
  if (href === base) return "/";
  return href.startsWith(`${base}/`) ? href.slice(base.length) : null;
}
