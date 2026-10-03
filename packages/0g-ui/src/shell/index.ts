/**
 * The site shell (ADR-0012, #457): the header, the phone tab bar and
 * their scroll behaviour, the footer and the buttons (0g-ui#9), shaped
 * as the package they become
 * (`@0gfoundation/0g-ui/shell`). Nothing in this folder imports the hub
 * or the framework (eslint.config.mjs enforces it): the host passes its
 * `Link` and pathname through ShellProvider, its lockup, nav items and
 * controls as props, and its labels as strings. The styles are
 * shell.css; the theme mechanism is the `./theme` entry.
 */
export { isIosSafari, SHELL_BOOTSTRAP } from "./bootstrap";
export {
  Button,
  ButtonLink,
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from "./button";
export { type ShellCollapse } from "./collapse";
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
export { Lockup } from "./lockup";
export { MobileMenu } from "./mobile-menu";
export {
  ShellProvider,
  type ShellLink,
  type ShellLinkProps,
  useShell,
} from "./provider";
export { ShellScroll } from "./scroll-driver";
export {
  applyFooterChanges,
  checkFooterChanges,
  FOOTER_CONTENT,
  FOOTER_LABELS,
  FOOTER_LEGAL,
  type FooterChanges,
  type FooterColumn,
  type FooterContent,
  type FooterLabelId,
  type FooterLink,
  type FooterNetwork,
  type FooterSocial,
} from "./footer-content";
export {
  NEWSLETTER_EVENT,
  type NewsletterEventDetail,
  type NewsletterOutcome,
} from "./newsletter-form";
export { SiteFooter } from "./site-footer";
export { SiteHeader } from "./site-header";
export { TabBar } from "./tab-bar";
export { TopNav } from "./top-nav";
