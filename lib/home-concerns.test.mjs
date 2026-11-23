// The homepage concern cards (lib/home-concerns.ts): every card's one line
// is words from that concern page's own intro, and every card reports a
// fixed concern_chip_click label.
// Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(spec, ctx, next) {
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) return next(`${spec}.ts`, ctx);
    return next(spec, ctx);
  },
});

const { HOME_CONCERN_GROUPS, concernCardLine } = await import("./home-concerns.ts");
const { getConcern } = await import("./concerns.ts");
const { CONCERN_CHIPS } = await import("./analytics.ts");

const LEAD = "LENS neurofeedback for ";

test("two tabs: adults (6 cards) and children & families (4 cards)", () => {
  assert.deepEqual(HOME_CONCERN_GROUPS.map((g) => [g.label, g.cards.length]), [
    ["For adults", 6],
    ["For children & families", 4],
  ]);
});

test("every card line is cut from its concern page's intro, nothing added", () => {
  for (const group of HOME_CONCERN_GROUPS) {
    for (const c of group.cards) {
      const concern = getConcern(c.slug);
      assert.ok(concern, c.slug);
      assert.equal(c.title, concern.title);
      assert.equal(c.href, `/concerns/${c.slug}`);
      // Undo the two documented edits: "For …" back to the intro's opening,
      // and the closing full stop a cut at the dash adds.
      const restored = concern.heroSub.startsWith(LEAD) ? c.line.replace(/^For /, LEAD) : c.line;
      const body = restored.replace(/\.$/, "");
      assert.ok(concern.heroSub.startsWith(body), `${c.slug}: "${c.line}" is not the start of its intro`);
      assert.ok(c.line.length <= 160, `${c.slug}: ${c.line.length} characters`);
    }
  }
});

test("every card reports a listed chip label", () => {
  for (const group of HOME_CONCERN_GROUPS) {
    for (const c of group.cards) assert.ok(CONCERN_CHIPS.includes(c.chip), c.chip);
  }
});

test("concernCardLine: the three cuts", () => {
  assert.equal(concernCardLine("LENS neurofeedback for a — b.", "toDash"), "For a.");
  assert.equal(concernCardLine("LENS neurofeedback for a — b.", "full"), "For a — b.");
  assert.equal(concernCardLine("One. Two is here. Three.", "two"), "One. Two is here.");
});
