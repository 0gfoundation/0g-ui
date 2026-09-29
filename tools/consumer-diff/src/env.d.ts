/** The host stylesheet of a build, generated per site and side (vite.config.ts). */
declare module "@host.css";

/** The sites resolved from their manifests, written by run.ts (vite.config.ts).
 *  Each is a `Consumer` (registry.ts); main.tsx says so where it reads them. */
declare module "@consumers" {
  const value: { consumers: unknown[] };
  export default value;
}
