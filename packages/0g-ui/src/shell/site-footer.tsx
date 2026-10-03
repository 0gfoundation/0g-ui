import { type CSSProperties, type ReactNode } from "react";

import {
  applyFooterChanges,
  FOOTER_CONTENT,
  FOOTER_LABELS,
  FOOTER_LEGAL,
  footerLabel,
  NETWORK_NAMES,
  socialId,
  type FooterChanges,
  type FooterLabelId,
} from "./footer-content";
import { FooterLink } from "./footer-link";
import { NewsletterForm } from "./newsletter-form";
import { SocialGlyph } from "./social-glyphs";

/**
 * The site footer (design system 2026, "footer full web" and "footer full
 * mobile"; 0g-ui#9): one layout at three widths, the same on every 0G
 * site, from the shared content in footer-content.ts with the site's
 * `changes` applied.
 *
 * - Desktop (lg): the design's 300px row. The newsletter over the lockup
 *   on the left, the columns, the socials, spread across the column; the
 *   legal row under a hairline.
 * - Tablet (md to lg): the row does not fit and the design has no frame
 *   for it (0g-ui#18). Every column in one row, an equal track each; under
 *   them the newsletter at the left and the socials at the right, each at
 *   most half the row so they never meet; then the lockup.
 * - Phone: the columns in pairs with the socials last (Products | Build,
 *   Ecosystem | Socials), a column with `phone: false` left out; then the
 *   newsletter, the lockup, and the legal row stacked. The pair are equal
 *   halves, except that the right one never drops under 172px, the four
 *   social boxes in a row: at 390px that is the design's 170 and 172.
 *
 * One DOM for the three, ordered by grid placement, so the form renders
 * once. The lockup comes last in it, as it does on screen at every
 * width, so focus follows the page; only the newsletter on phones and
 * tablets (under the links on screen) is out of step. The surface is token override, a token per element
 * (`footer-*` and `field-*`, tailwind.css): a site redefines them on
 * `.shell-footer` (0g.ai: white on its landscape) and passes the art as
 * `background`.
 *
 * A server component: the links and the form are the client pieces.
 */
export function SiteFooter({
  logo,
  background,
  newsletter,
  changes,
  labels,
  origin,
  before,
  after,
}: {
  /** The site's lockup, 80px wide in the design. */
  logo: ReactNode;
  /** Art behind the footer, filling it (0g.ai's landscape and its wash). */
  background?: ReactNode;
  /** Where the signup posts. Without it the footer has no newsletter. */
  newsletter?: { endpoint: string };
  /** How this site's footer differs from the shared content. */
  changes?: FooterChanges;
  /** The site's strings by id: FOOTER_LABELS', and any column's or link's.
   *  English where absent. */
  labels?: Partial<Record<FooterLabelId | (string & {}), string>>;
  /** The site's own origin ("https://0g.ai"): shared links there render
   *  as in-app paths, in the same tab. */
  origin?: string;
  /** Above the links, at every width (the hub's "Back to the top"). */
  before?: ReactNode;
  /** Between the links and the legal row. */
  after?: ReactNode;
}) {
  const { columns, socials } = applyFooterChanges(FOOTER_CONTENT, changes);
  const say = (id: FooterLabelId) => footerLabel(labels, id, FOOTER_LABELS[id]);
  const year = new Date().getFullYear();

  const heading =
    "text-[10px] leading-[1.6] font-medium tracking-normal text-footer-heading uppercase [text-box:trim-both_cap_alphabetic]";
  const link =
    "block w-fit text-[14px] leading-[1.4] font-light tracking-normal whitespace-nowrap text-footer-text transition-colors duration-200 [text-box:trim-both_cap_alphabetic] hover:text-footer-title focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 md:text-[16px]";

  return (
    <footer className="shell-footer relative isolate overflow-hidden">
      {background && (
        <div aria-hidden className="absolute inset-0 -z-10">
          {background}
        </div>
      )}
      {/* The side gutter is the design's 16px up to its 390px phone, then
          grows with the width to meet the tablet's 32px at md, so a wide
          phone's columns do not sit on the edge. A padding percentage is
          of the footer's width. */}
      <div className="mx-auto flex w-full max-w-[1064px] flex-col gap-6 px-[clamp(16px,calc(16px_+_(100%_-_390px)_*_16_/_378),32px)] pt-[40px] pb-[24px] md:gap-9 md:px-[32px] md:pt-[64px]">
        {before && <div className="mb-3 flex justify-center md:mb-0">{before}</div>}

        <div
          className="grid grid-cols-[minmax(0,1fr)_minmax(172px,1fr)] gap-x-4 gap-y-9 md:grid-cols-[repeat(var(--footer-columns),minmax(0,1fr))] md:gap-x-6 md:gap-y-12 lg:h-[300px] lg:grid-cols-[auto_repeat(var(--footer-columns),auto)_auto] lg:grid-rows-[auto_1fr] lg:justify-between lg:gap-x-10 lg:gap-y-0"
          style={{ "--footer-columns": columns.length } as CSSProperties}
        >
          {newsletter && (
            <div className="order-2 col-span-2 flex flex-col gap-4 md:col-[1/-1] md:row-start-2 md:max-w-1/2 md:justify-self-start lg:order-none lg:col-span-1 lg:col-start-1 lg:row-start-1 lg:max-w-none lg:justify-self-auto">
              <p className="text-[20px] leading-[1.3] font-medium tracking-normal text-footer-title [text-box:trim-both_cap_alphabetic] md:max-w-[180px]">
                {say("newsletter")}
              </p>
              <NewsletterForm
                endpoint={newsletter.endpoint}
                id="shell-footer-email"
                labels={{
                  email: say("email"),
                  submit: say("subscribe"),
                  done: say("subscribed"),
                  invalid: say("subscribeInvalid"),
                  limited: say("subscribeLimited"),
                  closed: say("subscribeClosed"),
                  failed: say("subscribeFailed"),
                }}
              />
            </div>
          )}

          <nav aria-label={say("nav")} className="contents">
            {columns.map((column) => (
              <div
                key={column.id}
                className={`order-1 flex min-w-0 flex-col gap-5 lg:order-none lg:row-span-2 lg:gap-6 ${column.phone === false ? "max-md:hidden" : ""}`}
              >
                <p className={heading}>{footerLabel(labels, column.id, column.label)}</p>
                <ul className="flex flex-col gap-4">
                  {column.links.map((l) => (
                    <li key={l.id}>
                      <FooterLink href={l.href} origin={origin} className={link}>
                        {footerLabel(labels, l.id, l.label)}
                      </FooterLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {socials.length > 0 && (
            <div className="order-1 flex flex-col gap-5 md:col-[1/-1] md:row-start-2 md:max-w-1/2 md:justify-self-end lg:order-none lg:col-span-1 lg:row-span-2 lg:max-w-none lg:justify-self-auto lg:gap-4">
              <p className={heading}>{say("socials")}</p>
              <ul className="flex w-full flex-wrap gap-1 md:w-auto lg:w-[128px]">
                {socials.map((social) => (
                  <li key={socialId(social)}>
                    <FooterLink
                      href={social.href}
                      className="relative block size-[40px] rounded-[8px] border border-footer-social-line text-footer-glyph backdrop-blur-[25px] transition-opacity duration-200 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                      ariaLabel={NETWORK_NAMES[social.network]}
                    >
                      <SocialGlyph network={social.network} />
                    </FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="order-3 col-span-2 flex flex-col gap-2 pt-9 md:col-[1/-1] md:pt-0 lg:order-none lg:col-span-1 lg:col-start-1 lg:row-start-2 lg:self-end">
            {logo}
            <p className="text-[12px] leading-[1.5] font-light tracking-normal text-footer-tagline [text-box:trim-both_cap_alphabetic]">
              {say("tagline")}
            </p>
          </div>
        </div>

        {after}

        <div className="flex flex-col gap-4 border-t border-footer-rule pt-4 text-[10px] leading-[1.6] font-medium tracking-normal text-footer-text md:flex-row md:items-start md:justify-between">
          <p className="[text-box:trim-both_cap_alphabetic]">
            © {year} {FOOTER_LEGAL.entity} {say("operator")} {say("rights")}
          </p>
          <ul className="flex shrink-0 items-center gap-4">
            <li>
              <FooterLink href={FOOTER_LEGAL.terms} origin={origin} className="block [text-box:trim-both_cap_alphabetic] hover:text-footer-title">
                {say("terms")}
              </FooterLink>
            </li>
            <li>
              <FooterLink href={FOOTER_LEGAL.privacy} origin={origin} className="block [text-box:trim-both_cap_alphabetic] hover:text-footer-title">
                {say("privacy")}
              </FooterLink>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
