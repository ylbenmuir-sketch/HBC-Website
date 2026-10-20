"use client";

import { useState } from "react";

/** The share link in a read-only field, with a copy button beside it. Without JavaScript the field is still selectable. */
export default function CopyLink({ url, label, copy, copied }: { url: string; label: string; copy: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="ty-share">
      <label htmlFor="ty-share-url">{label}</label>
      <div className="ty-share-row">
        <input id="ty-share-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} data-share-url />
        <button
          type="button"
          className="btn btn-primary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setDone(true);
              setTimeout(() => setDone(false), 2000);
            } catch {
              document.getElementById("ty-share-url")?.focus();
            }
          }}
        >
          <span aria-live="polite">{done ? copied : copy}</span>
        </button>
      </div>
    </div>
  );
}
