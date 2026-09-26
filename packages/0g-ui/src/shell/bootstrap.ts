/**
 * Stamps `data-ios-safari` on <html> before first paint (inline, next
 * to the theme bootstrap in the host's document). Safari 26 on an iPhone ends its
 * layout viewport short of its floating bar and reports no inset, so
 * the phone tab bar needs to know it is there (shell.css,
 * `.shell-nav`). Safari 26 or later by its `Version/` token, since the
 * OS number in the user agent is frozen; CSS anchor positioning is the
 * fallback where the token is missing. In-app Safari views share the
 * user agent and the stamp. Measurements and the reasoning:
 * docs/spec/phone-shell-measurements-2026-09-21.md.
 */
export function isIosSafari(userAgent: string, supportsAnchor = false): boolean {
  if (!/iP(?:hone|od)/.test(userAgent)) return false;
  if (!/Safari\//.test(userAgent)) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|GSA|DuckDuckGo|Brave/.test(userAgent)) return false;
  const version = /Version\/(\d+)/.exec(userAgent);
  return version ? Number(version[1]) >= 26 : supportsAnchor;
}

export const SHELL_BOOTSTRAP = `try{var u=navigator.userAgent,v=/Version\\/(\\d+)/.exec(u);if(/iP(?:hone|od)/.test(u)&&/Safari\\//.test(u)&&!/CriOS|FxiOS|EdgiOS|OPiOS|GSA|DuckDuckGo|Brave/.test(u)&&(v?+v[1]>=26:CSS.supports("anchor-name","--s")))document.documentElement.dataset.iosSafari=""}catch(e){}`;
