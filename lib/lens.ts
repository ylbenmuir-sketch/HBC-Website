/**
 * What LENS is, and what it is not — the two lists /how-lens-works has
 * always set side by side.
 *
 * Here rather than in that page file because /brain-map now carries the
 * "is not" half too (Oct 2026): a page about the recording has to say what
 * the thing the recording belongs to cannot do, and the one list the site
 * has for that is this one. A second copy typed into the new page is a list
 * that reads five ways within a year. The assistant's mirror of the pair
 * (lib/chat/site-copy.ts, `page:how-lens-works:is-is-not`) reads this file
 * now, so `npm run check:index` holds it to both pages at once.
 *
 * Every line is approved copy; do not tighten it for rhythm.
 */
export const LENS_IS = [
  "Gentle and noninvasive — nothing enters the body",
  "Passive — no concentrating or performing",
  "Brief — sessions fit real, busy lives",
  "Personalized from your check-ins, every visit",
  "A wellness service alongside the care you trust",
] as const;

export const LENS_IS_NOT = [
  "A medical treatment, diagnosis, or cure",
  "Electrical stimulation — it reads far more than it sends",
  "A screen-based training program to master",
  "A guaranteed outcome — every brain responds differently",
  "A replacement for your doctor, therapist, or school supports",
] as const;
