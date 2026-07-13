import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";
import { concerns } from "@/lib/concerns";
import { locations } from "@/lib/locations";
import { resources } from "@/lib/resources";
import { team } from "@/lib/team";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    "",
    "/what-we-help-with",
    "/adults",
    "/children-families",
    "/how-lens-works",
    "/first-visit",
    "/about",
    "/about/founder",
    "/about/team",
    "/locations",
    "/stories",
    "/faq",
    "/contact",
    "/resources",
  ];

  const dynamicPaths = [
    ...concerns.map((c) => `/concerns/${c.slug}`),
    ...locations.map((l) => `/locations/${l.slug}`),
    ...team.filter((m) => m.slug).map((m) => `/about/team/${m.slug}`),
    ...resources.map((r) => `/resources/${r.slug}`),
  ];

  return [...staticPaths, ...dynamicPaths].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : path === "/contact" ? 0.9 : 0.7,
  }));
}
