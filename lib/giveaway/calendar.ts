/**
 * "Add to calendar" for the notify-me email (Ben, 2026-11-09): a 15-minute
 * event when entries open, with the /10years link in its description. Pure:
 * the site URL is passed in. The times come from config (SCHEDULE.entriesOpen)
 * and are written in UTC, which every calendar converts to the reader's zone.
 *
 * The email's two buttons point at our own routes (so their clicks show in
 * the request logs by their UTM tags): /10years/calendar/google redirects to
 * Google Calendar's template link; /10years/entries-open.ics is the file
 * Apple Calendar and Outlook open.
 */
import { SCHEDULE } from "./config";
import { EMAILS } from "./copy";

export const CALENDAR_UTM = "utm_source=email&utm_medium=giveaway&utm_campaign=notify_calendar";
export const SHARE_UTM = "utm_source=email&utm_medium=referral&utm_campaign=notify_share";
export const CALENDAR_PATHS = { google: "/10years/calendar/google", ics: "/10years/entries-open.ics" } as const;

export type CalendarEvent = { title: string; start: Date; end: Date; description: string; url: string };

export function entriesOpenEvent(siteUrl: string): CalendarEvent {
  const start = SCHEDULE.entriesOpen.at;
  const url = `${siteUrl}/10years?${CALENDAR_UTM}`;
  return { title: EMAILS.notifyOnList.calendarTitle, start, end: new Date(start.getTime() + 15 * 60_000), description: EMAILS.notifyOnList.calendarDescription(url), url };
}

/** 20261116T000000Z */
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

export function googleCalendarUrl(e: CalendarEvent): string {
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates: `${stamp(e.start)}/${stamp(e.end)}`, details: e.description, ctz: "America/Chicago" });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** RFC 5545 text: escape \ ; , and newlines; fold lines at 75 octets. */
const escText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest, "utf8") > 75) {
    let n = 75;
    while (Buffer.byteLength(rest.slice(0, n), "utf8") > 75) n--;
    out.push(rest.slice(0, n));
    rest = ` ${rest.slice(n)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

export function icsText(e: CalendarEvent, now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Harmonized Brain Centers//10-year giveaway//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:hbc-10years-entries-open-${stamp(e.start)}@harmonizedbraincenterstn.com`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SUMMARY:${escText(e.title)}`,
    `DESCRIPTION:${escText(e.description)}`,
    `URL:${e.url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escText(e.title)}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
