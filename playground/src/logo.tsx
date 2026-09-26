/**
 * A lockup the size of the hub's (mark 25px on phones, 34px from lg, a
 * 30px hairline, the word at cap height), so the header row measures as
 * it does on the hub. The mark's two paths are the 0G wordmark's own.
 */
export function Logo() {
  return (
    <a href="/" aria-label="0G UI playground" className="pg-logo">
      <svg viewBox="0 9 160 78" className="pg-logo-mark" fill="currentColor" aria-hidden>
        <path d="M12.7564 76.599C27.9701 90.3547 51.4889 89.9098 66.166 75.2651C81.302 60.1612 81.302 35.6736 66.166 20.5697C51.0293 5.4662 26.4887 5.4662 11.3523 20.5697C-2.85916 34.7506 -3.72755 57.2033 8.747 72.3955L21.1931 59.9763C15.4656 51.6888 16.2964 40.2495 23.6854 32.8765C32.0103 24.5694 45.5079 24.5694 53.8332 32.8765C62.1575 41.1836 62.1575 54.6519 53.8332 62.9589C47.4416 69.3364 38.0017 70.8179 30.1942 67.4029L51.0922 46.5499L46.9813 42.4482L12.7564 76.599Z" />
        <path d="M160 49.967C158.99 70.4282 142.045 86.7085 121.288 86.7085C99.8824 86.7085 82.5293 69.3927 82.5293 48.0328C82.5293 26.6729 99.8824 9.35762 121.288 9.35762C141.386 9.35762 157.912 24.6218 159.857 44.1657H142.255C140.432 34.2641 131.738 26.7618 121.289 26.7618C109.515 26.7618 99.9709 36.2851 99.9709 48.0328C99.9709 59.7812 109.515 69.3046 121.289 69.3046C130.327 69.3046 138.052 63.6914 141.153 55.7684H111.598V49.967H160Z" />
      </svg>
      <span aria-hidden className="pg-logo-rule" />
      <span aria-hidden className="pg-logo-word">
        UI
      </span>
    </a>
  );
}
