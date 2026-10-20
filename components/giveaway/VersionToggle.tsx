"use client";

import { usePath } from "./PathProvider";

/**
 * The ladder's two radios (#ty-v-new / #ty-v-cur). The CSS in
 * app/globals.css swaps every .v-new for its .v-cur off `:checked ~ .wrap`,
 * so they must stay ahead of the ladder's .wrap; this only ties them to the
 * visit's choice (PathProvider) both ways: the hero's picker and the
 * form's choice move the toggle, and the toggle moves them.
 */
export default function VersionToggle() {
  const { version, setVersion } = usePath();
  const current = version === "current_client";
  return (
    <>
      <input type="radio" name="ty-version" id="ty-v-new" className="ty-v" checked={!current} onChange={() => setVersion("new_client")} />
      <input type="radio" name="ty-version" id="ty-v-cur" className="ty-v" checked={current} onChange={() => setVersion("current_client")} />
    </>
  );
}
