// Minimal Chrome DevTools Protocol driver: launch headless Chrome, drive one
// page target, evaluate JS, capture screenshots. No npm deps — Node 24 has a
// global WebSocket, which is the only thing a CDP client actually needs.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One fast probe of a CDP port. Null when nothing is listening there. */
async function probePort(port, timeoutMs = 500) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function launch({ port = 9333 } = {}) {
  // Preflight: anything already answering on this port is a browser from a
  // previous run that never reached close().
  //
  // This is not a tidiness check. The port is a constant, and the poll below
  // takes the *first* answer it gets — so a stale browser means this run
  // drives a renderer it did not configure and does not own, while the Chrome
  // it actually spawned exits unable to bind. Nothing about that is visible in
  // the output: the sweep reports normally. It also costs real time, because
  // the abandoned instance keeps its renderers resident — an identical
  // 130-combination sweep ran roughly twice as slow with one of these alive.
  //
  // Refusing rather than adopting or killing it: a browser this process did
  // not start may belong to something else, and the remedy is one line.
  const stale = await probePort(port);
  if (stale) {
    throw new Error(
      `headless Chrome is already listening on debugging port ${port}` +
        `\n\n  ${stale.Browser ?? "unknown build"}` +
        `\n\n  Left behind by a run that was killed before it could close. This run` +
        `\n  would attach to it instead of the browser it launches, and report a` +
        `\n  normal-looking sweep driven by a renderer it doesn't own.` +
        `\n\n  Clear it with:` +
        `\n    pkill -f "remote-debugging-port=${port}"\n`
    );
  }

  const profile = mkdtempSync(join(tmpdir(), "cdp-profile-"));
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-background-networking",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--force-color-profile=srgb",
      "--disable-lcd-text",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  // close() kills Chrome on the happy path, and nothing did on any other one.
  // A SIGTERM to this process — a tool timeout, a Ctrl-C, a pkill on the
  // runner — left the browser resident and its profile on disk, and the next
  // run then tripped the preflight above. Registered before the port poll, so
  // a launch that never comes up also cleans up after itself.
  //
  // Everything here is synchronous because an "exit" handler cannot await.
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      proc.kill("SIGKILL");
    } catch {
      /* already gone */
    }
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      /* a profile left in tmp is not worth failing an exit path over */
    }
  };
  process.once("exit", cleanup);
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    // Explicit exit codes: registering a handler replaces Node's default
    // behaviour of dying from the signal, so without these a killed run would
    // clean up and then report success.
    process.once(signal, () => {
      cleanup();
      process.exit(signal === "SIGINT" ? 130 : 143);
    });
  }

  let version = null;
  for (let i = 0; i < 100; i++) {
    version = await probePort(port, 1000);
    if (version) break;
    await sleep(150);
  }
  if (!version) {
    cleanup();
    throw new Error("Chrome did not expose a debugging port");
  }

  const browser = await connect(version.webSocketDebuggerUrl);
  return {
    proc,
    port,
    browser,
    async newPage() {
      const { targetId } = await browser.send("Target.createTarget", {
        url: "about:blank",
      });
      const { sessionId } = await browser.send("Target.attachToTarget", {
        targetId,
        flatten: true,
      });
      return makePage(browser, sessionId, targetId);
    },
    async close() {
      try {
        await browser.send("Browser.close");
      } catch {
        /* already gone */
      }
      browser.ws.close();
      // Through cleanup() rather than proc.kill() directly, so the happy path
      // also removes the profile directory and disarms the exit handler.
      cleanup();
    },
  };
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    const listeners = new Set();

    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== undefined && pending.has(msg.id)) {
        const { resolve: res, reject: rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
        return;
      }
      for (const fn of listeners) fn(msg);
    });
    ws.addEventListener("error", reject);
    ws.addEventListener("open", () =>
      resolve({
        ws,
        onEvent: (fn) => (listeners.add(fn), () => listeners.delete(fn)),
        // Every call is bounded. A page laid out in a 15,000px window is
        // enough to take the renderer down, and a dead renderer answers
        // nothing — without this the run stops on an unsettled await with
        // no output at all, several minutes of work lost and no clue why.
        send(method, params, sessionId, timeoutMs = 180000) {
          const msgId = ++id;
          return new Promise((res, rej) => {
            const timer = setTimeout(() => {
              pending.delete(msgId);
              rej(new Error(`${method} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            pending.set(msgId, {
              resolve: (v) => (clearTimeout(timer), res(v)),
              reject: (e) => (clearTimeout(timer), rej(e)),
            });
            try {
              ws.send(
                JSON.stringify({ id: msgId, method, params: params ?? {}, sessionId })
              );
            } catch (error) {
              clearTimeout(timer);
              pending.delete(msgId);
              rej(error);
            }
          });
        },
      })
    );
  });
}

function makePage(browser, sessionId, targetId) {
  const send = (method, params) => browser.send(method, params, sessionId);

  return {
    sessionId,
    targetId,
    send,

    async init() {
      await send("Page.enable");
      await send("Runtime.enable");
      await send("Network.enable");
    },

    async setViewport(width, height = 900) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width <= 900,
        screenWidth: width,
        screenHeight: height,
      });
    },

    // Navigate and wait for the load event plus a quiet beat for fonts and
    // the reveal observer. Reveals are what make text visible at all, so a
    // screenshot or a rect audit taken before they run measures nothing.
    async goto(url, { settle = 900 } = {}) {
      const loaded = new Promise((resolve) => {
        const off = browser.onEvent((msg) => {
          if (
            msg.sessionId === sessionId &&
            msg.method === "Page.loadEventFired"
          ) {
            off();
            resolve();
          }
        });
        setTimeout(() => {
          off();
          resolve();
        }, 25000);
      });
      await send("Page.navigate", { url });
      await loaded;
      await this.eval("document.fonts ? document.fonts.ready.then(()=>1) : 1", {
        awaitPromise: true,
      });
      // Freeze motion, then reveal. getBoundingClientRect() includes the
      // transform, so an element caught mid-reveal measures somewhere it will
      // never actually be — which showed up as pages that appeared to lay out
      // differently in two windows when all that differed was how far the
      // transition had got. Kill transitions and animations first, then add
      // `in` so the reveal lands instantly rather than over 600ms.
      await this.eval(
        `(() => {
           const s = document.createElement("style");
           s.textContent = "*, *::before, *::after { transition: none !important; animation: none !important; }";
           document.head.appendChild(s);
           document.querySelectorAll(".rv").forEach((e) => e.classList.add("in"));
           return 1;
         })()`
      );
      await sleep(settle);
    },

    async eval(expression, opts = {}) {
      const res = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: opts.awaitPromise ?? false,
      });
      if (res.exceptionDetails) {
        throw new Error(
          res.exceptionDetails.exception?.description ??
            JSON.stringify(res.exceptionDetails)
        );
      }
      return res.result.value;
    },

    async screenshot({ fullPage = true } = {}) {
      const res = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: fullPage,
        optimizeForSpeed: false,
      });
      return Buffer.from(res.data, "base64");
    },

    async close() {
      await browser.send("Target.closeTarget", { targetId });
    },
  };
}
