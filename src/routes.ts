import { OruError } from "./ast.js";

export interface PageRoute {
  source: string;
  route: string;
  output: string;
}

/** Convert project-relative .oru page paths into stable browser routes. */
export function routeForPage(sourcePath: string): PageRoute {
  const normalized = sourcePath.replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)) {
    throw new OruError('Page path must be project-relative: "' + sourcePath + '".');
  }
  const segments = normalized.split("/");
  if (segments.some(segment => !segment || segment === "." || segment === "..")) {
    throw new OruError('Page path contains an invalid directory segment: "' + sourcePath + '".');
  }
  if (!normalized.endsWith(".oru")) throw new OruError('Page source must use the .oru extension: "' + sourcePath + '".');
  const stem = normalized.slice(0, -4);
  if (!stem.split("/").every(segment => /^[A-Za-z0-9_-]+$/.test(segment))) {
    throw new OruError('Page path may contain only letters, numbers, hyphens, and underscores: "' + sourcePath + '".');
  }
  const route = stem === "index" ? "/" : "/" + stem;
  const output = stem === "index" ? "index.html" : stem + "/index.html";
  return { source: normalized, route, output };
}

/** Validate all page paths and return a route lookup table. */
export function buildRouteTable(sourcePaths: string[]): Map<string, PageRoute> {
  const routes = new Map<string, PageRoute>();
  const sources = new Set<string>();
  for (const sourcePath of sourcePaths) {
    const page = routeForPage(sourcePath);
    if (sources.has(page.source)) throw new OruError('Page file "' + page.source + '" was discovered more than once.');
    sources.add(page.source);
    if (routes.has(page.route)) throw new OruError('More than one page resolves to route "' + page.route + '".');
    routes.set(page.route, page);
  }
  if (!routes.has("/")) throw new OruError('Project is missing its required "index.oru" entry page.');
  return routes;
}
