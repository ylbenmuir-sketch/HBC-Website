"use client";

import { useState } from "react";
import { US_PHONE_PATTERN, normalizeUsPhone } from "@/lib/giveaway/phone";

/**
 * The entry form's phone (Ben, 2026-11-10): required, a US number in any
 * common spelling. The browser's own check (required + pattern) holds the
 * form without JavaScript; with it, a number that doesn't read as one gets
 * a plain line under the field on leaving it or on submit. The server
 * checks again (lib/giveaway/people.ts) and stores E.164.
 */
export default function PhoneField({ label, help, invalid, defaultValue = "", initialError = false }: { label: string; help: string; invalid: string; defaultValue?: string; initialError?: boolean }) {
  const [error, setError] = useState(initialError);
  return (
    <div className="ty-field-phone">
      <label htmlFor="phone">{label}</label>
      <input
        id="phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        maxLength={40}
        pattern={US_PHONE_PATTERN}
        title={invalid}
        defaultValue={defaultValue}
        aria-describedby="phone-note"
        aria-invalid={error || undefined}
        onBlur={(e) => setError(e.currentTarget.value.trim() !== "" && !normalizeUsPhone(e.currentTarget.value))}
        onInvalid={() => setError(true)}
        onInput={(e) => {
          if (error && normalizeUsPhone(e.currentTarget.value)) setError(false);
        }}
      />
      {error ? (
        <p id="phone-note" className="ty-field-note ty-field-error" role="alert" data-phone-error>
          {invalid}
        </p>
      ) : (
        <p id="phone-note" className="ty-field-note">
          {help}
        </p>
      )}
    </div>
  );
}
