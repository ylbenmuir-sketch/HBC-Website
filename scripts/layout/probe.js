// Injected into the page. Returns JSON.
//
// Phase 9 asked documentElement.scrollWidth. That number answers one question —
// "can the page be scrolled sideways" — and a clipped element answers it "no",
// because `overflow: hidden` is exactly the thing that stops content from
// widening the document. Every finding below is measured from element rects
// against the box that is actually allowed to contain them.
(() => {
  const T = 1.0; // px tolerance for subpixel layout
  const vw = window.innerWidth;
  const findings = [];
  const seen = new Set();

  const push = (f) => {
    const key = `${f.kind}|${f.selector}|${f.detail}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push(f);
  };

  function selectorFor(el) {
    const parts = [];
    let node = el;
    for (let depth = 0; node && node.nodeType === 1 && depth < 4; depth++) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`${part}#${node.id}`);
        break;
      }
      const cls = (node.getAttribute("class") || "")
        .trim()
        .split(/\s+/)
        .filter((c) => c && c !== "in")
        .slice(0, 3);
      if (cls.length) part += "." + cls.join(".");
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  }

  const style = (el) => window.getComputedStyle(el);

  // A closed <details> still lays its answer out — Chrome renders the slotted
  // content with content-visibility: hidden — so every collapsed FAQ answer
  // reports a rect sitting on top of the question below it. Painted or not is
  // the only question that matters here.
  function contentHidden(el) {
    if (typeof el.checkVisibility === "function") {
      if (
        !el.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
          contentVisibilityAuto: true,
        })
      )
        return true;
    }
    const details = el.closest("details:not([open])");
    if (details && details !== el && !el.closest("summary")) return true;
    return false;
  }

  function visible(el, cs) {
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    if (Number(cs.opacity) === 0) return false;
    if (contentHidden(el)) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    return true;
  }

  /**
   * The nearest ancestor that scrolls horizontally on purpose. The concern
   * rail is one: at ≤760px `.concern-grid` becomes an overflow-x: auto,
   * scroll-snapping row, and its cards are *meant* to sit past the right
   * edge. Content inside one is not overflowing the viewport, it is queued
   * up in it.
   */
  function scrollerX(el) {
    let node = el.parentElement;
    while (node && node !== document.body) {
      const v = style(node).overflowX;
      if (v === "auto" || v === "scroll") return node;
      node = node.parentElement;
    }
    return null;
  }

  // Deliberately-offscreen or deliberately-hidden UI: the sticky bar and the
  // nav drawer both park outside the viewport, and skip links sit at -9999px.
  function parked(el) {
    let node = el;
    while (node && node.nodeType === 1) {
      const cs = style(node);
      if (node.getAttribute("aria-hidden") === "true") return true;
      if (cs.position === "fixed" || cs.position === "absolute") {
        const r = node.getBoundingClientRect();
        if (r.right <= 0 || r.left >= vw) return true;
        if (cs.transform && cs.transform !== "none" && /matrix/.test(cs.transform)) {
          // a parked drawer is translated fully out
          if (r.left >= vw - 1 || r.right <= 1) return true;
        }
      }
      if (cs.clipPath && cs.clipPath.includes("inset(50%)")) return true; // sr-only
      node = node.parentElement;
    }
    return false;
  }

  const textOf = (el) => {
    let s = "";
    for (const n of el.childNodes) if (n.nodeType === 3) s += n.nodeValue;
    return s.trim();
  };

  const all = [...document.body.querySelectorAll("*")];

  // --------------------------------------------------------------
  // 1. Anything sticking out past the viewport's right edge.
  // --------------------------------------------------------------
  for (const el of all) {
    const cs = style(el);
    if (!visible(el, cs)) continue;
    if (parked(el)) continue;
    if (scrollerX(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + T) {
      // Only report the outermost offender in a chain — a wide parent drags
      // every child past the edge and one finding covers them all.
      const p = el.parentElement;
      if (p && p !== document.body) {
        const pr = p.getBoundingClientRect();
        if (pr.right > vw + T && !parked(p)) continue;
      }
      push({
        kind: "viewport-overflow",
        selector: selectorFor(el),
        detail: `right edge ${Math.round(r.right)}px, viewport ${vw}px (+${Math.round(r.right - vw)})`,
        text: (el.textContent || "").trim().slice(0, 70),
      });
    }
    if (r.left < -T && !parked(el)) {
      const p = el.parentElement;
      if (p && p !== document.body && p.getBoundingClientRect().left < -T) continue;
      push({
        kind: "viewport-overflow-left",
        selector: selectorFor(el),
        detail: `left edge ${Math.round(r.left)}px`,
        text: (el.textContent || "").trim().slice(0, 70),
      });
    }
  }

  // --------------------------------------------------------------
  // 2. Text clipped, or hanging past the viewport.
  //
  // Measured on the *text*, via Range rects, not on the element that
  // contains it. An element whose overflow is visible has scrollWidth ==
  // clientWidth however far its text hangs out, and its own box stays the
  // width its parent gave it — so an element-box audit misses exactly the
  // case where a fixed-width ancestor is doing the clipping, which is the
  // case documentElement.scrollWidth also misses. Both audits agree the
  // page is clean while a heading is cut in half.
  // --------------------------------------------------------------
  const clips = (v) => v === "hidden" || v === "clip";

  /** The padding box of `node` — what its overflow rule actually clips to. */
  function clipBox(node, ncs) {
    const nr = node.getBoundingClientRect();
    return {
      left: nr.left + parseFloat(ncs.borderLeftWidth || 0),
      right: nr.right - parseFloat(ncs.borderRightWidth || 0),
      top: nr.top + parseFloat(ncs.borderTopWidth || 0),
      bottom: nr.bottom - parseFloat(ncs.borderBottomWidth || 0),
    };
  }

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const content = n.nodeValue.trim();
    if (!content) continue;
    const host = n.parentElement;
    if (!host) continue;
    const hcs = style(host);
    if (!visible(host, hcs) || parked(host)) continue;

    range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter(
      (r) => r.width > 0.5 && r.height > 0.5
    );
    if (!rects.length) continue;

    const label = () => selectorFor(host);

    // 2a. past the right edge of the viewport, unless it sits in something
    //     that scrolls sideways on purpose.
    if (!scrollerX(host)) {
      const worst = rects.reduce((a, b) => (b.right > a.right ? b : a));
      if (worst.right > vw + T) {
        push({
          kind: "text-past-viewport",
          selector: label(),
          detail: `text reaches ${Math.round(worst.right)}px, viewport ${vw}px (+${Math.round(worst.right - vw)})`,
          text: content.slice(0, 70),
        });
      }
    }

    // 2b. cut off by an ancestor that clips.
    let node = host;
    while (node && node !== document.body.parentElement) {
      const ncs = style(node);
      // Stop at the first thing that scrolls on purpose. Past that point the
      // content is reachable — the concern rail's fourth card is off-screen
      // the way the next page of a carousel is off-screen, and body's
      // overflow-x: hidden above it is not clipping anything the visitor
      // cannot get to.
      if (ncs.overflowX === "auto" || ncs.overflowX === "scroll") break;
      const box = clipBox(node, ncs);
      if (clips(ncs.overflowX)) {
        const worst = rects.reduce((a, b) => (b.right > a.right ? b : a));
        const leftmost = rects.reduce((a, b) => (b.left < a.left ? b : a));
        if (worst.right > box.right + T || leftmost.left < box.left - T) {
          push({
            kind: "text-clipped-x",
            selector: label(),
            detail: `text spans ${Math.round(leftmost.left)}–${Math.round(worst.right)}, clipped to ${Math.round(box.left)}–${Math.round(box.right)} by ${selectorFor(node)}`,
            text: content.slice(0, 70),
          });
          break;
        }
      }
      if (clips(ncs.overflowY) && ncs.webkitLineClamp === "none") {
        const lowest = rects.reduce((a, b) => (b.bottom > a.bottom ? b : a));
        const highest = rects.reduce((a, b) => (b.top < a.top ? b : a));
        if (lowest.bottom > box.bottom + T || highest.top < box.top - T) {
          push({
            kind: "text-clipped-y",
            selector: label(),
            detail: `text spans ${Math.round(highest.top)}–${Math.round(lowest.bottom)}, clipped to ${Math.round(box.top)}–${Math.round(box.bottom)} by ${selectorFor(node)}`,
            text: content.slice(0, 70),
          });
          break;
        }
      }
      node = node.parentElement;
    }
  }

  // --------------------------------------------------------------
  // 3. Two pieces of text sitting on top of each other.
  //    Only leaf text in normal flow — a scrim over a photo, a label
  //    inside its own button, and anything positioned on purpose are
  //    all legitimate overlaps.
  // --------------------------------------------------------------
  const leaves = all.filter((el) => {
    const cs = style(el);
    if (!visible(el, cs) || parked(el)) return false;
    if (!textOf(el)) return false;
    if (cs.position !== "static" && cs.position !== "relative") return false;
    return true;
  });

  // Line boxes, not bounding boxes. An inline link that wraps across three
  // lines has a bounding box as wide as the paragraph and as tall as all
  // three, which trivially "overlaps" every other link in the paragraph
  // while nothing is on top of anything.
  const boxes = leaves.map((el) => ({
    el,
    rects: [...el.getClientRects()].filter((r) => r.width > 1 && r.height > 1),
  }));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      let worst = null;
      for (const ra of a.rects) {
        for (const rb of b.rects) {
          const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
          const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
          if (ox <= 2 || oy <= 2) continue;
          const frac =
            (ox * oy) / Math.min(ra.width * ra.height, rb.width * rb.height);
          if (frac < 0.25) continue;
          if (!worst || frac > worst.frac) worst = { ox, oy, frac };
        }
      }
      if (!worst) continue;
      push({
        kind: "text-overlap",
        selector: selectorFor(a.el),
        detail: `overlaps ${selectorFor(b.el)} by ${Math.round(worst.ox)}×${Math.round(worst.oy)}px (${Math.round(worst.frac * 100)}% of the smaller line box)`,
        text: `${textOf(a.el).slice(0, 34)} // ${textOf(b.el).slice(0, 34)}`,
      });
    }
  }

  return JSON.stringify({
    vw,
    docScrollWidth: document.documentElement.scrollWidth,
    findings,
  });
})()
