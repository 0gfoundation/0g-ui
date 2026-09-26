"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  parseThemeSetting,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemeSetting,
} from "./theme";

/**
 * The theme setting, persisted in localStorage: useSyncExternalStore
 * over an external store, server snapshot "system" (hydration-safe),
 * validated reads, `storage` event for cross-tab honesty. Two extras this store needs:
 *
 * - Every change RE-STAMPS data-theme on <html> (the bootstrap only covers
 *   first paint).
 * - The OS media query is part of the store: while the setting is
 *   "system", an OS theme flip must restamp live, so subscribe also
 *   listens to matchMedia. The host's theme button mounts this hook in
 *   the header, so the listener is always armed.
 */
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

function read(): ThemeSetting {
  return parseThemeSetting(window.localStorage.getItem(THEME_STORAGE_KEY));
}

function readResolved(): "light" | "dark" {
  return resolveTheme(read(), media().matches);
}

function stamp() {
  document.documentElement.dataset.theme = readResolved();
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  const onExternal = () => {
    // Another tab's write or an OS flip: restamp, then re-render.
    stamp();
    listener();
  };
  const mq = media();
  listeners.add(listener);
  window.addEventListener("storage", onExternal);
  mq.addEventListener("change", onExternal);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onExternal);
    mq.removeEventListener("change", onExternal);
  };
}

/**
 * `setting` is what is stored (the dialog's row); `resolved` is what is
 * ON, the same reading the stamp is made from (the header button, #385).
 * Both come from one subscription, so a write from either control
 * reaches the other on the same render. The server snapshot for
 * `resolved` is "light", the no-JS rendering; a visual keyed on it
 * would flash on a dark first paint, so the header button paints its
 * glyph from the stamp in CSS and reads `resolved` only for the label
 * and the click.
 */
export function useTheme(): {
  setting: ThemeSetting;
  resolved: "light" | "dark";
  setSetting: (next: ThemeSetting) => void;
} {
  const setting = useSyncExternalStore(
    subscribe,
    read,
    () => "system" as const,
  );
  const resolved = useSyncExternalStore(
    subscribe,
    readResolved,
    () => "light" as const,
  );

  const setSetting = useCallback((next: ThemeSetting) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    stamp();
    for (const notify of listeners) notify();
  }, []);

  return { setting, resolved, setSetting };
}
