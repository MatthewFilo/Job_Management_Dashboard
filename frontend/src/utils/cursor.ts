/**
 * Default number of items per page used across the app and enforced on API requests.
 */
export const PAGE_SIZE = 15;

/**
 * Ensure a given relative API path contains the expected page_size parameter.
 * Accepts relative paths (e.g., '/jobs/?after=...') and returns a normalized path
 * with page_size set to PAGE_SIZE while preserving existing query params.
 */
export const ensurePageSize = (rawPath: string) => {
  const url = new URL(rawPath, 'http://dummy');
  url.searchParams.set('page_size', String(PAGE_SIZE));
  return `${url.pathname}${url.search ? `?${url.searchParams.toString()}` : ''}`;
};

/**
 * Normalize absolute or relative cursor URLs into a relative API path scoped to the backend base URL.
 * - baseUrl: the axios client baseURL (e.g., 'http://localhost:8000/api/')
 * - absoluteOrRelative: a server-provided next/previous link (absolute or relative)
 * Returns a relative path with page_size enforced, suitable for the client to request.
 */
export const toRelativeCursorPath = (baseUrl: string, absoluteOrRelative: string) => {
  const base = new URL(baseUrl);
  const abs = new URL(absoluteOrRelative, base);
  const apiBasePath = base.pathname.replace(/\/$/, '');
  let relPath = abs.pathname.startsWith(apiBasePath)
    ? abs.pathname.slice(apiBasePath.length)
    : abs.pathname;
  if (!relPath.startsWith('/')) relPath = '/' + relPath;
  return ensurePageSize(`${relPath}${abs.search}`.replace(/\/+$/, ''));
};
