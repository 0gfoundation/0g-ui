"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type ComponentType,
  type ReactNode,
} from "react";

/** What the shell renders an in-app link with: the host's router link,
 *  or a plain anchor. It receives the anchor's attributes and `href`. */
export type ShellLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children?: ReactNode;
};
export type ShellLink = ComponentType<ShellLinkProps>;

type ShellContextValue = { Link: ShellLink; pathname: string };

const ShellContext = createContext<ShellContextValue | null>(null);

function DefaultLink(props: ShellLinkProps) {
  return <a {...props} />;
}

const subscribe = (notify: () => void) => {
  window.addEventListener("popstate", notify);
  window.addEventListener("hashchange", notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener("hashchange", notify);
  };
};
const readPathname = () => window.location.pathname;
const serverPathname = () => "";

/** The browser's own pathname, for a host without a router or without a
 *  provider. Follows history navigation; a router that pushes state
 *  without a popstate needs the provider. Empty on the server. */
function useLocationPathname(): string {
  return useSyncExternalStore(subscribe, readPathname, serverPathname);
}

/**
 * Hands the shell the two things that differ per host (ADR-0012): how to
 * render an in-app link and what the current path is. Both default to
 * the browser's own (`<a>`, `window.location.pathname`), so a plain site
 * needs no provider; a routed one passes its `Link` and the value of its
 * pathname hook.
 */
export function ShellProvider({
  Link,
  pathname,
  children,
}: {
  Link?: ShellLink;
  pathname?: string;
  children: ReactNode;
}) {
  const fallback = useLocationPathname();
  const value = useMemo(
    () => ({ Link: Link ?? DefaultLink, pathname: pathname ?? fallback }),
    [Link, pathname, fallback],
  );
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  const fallback = useLocationPathname();
  return ctx ?? { Link: DefaultLink, pathname: fallback };
}
