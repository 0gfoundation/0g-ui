/**
 * The site shell (ADR-0012, #457): the header, the phone tab bar and
 * their scroll behaviour, shaped as the package they become
 * (`@0gfoundation/0g-ui/shell`). Nothing in this folder imports the hub
 * or the framework (eslint.config.mjs enforces it): the host passes its
 * `Link` and pathname through ShellProvider, its lockup, nav items and
 * controls as props, and its labels as strings. The styles are
 * shell.css; the theme mechanism is the `./theme` entry.
 */
export { isIosSafari, SHELL_BOOTSTRAP } from "./bootstrap";
export * from "./icons";
export {
  isActive,
  isGroup,
  isGroupActive,
  MAX_ITEMS,
  type ShellGroup,
  type ShellIcon,
  type ShellItem,
  type ShellLinkItem,
  type ShellNavEntry,
} from "./items";
export { MobileMenu } from "./mobile-menu";
export {
  ShellProvider,
  type ShellLink,
  type ShellLinkProps,
  useShell,
} from "./provider";
export { ShellScroll } from "./scroll-driver";
export { SiteHeader } from "./site-header";
export { TabBar } from "./tab-bar";
export { TopNav } from "./top-nav";
