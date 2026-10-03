"use client";

import { COLLAPSE_CLASSES, type ShellCollapse } from "./collapse";
import { cx } from "./cx";
import { useShell } from "./provider";

/**
 * The header's lockup (Hub 2026, frames 302:12752 desktop and 302:12702
 * phone; 0g-ui#12): the 0G mark, and with a `product` a divider and its
 * name. SiteHeader draws it when a site passes no `logo`.
 *
 * - Where the bar is (from `collapse`): mark 64×31, a 1×30 divider with
 *   12px either side, the name 16/22.
 * - Phones: mark 48×23, no divider, the name 8px off at 14/20.
 *
 * The name is the design's "BOLD" style. Figma reports it as Regola 600
 * because that is the Bold face's own weight class, and the sites load
 * that face at 700, so `font-bold` is the class that picks it. The mark
 * and the name paint in ink, the divider in `lockup-rule`.
 *
 * The name is trimmed to its cap height and baseline (`text-box`), so
 * `items-center` centres its capitals on the mark, as the design does
 * (0g-ui#15). Its line box alone is 13 above the baseline to 3 below in
 * Regola, which put the capitals 1.25 to 1.6px high. The span is a flex
 * item, so it is blockified and the trim applies. Firefox has no
 * `text-box` yet and keeps the offset.
 *
 * It links home through the host's `Link`, named "0G Hub" with a product
 * and "0G" without. The mark is the wordmark's two paths, as the hub's
 * lockup inlined them, so it paints with currentColor.
 */
export function Lockup({ product, collapse = "lg" }: { product?: string; collapse?: ShellCollapse }) {
  const { Link } = useShell();
  const c = COLLAPSE_CLASSES[collapse];
  return (
    <Link
      href="/"
      aria-label={product ? `0G ${product}` : "0G"}
      className={cx(
        "flex shrink-0 items-center gap-2 rounded-[4px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        c.lockupGap,
      )}
    >
      <svg viewBox="0 9 160 78" className={cx("h-[23px] w-[48px]", c.lockupMark)} fill="currentColor" aria-hidden>
        <path d="M12.7564 76.599C27.9701 90.3547 51.4889 89.9098 66.166 75.2651C81.302 60.1612 81.302 35.6736 66.166 20.5697C51.0293 5.4662 26.4887 5.4662 11.3523 20.5697C-2.85916 34.7506 -3.72755 57.2033 8.747 72.3955L21.1931 59.9763C15.4656 51.6888 16.2964 40.2495 23.6854 32.8765C32.0103 24.5694 45.5079 24.5694 53.8332 32.8765C62.1575 41.1836 62.1575 54.6519 53.8332 62.9589C47.4416 69.3364 38.0017 70.8179 30.1942 67.4029L51.0922 46.5499L46.9813 42.4482L12.7564 76.599Z" />
        <path d="M160 49.967C158.99 70.4282 142.045 86.7085 121.288 86.7085C99.8824 86.7085 82.5293 69.3927 82.5293 48.0328C82.5293 26.6729 99.8824 9.35762 121.288 9.35762C141.386 9.35762 157.912 24.6218 159.857 44.1657H142.255C140.432 34.2641 131.738 26.7618 121.289 26.7618C109.515 26.7618 99.9709 36.2851 99.9709 48.0328C99.9709 59.7812 109.515 69.3046 121.289 69.3046C130.327 69.3046 138.052 63.6914 141.153 55.7684H111.598V49.967H160Z" />
      </svg>
      {product && (
        <>
          <span aria-hidden className={cx("hidden h-[30px] w-px bg-lockup-rule", c.lockupRule)} />
          <span
            aria-hidden
            className={cx(
              "text-[14px] leading-[20px] font-bold whitespace-nowrap [text-box:trim-both_cap_alphabetic]",
              c.lockupName,
            )}
          >
            {product}
          </span>
        </>
      )}
    </Link>
  );
}
