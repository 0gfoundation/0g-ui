"use client";

import { type ReactNode } from "react";

import { localPath } from "./footer-content";
import { useShell } from "./provider";

/**
 * A footer link. The shared content's links are absolute, since the hub
 * links to 0g.ai's pages; one on the site's own `origin` renders as an
 * in-app path through the host's `Link`, in the same tab, and the rest
 * open in a new one, as the nav's outbound links do. A client piece,
 * with the newsletter form, so SiteFooter itself stays a server component.
 */
export function FooterLink({
  href,
  origin,
  className,
  ariaLabel,
  children,
}: {
  href: string;
  origin?: string;
  className: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  const { Link } = useShell();
  const local = localPath(href, origin);
  return local !== null ? (
    <Link href={local} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer" className={className} aria-label={ariaLabel}>
      {children}
    </a>
  );
}
