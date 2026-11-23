/**
 * Holds the homepage's next images back until the hero photo has been
 * painted (Ben, 2026-11-23).
 *
 * The Trisha poster, the open concern tab's photo and the Amen logo sit
 * within a screen or two of the hero. They are `loading="lazy"`, but a
 * browser starts a lazy image as soon as it is near the viewport — which on
 * a phone meant all three were requested while the hero photo, the page's
 * LCP element, was still arriving, and shared its connection (78 KB against
 * the hero's 19 KB in Lighthouse's mobile run).
 *
 * This inline script runs as the parser passes it, directly after the hero
 * image and before any of those three is parsed. It marks <html>
 * `data-hero="wait"`; globals.css keeps those images `display: none` while
 * it reads "wait", and a lazy image that is not rendered is not fetched.
 * When the hero photo has been painted, the mark becomes "in" and they load
 * as ordinary lazy images. "Painted" is the browser's own report where it
 * gives one (a largest-contentful-paint entry for the hero image), and
 * otherwise the image's load event plus two animation frames and 80 ms.
 * Their boxes are sized without them, so nothing moves.
 *
 * Fail-open in every direction: no JavaScript, no mark, and the page is as
 * it was; an image error or four seconds releases them regardless (a
 * background tab runs no animation frames). The mark is an attribute React
 * does not render, on the element that already carries
 * `suppressHydrationWarning` for the `js` class (app/layout.tsx).
 */
const SCRIPT = `(function(){var d=document.documentElement,i=document.querySelector(".hero-ph img"),r=0;if(!i)return;d.setAttribute("data-hero","wait");function a(){if(r)return;r=1;d.setAttribute("data-hero","in")}function g(){requestAnimationFrame(function(){requestAnimationFrame(function(){setTimeout(a,80)})})}if(i.complete&&i.naturalWidth)g();else{i.addEventListener("load",g);i.addEventListener("error",a)}try{new PerformanceObserver(function(l){l.getEntries().forEach(function(e){if(e.element===i)setTimeout(a,0)})}).observe({type:"largest-contentful-paint",buffered:true})}catch(e){}setTimeout(a,4000)})()`;

export default function AfterHeroGate() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
