/**
 * Drift guard for the site assistant's content index.
 *
 *   npm run check:index            verify every mirrored passage
 *   npm run check:index -- --dump app/first-visit/page.tsx
 *                                 print a page's normalized prose, which is
 *                                 what mirrored copy must be authored from
 *
 * Most of the index is DERIVED — lib/concerns.ts, lib/faq.ts, lib/locations.ts
 * and lib/site-config.ts are imported directly, so they cannot drift. The four
 * pages in §2's list that carry their copy inline as JSX (`/`, `/about`,
 * `/first-visit`, `/how-lens-works`) cannot be imported, so lib/chat/site-copy.ts
 * mirrors those passages by hand. This script is what keeps the mirror honest:
 * every `mirror` string must still appear, verbatim, in the page it claims to
 * come from. Edit the page, forget the mirror, and the check fails.
 *
 * Runs on plain Node — site-copy.ts is type-only at runtime, so Node's built-in
 * TypeScript stripping can import it without a build step.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const ENTITIES = {
  "&mdash;": "—",
  "&ndash;": "–",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&nbsp;": " ",
  "&middot;": "·",
  "&amp;": "&",
  "&reg;": "®",
  "&rarr;": "→",
  "&darr;": "↓",
  "&hellip;": "…",
};

/**
 * A page's rendered prose, near enough to compare against.
 *
 * One pass over the innermost brace groups clears the JSX expressions —
 * `{" "}`, `{BRAIN_MAP_PRICE}`, `{s.p}` — without ever reaching a function
 * body. Groups containing a colon are left alone, because that is what tells
 * an object literal from an expression: the copy in `fiveParts` and
 * `sessionSteps` lives in object literals and has to survive this. Style
 * objects survive it too, and are then taken by tag removal along with the
 * markup they sit in. Entities are decoded and whitespace collapsed, because
 * JSX wraps prose mid-sentence and the line breaks are not content.
 */
export function normalizePage(source) {
  let text = source.replace(/\{[^{}:]*\}/g, " ");
  text = text.replace(/<[^>]*>/g, " ");
  for (const [entity, char] of Object.entries(ENTITIES)) {
    text = text.split(entity).join(char);
  }
  return text.replace(/\s+/g, " ").trim();
}

/** Same normalization for the mirrored side, so only real edits show up. */
function normalizeMirror(text) {
  return text.replace(/\s+/g, " ").trim();
}

const dumpIndex = process.argv.indexOf("--dump");
if (dumpIndex !== -1) {
  const target = process.argv[dumpIndex + 1];
  if (!target) {
    console.error("--dump needs a path, e.g. --dump app/about/page.tsx");
    process.exit(1);
  }
  console.log(normalizePage(readFileSync(join(ROOT, target), "utf8")));
  process.exit(0);
}

const { MIRRORED_PAGES, COPY_TOKENS } = await import("../lib/chat/site-copy.ts");

const failures = [];
let checked = 0;

for (const page of MIRRORED_PAGES) {
  const source = normalizePage(
    readFileSync(join(ROOT, page.sourceFile), "utf8")
  );
  for (const passage of page.passages) {
    checked += 1;
    const chunks = [passage.mirror ?? passage.text].flat();

    for (const chunk of chunks) {
      const mirror = normalizeMirror(chunk);
      if (!source.includes(mirror)) {
        failures.push(
          `${passage.id}\n    not found in ${page.sourceFile}\n    looked for: "${mirror.slice(0, 90)}${mirror.length > 90 ? "…" : ""}"`
        );
      }
    }
    // A [bracketed] note is unverified copy. The page renders it behind a gold
    // [CONFIRM] tag; a conversation has nowhere to put one, so it must never
    // reach the index in the first place.
    if (passage.text.includes("[")) {
      failures.push(`${passage.id}\n    carries a [bracketed] draft note`);
    }
    for (const [token, name] of passage.text.matchAll(/\{([A-Z_]+)\}/g)) {
      if (!COPY_TOKENS.includes(name)) {
        failures.push(
          `${passage.id}\n    unknown copy token ${token} — add it to COPY_TOKENS and give it a value in content-index.ts`
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error(
    `\n❌  content index out of date — ${failures.length} of ${checked} mirrored passage(s) no longer match their page:\n`
  );
  for (const failure of failures) console.error(`  • ${failure}\n`);
  console.error(
    "  Re-read the page and update lib/chat/site-copy.ts. To see the page's\n" +
      "  prose as this check reads it:\n" +
      "    npm run check:index -- --dump <path to page>\n"
  );
  process.exit(1);
}

console.log(
  `✓ content index: ${checked} mirrored passage(s) match their source pages`
);
