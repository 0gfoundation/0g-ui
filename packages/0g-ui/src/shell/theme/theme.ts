/**
 * Theme setting (#81): the explicit toggle over dark mode v1 (#80).
 *
 * The resolved theme lives as `data-theme` on <html>, stamped BEFORE first
 * paint by THEME_BOOTSTRAP (inline, first in <body>) and kept current by
 * use-theme.ts afterwards. The host's CSS keys every dark token on
 * [data-theme="dark"] — CSS has ONE source of truth for what dark looks
 * like, and JS has one for which theme applies. "system" is resolved here,
 * not in CSS: a media-query fallback would need a second copy of the token
 * block, and a site that ships this is unusable without JS anyway, so
 * no-JS renders light and loses nothing it had.
 *
 * One thing owns `data-theme` on a page (ADR-0012): a host with a theme
 * system of its own does not use this entry.
 */
export type ThemeSetting = "system" | "light" | "dark";

export const THEME_SETTINGS: readonly ThemeSetting[] = [
  "system",
  "light",
  "dark",
];

/** One key for every site on the shell; storage is per origin, so each
 *  site still remembers its own choice. The hub stored `hub.theme` until
 *  2026-09-26 and carries it over in its own bootstrap (#457). */
export const THEME_STORAGE_KEY = "0g.theme";

/** Storage is user-editable and versions drift — junk means "system". */
export function parseThemeSetting(raw: string | null): ThemeSetting {
  return raw === "light" || raw === "dark" ? raw : "system";
}

export function resolveTheme(
  setting: ThemeSetting,
  systemDark: boolean,
): "light" | "dark" {
  return setting === "system" ? (systemDark ? "dark" : "light") : setting;
}

/**
 * Pre-paint bootstrap — MUST mirror parseThemeSetting + resolveTheme (the
 * theme.test.ts contract test holds them together). Inline and synchronous
 * so the first paint is already themed; wrapped so a storage-less context
 * (some private modes) degrades to system-light, never a crash.
 */
export const THEME_BOOTSTRAP = `try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});document.documentElement.dataset.theme=s==="light"||s==="dark"?s:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch(e){}`;

/**
 * The header button's write (#385): the opposite of what is ON, as an
 * explicit setting. From "system" it lands on whichever explicit theme
 * the OS was not showing, and from there it alternates between the two
 * explicit themes; nothing here ever writes "system" back — that is the
 * settings dialog's row alone.
 */
export function flipTheme(resolved: "light" | "dark"): "light" | "dark" {
  return resolved === "dark" ? "light" : "dark";
}
