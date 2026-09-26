/** Joins the truthy class names. The shell composes a few conditional
 *  classes and takes no `className` from outside, so it needs no merge. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
