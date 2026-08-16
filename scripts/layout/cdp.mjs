// Minimal Chrome DevTools Protocol driver: launch headless Chrome, drive one
// page target, evaluate JS, capture screenshots. No npm deps — Node 24 has a
// global WebSocket, which is the only thing a CDP client actually needs.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ port = 9333 } = {}) {
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

  let version = null;
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      version = await res.json();
      break;
    } catch {
      await sleep(150);
    }
  }
  if (!version) throw new Error("Chrome did not expose a debugging port");

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
      proc.kill();
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
        send(method, params, sessionId) {
          const msgId = ++id;
          return new Promise((res, rej) => {
            pending.set(msgId, { resolve: res, reject: rej });
            ws.send(
              JSON.stringify({ id: msgId, method, params: params ?? {}, sessionId })
            );
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
      // Force every reveal element visible: the audits below measure text, and
      // an un-revealed element is translated and transparent.
      await this.eval(
        "document.querySelectorAll('.rv').forEach(e=>e.classList.add('in')), 1"
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
