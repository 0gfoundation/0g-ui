/**
 * The theme entry (`@0gfoundation/0g-ui/theme`, ADR-0012 §1): the
 * `data-theme` convention's mechanism, for a host with no theme system
 * of its own. THEME_BOOTSTRAP goes inline, first in the document's body;
 * ThemeButton goes in the header's controls; useTheme is for a host's
 * own settings row. A host that already stamps `data-theme` skips this
 * entry, since one thing owns the attribute on a page.
 */
export {
  flipTheme,
  parseThemeSetting,
  resolveTheme,
  THEME_BOOTSTRAP,
  THEME_SETTINGS,
  THEME_STORAGE_KEY,
  type ThemeSetting,
} from "./theme";
export { ThemeButton } from "./theme-button";
export { useTheme } from "./use-theme";
