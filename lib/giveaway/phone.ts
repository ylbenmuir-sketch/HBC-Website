/**
 * The entry form's required phone (Ben, 2026-11-10): a US number in any
 * common spelling — "(615) 555-0134", "615.555.0134", "+1 615 555 0134" —
 * stored as E.164, "+16155550134". Ten digits (eleven with a leading 1),
 * an area code that does not start with 0 or 1, nothing but digits, spaces
 * and ( ) . + - typed. Pure, so the form's script and the server share it.
 *
 * The number is for staff to reach a winner. Nothing texts it.
 */
export function normalizeUsPhone(typed: string): string | null {
  const s = (typed ?? "").trim();
  if (!s || /[^\d\s().+\-]/.test(s)) return null;
  let digits = s.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10 || digits[0] === "0" || digits[0] === "1") return null;
  return `+1${digits}`;
}

/** The same rule as an HTML `pattern`, for the browser's own check and the no-JavaScript form. */
export const US_PHONE_PATTERN = "\\s*(\\+?1[\\s.\\-]?)?\\(?[2-9][0-9]{2}\\)?[\\s.\\-]?[0-9]{3}[\\s.\\-]?[0-9]{4}\\s*";
