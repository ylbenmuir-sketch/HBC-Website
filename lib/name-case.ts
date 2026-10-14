/**
 * "ben muir" → "Ben Muir" (Ben, 2026-10-14). The one name clean-up, applied
 * on save by the consultation route — so the form and the chat both land
 * here — and wherever a name is shown back to the person who typed it.
 *
 * The rule is narrow on purpose: the first letter of every word is made
 * upper case, and nothing is ever made lower case. "mcDonald" stays
 * "McDonald", "DeShawn" stays "DeShawn", "BEN" stays "BEN" — a name typed
 * with capitals inside it was typed that way by the person it belongs to.
 * A hyphen starts a word too ("smith-jones" → "Smith-Jones"); an apostrophe
 * does not, because "o'brien" and "d'angelo" are spelled both ways and there
 * is no guess here that is right for everyone. Runs of whitespace collapse
 * to one space and the ends are trimmed.
 *
 * Import-free, so lib/name-case.test.mjs runs it under plain `node --test`,
 * and the client form imports it as cheaply as the server route.
 */
export function capitalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(^|[\s-])(\p{Ll})/gu, (_, before: string, letter: string) => before + letter.toUpperCase());
}
