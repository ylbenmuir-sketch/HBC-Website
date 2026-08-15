"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * One footer link column. Desktop: a plain heading + list. Phones (≤760px):
 * the heading becomes a disclosure button so the footer reads as four quiet
 * rows instead of a wall of links. CSS in globals.css keeps the list always
 * visible above 760px regardless of state.
 */
export default function FooterGroup({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className={`fgroup${open ? " open" : ""}`}>
      <h5>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
        >
          {heading}
          <span className="fg-mark" aria-hidden="true">
            +
          </span>
        </button>
      </h5>
      <div className="fg-list" id={id}>
        {children}
      </div>
    </div>
  );
}
