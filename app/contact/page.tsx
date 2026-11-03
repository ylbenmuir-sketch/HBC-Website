import type { Metadata } from "next";
import ContactPageBody from "@/components/ContactPageBody";
import { pageMetadata } from "@/lib/pages";

// Title, description and the page's content date live in lib/pages.ts.
export const metadata: Metadata = pageMetadata("/contact");

/** Static. /contact?from=10years is rewritten to app/contact/10years (next.config.ts). */
export default function ContactPage() {
  return <ContactPageBody />;
}
