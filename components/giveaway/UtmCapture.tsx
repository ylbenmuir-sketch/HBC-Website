"use client";

import { useEffect } from "react";
import { UTM_FIELDS, UTM_STORAGE_KEY, attributionFrom } from "@/lib/giveaway/channel";
import { giveawayFormType, trackEvent } from "@/lib/analytics";

/**
 * First-touch attribution on /10years (fix list rev 2, P1-6). The first
 * visit in a tab session that carries UTM tags or ?ref= is kept in
 * sessionStorage; later visits (or a reload without the tags) still post
 * it. The server already filled the hidden fields from this request's own
 * query, so the form works without JavaScript; this only replaces them
 * with the stored first touch. On submit it reports the channel and which
 * form it was (the reminder or the entry) — nothing else — to GA4.
 */
export default function UtmCapture({ formId }: { formId: string }) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const params = new URLSearchParams(window.location.search);
    const here: Record<string, string> = {};
    for (const f of [...UTM_FIELDS, "ref"] as const) {
      const v = params.get(f);
      if (v) here[f] = v;
    }
    let first: Record<string, string> | null = null;
    try {
      const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
      first = raw ? (JSON.parse(raw) as Record<string, string>) : null;
      if (!first && Object.keys(here).length) {
        sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(here));
        first = here;
      }
    } catch {
      first = Object.keys(here).length ? here : null;
    }
    if (first) {
      for (const f of [...UTM_FIELDS, "ref"] as const) {
        const input = form.elements.namedItem(f) as HTMLInputElement | null;
        if (input && first[f] && (f !== "ref" || !input.value)) input.value = first[f];
      }
    }
    const onSubmit = () => {
      const get = (f: string) => (form.elements.namedItem(f) as HTMLInputElement | null)?.value ?? "";
      const a = attributionFrom({ utm_source: get("utm_source"), utm_medium: get("utm_medium"), utm_campaign: get("utm_campaign"), utm_content: get("utm_content"), ref: get("ref") });
      trackEvent({ name: "giveaway_signup_submit", params: { channel: a.channel, form_type: giveawayFormType(form.dataset.entryForm) } });
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [formId]);
  return null;
}
