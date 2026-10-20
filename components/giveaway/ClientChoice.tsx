"use client";

import { useRef, type FormEvent } from "react";
import { usePath } from "./PathProvider";

/**
 * The form's required choice (Ben, 2026-10-20): "I'm new to HBC" |
 * "I'm a current client", two radios named existing_client ("no" | "yes",
 * what lib/giveaway/web.ts reads), neither picked until the visitor — or
 * the hero's picker — chooses. Picking here updates the visit's choice
 * too, so the ladder follows. The browser's required-field prompt is
 * replaced with the page's own sentence.
 */
export default function ClientChoice({ legend, newLabel, currentLabel, error }: { legend: string; newLabel: string; currentLabel: string; error: string }) {
  const { version, setVersion } = usePath();
  const first = useRef<HTMLInputElement>(null);
  const invalid = (e: FormEvent<HTMLInputElement>) => e.currentTarget.setCustomValidity(error);
  const clear = () => {
    for (const el of [first.current, first.current?.form?.elements.namedItem("existing_client")]) {
      if (el instanceof RadioNodeList) for (const r of el) (r as HTMLInputElement).setCustomValidity("");
      else if (el instanceof HTMLInputElement) el.setCustomValidity("");
    }
  };
  return (
    <fieldset className="ty-choice" data-client-choice>
      <legend className="vh">{legend}</legend>
      <label className="ty-choice-opt">
        <input ref={first} type="radio" name="existing_client" value="no" required checked={version === "new_client"} onChange={() => { clear(); setVersion("new_client"); }} onInvalid={invalid} />
        <span>{newLabel}</span>
      </label>
      <label className="ty-choice-opt">
        <input type="radio" name="existing_client" value="yes" required checked={version === "current_client"} onChange={() => { clear(); setVersion("current_client"); }} onInvalid={invalid} />
        <span>{currentLabel}</span>
      </label>
    </fieldset>
  );
}
