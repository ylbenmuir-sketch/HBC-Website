"use client";

import { useEffect } from "react";
import { formTokenForSubmit, prefetchFormToken } from "@/lib/form-token-client";

/**
 * The browser half of the /10years spam guard (Ben, 2026-11-09; the server
 * half is app/10years/signup/route.ts, the checks lib/form-guard.ts — the
 * same ones /contact uses). Fetches the page token when the form is on the
 * page; on submit (after the browser's own field checks pass) shows
 * "Sending…", waits out whatever is left of the 3-second minimum, puts the
 * token in the hidden field and posts the form. Nothing visible otherwise.
 */
export default function FormGuard({ formId, sending }: { formId: string; sending: string }) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    prefetchFormToken();
    const button = form.querySelector<HTMLButtonElement>("button[type=submit]");
    const label = button?.textContent ?? "";
    let busy = false;
    const reset = () => {
      busy = false;
      if (button) {
        button.disabled = false;
        button.textContent = label;
      }
    };
    const onSubmit = async (e: SubmitEvent) => {
      e.preventDefault();
      if (busy) return;
      busy = true;
      if (button) {
        button.disabled = true;
        button.textContent = sending;
      }
      const token = await formTokenForSubmit();
      const input = form.querySelector<HTMLInputElement>('input[name="form_token"]');
      if (input) input.value = token ?? "";
      // form.submit() posts without firing another submit event.
      HTMLFormElement.prototype.submit.call(form);
    };
    // Back/forward cache: a page restored after the post shows the button again.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) reset();
    };
    form.addEventListener("submit", onSubmit);
    window.addEventListener("pageshow", onShow);
    return () => {
      form.removeEventListener("submit", onSubmit);
      window.removeEventListener("pageshow", onShow);
    };
  }, [formId, sending]);
  return null;
}
