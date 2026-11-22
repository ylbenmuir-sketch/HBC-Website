/**
 * The homepage's `dateModified` (Ben, 2026-11-21): no longer a date typed
 * into lib/pages.ts. It had read 2026-10-19 through a month of homepage
 * changes, because nothing made anyone bump it.
 *
 * It is now the date of the last commit that touched app/page.tsx — the
 * file the homepage's words live in — read from git when the site is built
 * (next.config.ts sets HBC_HOME_DATE, and Next inlines it, so every server
 * instance and the browser agree for the life of a deployment). That is a
 * CONTENT date, which is what app/sitemap.ts asks of every `lastmod`: it
 * moves when the homepage changes and stays put when something else does.
 *
 * Two honest limits. Vercel builds from a shallow clone, so once
 * app/page.tsx is older than the history Vercel fetched, git answers with
 * the oldest commit it has — later than the true date, never later than
 * the build. And where there is no git at all (or outside a build: the
 * unit tests, the check scripts), it is today's date, i.e. the build date.
 * Either way it is a date on or after the homepage's last change.
 *
 * No imports: lib/pages.ts is read by plain Node in the checks.
 */
export const HOME_DATE_MODIFIED: string =
  /^\d{4}-\d{2}-\d{2}$/.test(process.env.HBC_HOME_DATE ?? "") ? (process.env.HBC_HOME_DATE as string) : new Date().toISOString().slice(0, 10);
