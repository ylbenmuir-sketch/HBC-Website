/**
 * One JSON-LD <script> tag. Every structured-data block on the site renders
 * through this so the serialization is identical everywhere and no page has
 * to repeat the dangerouslySetInnerHTML dance. Builders live in lib/schema.ts.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
