import JsonLd from "./JsonLd";
import {
  type Crumb,
  type WebPageInput,
  breadcrumbSchema,
  pageGraph,
  videoObjectSchema,
  videoRef,
  webPageSchema,
} from "@/lib/schema";
import type { Video } from "@/lib/videos";
import { getStaticPage, renderedTitle } from "@/lib/pages";
import { SITE_NAME } from "@/lib/site-config";

type Props = {
  /** The route. For a static page this is also the lib/pages.ts key. */
  path: string;
  /**
   * The page node's fields. Omit on a static page — they come from its
   * lib/pages.ts record — and pass them on a dynamic route from its own
   * record (concern, location, article).
   */
  page?: Omit<WebPageInput, "path" | "breadcrumb">;
  /** The same array the page hands to <Breadcrumbs>, if it renders one. */
  breadcrumb?: readonly Crumb[];
  /** Overrides for a static page whose subject is not the Organization. */
  about?: object;
  mainEntity?: object | object[];
  /** Further nodes: LocalBusiness, Article, Service, Person … */
  nodes?: object[];
  /**
   * A video the page embeds (components/VideoEmbed.tsx). Adds its
   * VideoObject node and points the page node's `video` at it, so the two
   * are built from one record and cannot name different videos.
   */
  video?: Video;
};

/**
 * The one JSON-LD block on a page: Organization + WebSite (always), the
 * typed WebPage node, the BreadcrumbList when the page shows a crumb, and
 * whatever entity nodes the page adds. Rendered once per route, by the
 * page — never by the layout or a shared component — so every route has
 * exactly one graph, which scripts/check-schema.mjs asserts.
 */
export default function PageSchema({
  path,
  page,
  breadcrumb,
  about,
  mainEntity,
  nodes = [],
  video,
}: Props) {
  const input: WebPageInput = page
    ? { ...page, path, breadcrumb: Boolean(breadcrumb) }
    : fromRegistry(path, Boolean(breadcrumb));
  if (about) input.about = about;
  if (mainEntity) input.mainEntity = mainEntity;
  if (video) input.video = videoRef(path, video);
  const graph = [
    webPageSchema(input),
    ...(breadcrumb ? [breadcrumbSchema(breadcrumb, path)] : []),
    ...(video ? [videoObjectSchema(path, video)] : []),
    ...nodes,
  ];
  return <JsonLd data={pageGraph(graph)} />;
}

function fromRegistry(path: string, breadcrumb: boolean): WebPageInput {
  const record = getStaticPage(path);
  return {
    path,
    type: record.type,
    name: renderedTitle(record, SITE_NAME),
    description: record.description,
    dateModified: record.dateModified,
    breadcrumb,
  };
}
