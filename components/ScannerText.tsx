/**
 * A constant string, written into the HTML exactly as a person reads it.
 *
 * React escapes every `&` in text as `&amp;`. That is correct HTML, and any
 * parser decodes it — but the carriers' compliance scanners (A2P 10DLC; see
 * lib/sms-consent.ts) may match the required phrases against the raw bytes of
 * the page, and "Msg & data rates may apply" is one of them. Encoded, that
 * phrase is not in the bytes at all.
 *
 * So this writes a bare `&` wherever one is followed by whitespace — valid
 * HTML5, which only reads `&` as the start of a character reference when a
 * name or `#` follows — and escapes every other `&`, `<` and `>` as usual.
 * The text is one node, too: no `<!-- -->` separators inside it.
 *
 * For our own constants only (lib/sms-consent.ts). Never pass it anything a
 * visitor typed.
 */
export default function ScannerText({ text }: { text: string }) {
  const html = text
    .replace(/&(?!\s)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
