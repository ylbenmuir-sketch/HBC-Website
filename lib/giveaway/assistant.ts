/**
 * Whether the chat assistant is off /10years right now — decided on the
 * server from the giveaway's clock (lib/giveaway/clock.ts), the same clock
 * the page's mode comes from, so a local fake date hides the bar exactly
 * when it switches the page. The route's pages render <AssistantOff>
 * (components/giveaway/AssistantOff.tsx) when this is true.
 */

import { giveawayNow } from "./clock";
import { chatSuppressedOn10Years } from "./config";

export function assistantSuppressedByGiveaway(now: Date = giveawayNow()): boolean {
  return chatSuppressedOn10Years(now);
}
