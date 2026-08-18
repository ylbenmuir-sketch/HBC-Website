/**
 * Drift guard for the site assistant's content index.
 *
 *   npm run check:index            verify every mirrored passage
 *   npm run check:index -- --dump app/first-visit/page.tsx
 *                                 print a page's normalized prose, which is
 *                                 what mirrored copy must be authored from
 *
 * Two checks, against two different ways the index can quietly stop matching
 * the site.
 *
 * ## 1. The mirror
 *
 * Most of the index is DERIVED — lib/concerns.ts, lib/faq.ts, lib/locations.ts
 * and lib/site-config.ts are imported directly, so they cannot drift. The four
 * pages in §2's list that carry their copy inline as JSX (`/`, `/about`,
 * `/first-visit`, `/how-lens-works`) cannot be imported, so lib/chat/site-copy.ts
 * mirrors those passages by hand. Every `mirror` string must still appear,
 * verbatim, in the page it claims to come from. Edit the page, forget the
 * mirror, and the check fails.
 *
 * ## 2. The [CONFIRM] tags
 *
 * The mirror check compares *prose*, and a `<ConfirmTag>` is not prose — it is
 * a sibling element holding an unverified-fact marker. So a page could grow one
 * beside copy the assistant was already quoting and every check here passed.
 * That is not hypothetical: it is how the assistant came to state an HSA/FSA
 * policy that /first-visit flags as unconfirmed on the same screen.
 *
 * The second check therefore reads the tags themselves. Every ConfirmTag
 * payload in every page the index draws copy from must appear in
 * `CONFIRM_TAG_INVENTORY`, and every inventory entry must still be on its page.
 * Add a tag, remove one, or rename one, and the check fails until somebody says
 * in that table whether the copy beside it is now excluded or still safe.
 *
 * ## 3. The static guide
 *
 * `public/guides/why-regulation-fails.html` is a hand-authored file served
 * straight from `public/`. It has no route, so `next build` never compiles
 * it, `tsc` never sees it, and `check:layout` never loads it — nothing in
 * this repo reads that file except this check.
 *
 * It hardcodes four things that also live in `lib/site-config.ts`: the phone
 * number twice (`tel:` href and display text), and the guide's own PDF path
 * twice. Those are copies, not references, and a copy with nothing watching
 * it is how the site ends up publishing a disconnected number in a document
 * people keep. So the values are asserted against their source here.
 *
 * It also asserts the guide links to the site with root-relative hrefs. It
 * shipped once with absolute `https://harmonizedbraincenterstn.com` links,
 * which work in production and send every preview and local visitor to the
 * live site instead — a bug that tests clean everywhere except where you
 * would notice it.
 *
 * Runs on plain Node — site-copy.ts holds no runtime imports, so Node's
 * built-in TypeScript stripping can read it without a build step. Keep it that
 * way: that is why the inventory names tags as strings instead of importing
 * them, and why content-index.ts resolves the names to constants instead.
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

const { MIRRORED_PAGES, COPY_TOKENS, CONFIRM_TAG_NAMES, CONFIRM_TAG_INVENTORY } =
  await import("../lib/chat/site-copy.ts");
const { PHONE_TEL, PHONE_DISPLAY, GUIDE_PATH, GUIDE_HTML_PATH, SITE_URL } =
  await import("../lib/site-config.ts");

const failures = [];
let checked = 0;

for (const page of MIRRORED_PAGES) {
  const source = normalizePage(
    readFileSync(join(ROOT, page.sourceFile), "utf8")
  );
  for (const passage of page.passages) {
    checked += 1;
    const chunks = [passage.mirror ?? passage.text].flat();

    // An empty mirror claims "the page renders a constant, not prose, so there
    // is nothing that could drift". Verify the claim instead of trusting it:
    // strip the copy tokens and anything left is prose that IS mirrorable, and
    // an empty mirror would be silently skipping it.
    if (chunks.length === 0) {
      const prose = passage.text.replace(/\{[A-Z_]+\}/g, "").trim();
      if (prose.length > 0) {
        failures.push(
          `${passage.id}\n    mirror is [] but the text is not purely copy tokens\n` +
            `    left over: "${prose.slice(0, 80)}${prose.length > 80 ? "…" : ""}"`
        );
      }
    }

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
    if (passage.confirmTag && !CONFIRM_TAG_NAMES.includes(passage.confirmTag)) {
      failures.push(
        `${passage.id}\n    unknown confirmTag ${passage.confirmTag} — add it to CONFIRM_TAG_NAMES and resolve it in content-index.ts`
      );
    }
  }
}

/**
 * The ConfirmTag payloads a page renders, as written.
 *
 * `<ConfirmTag>{HSA_FSA_TAG}</ConfirmTag>` yields `HSA_FSA_TAG`;
 * `<ConfirmTag style={{ fontSize: 11 }}>{X.note!}</ConfirmTag>` yields
 * `X.note!`; a literal child yields itself. Identifiers rather than values,
 * because that is what the page actually says and what a reader comparing the
 * two files can see.
 */
function confirmTagsIn(source) {
  const found = new Set();
  for (const [, inner] of source.matchAll(
    /<ConfirmTag\b[^>]*>([\s\S]*?)<\/ConfirmTag>/g
  )) {
    const payload = inner.replace(/\s+/g, " ").trim().replace(/^\{|\}$/g, "").trim();
    if (payload) found.add(payload);
  }
  return found;
}

for (const [sourceFile, declared] of Object.entries(CONFIRM_TAG_INVENTORY)) {
  const found = confirmTagsIn(readFileSync(join(ROOT, sourceFile), "utf8"));
  const expected = Object.keys(declared);

  for (const tag of found) {
    if (!expected.includes(tag)) {
      failures.push(
        `${sourceFile}\n    renders <ConfirmTag>${tag}</ConfirmTag>, which is not in CONFIRM_TAG_INVENTORY\n` +
          `    Decide what the index does with the copy beside it — exclude the passage\n` +
          `    with a confirmTag, or record why it is not indexed — then add it there.`
      );
    }
  }
  for (const tag of expected) {
    if (!found.has(tag)) {
      failures.push(
        `${sourceFile}\n    CONFIRM_TAG_INVENTORY lists ${tag}, which the page no longer renders\n` +
          `    If the fact was confirmed, drop any confirmTag holding its passage out\n` +
          `    of the index (lib/chat/) and remove the entry.`
      );
    }
  }
}

/* ---------------------------------------------------------------- */
/* 3. The static guide                                                */
/* ---------------------------------------------------------------- */

const guideFile = `public${GUIDE_HTML_PATH}`;
let guideChecks = 0;

function guideMustContain(html, needle, what) {
  guideChecks += 1;
  if (!html.includes(needle)) {
    failures.push(
      `${guideFile}\n    no longer contains ${what}: ${needle}\n` +
        `    It is a static file — nothing else in the build reads it. Update the\n` +
        `    HTML by hand to match lib/site-config.ts, in the same commit.`
    );
  }
}

let guideHtml = null;
try {
  guideHtml = readFileSync(join(ROOT, guideFile), "utf8");
} catch {
  failures.push(
    `${guideFile}\n    is missing, but lib/site-config.ts points GUIDE_HTML_PATH at it\n` +
      `    Either restore the file or retire the GUIDE_* block and the CTA with it.`
  );
}

if (guideHtml !== null) {
  guideMustContain(guideHtml, `href="tel:${PHONE_TEL}"`, "the site phone number");
  guideMustContain(guideHtml, PHONE_DISPLAY, "the displayed phone number");
  guideMustContain(guideHtml, `href="${GUIDE_PATH}"`, "its own PDF link");

  // The PDF the guide offers has to actually be there. Two links point at it
  // and neither is reachable from any route, so a rename breaks a download
  // that nothing else would exercise.
  guideChecks += 1;
  try {
    readFileSync(join(ROOT, `public${GUIDE_PATH}`));
  } catch {
    failures.push(
      `public${GUIDE_PATH}\n    is linked twice from ${guideFile} but does not exist\n` +
        `    Restore it, or rename it in site-config AND in the guide's markup.`
    );
  }

  // Root-relative or off-site, never our own domain spelled out: an absolute
  // self-link works in production and silently leaves every preview.
  guideChecks += 1;
  const host = new URL(SITE_URL).host.replace(/^www\./, "");
  const absolute = [
    ...guideHtml.matchAll(new RegExp(`href="https?://(?:www\\.)?${host}[^"]*"`, "g")),
  ].map((m) => m[0]);
  if (absolute.length > 0) {
    failures.push(
      `${guideFile}\n    links to this site absolutely ${absolute.length} time(s):\n` +
        absolute.map((a) => `      ${a}`).join("\n") +
        `\n    Make them root-relative (/contact, /first-visit, …). Absolute self-links\n` +
        `    resolve in production and send every preview visitor to the live site.`
    );
  }
}

const taggedPages = Object.keys(CONFIRM_TAG_INVENTORY).length;
const taggedCount = Object.values(CONFIRM_TAG_INVENTORY).reduce(
  (n, tags) => n + Object.keys(tags).length,
  0
);

if (failures.length > 0) {
  console.error(`\n❌  content index out of date — ${failures.length} problem(s):\n`);
  for (const failure of failures) console.error(`  • ${failure}\n`);
  console.error(
    "  Re-read the page and update lib/chat/site-copy.ts. To see the page's\n" +
      "  prose as this check reads it:\n" +
      "    npm run check:index -- --dump <path to page>\n"
  );
  process.exit(1);
}

console.log(
  `✓ content index: ${checked} mirrored passage(s) match their source pages\n` +
    `✓ [CONFIRM] tags: ${taggedCount} accounted for across ${taggedPages} page(s)\n` +
    `✓ static guide: ${guideChecks} site-config value(s) still match ${guideFile}`
);
