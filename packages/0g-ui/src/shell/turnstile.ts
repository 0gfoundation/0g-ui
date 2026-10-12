/**
 * Cloudflare Turnstile for the newsletter form: the script loaded once,
 * without a framework (no next/script, ADR-0012 §2), and rendered
 * explicitly, since React mounts the form after the script may already
 * have run. The site key is public; the secret lives with whatever checks
 * the token (0G's newsletter worker), never in a site.
 */
export const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** The part of the widget API the form uses. */
export type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      appearance?: "always" | "execute" | "interaction-only";
      theme?: "light" | "dark" | "auto";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;

/** The widget API, loading the script on first call. A failed load is
 *  forgotten, so the next call tries again. */
export function loadTurnstile(): Promise<TurnstileApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  loading = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
    script.onerror = () => reject(new Error("turnstile failed to load"));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}
