import { forwardRef, MouseEvent, useMemo } from "react";
import { Link, LinkProps, useLocation } from "react-router-dom";

/**
 * A drop-in replacement for react-router's <Link> that:
 *
 * 1. Preserves preview-only query parameters (anything starting with `__`,
 *    such as `__lovable_token` and `__lovable_sha`). React Router replaces
 *    the entire search string on navigation, which drops those params and
 *    causes the Lovable preview iframe to fully reload to re-inject them —
 *    visible as a "knipper" (blink). This only affects preview/sandbox
 *    URLs; in production there are no `__` params so this is a no-op.
 *
 * 2. Prevents duplicate history entries (and the resulting re-render)
 *    when the user clicks a link pointing to the page they're already on.
 *    Compares pathname + search (excluding `__` params) + hash. Honors
 *    modifier keys / non-left clicks so middle-click and cmd/ctrl-click
 *    still open in a new tab.
 */

function stripPreviewParams(search: string): string {
  if (!search) return "";
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const keysToDelete: string[] = [];
  params.forEach((_, key) => {
    if (key.startsWith("__")) keysToDelete.push(key);
  });
  keysToDelete.forEach((k) => params.delete(k));
  const out = params.toString();
  return out ? `?${out}` : "";
}

function mergePreviewParams(targetSearch: string, currentSearch: string): string {
  if (!currentSearch) return targetSearch;
  const current = new URLSearchParams(currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch);
  const previewEntries: [string, string][] = [];
  current.forEach((value, key) => {
    if (key.startsWith("__")) previewEntries.push([key, value]);
  });
  if (previewEntries.length === 0) return targetSearch;

  const target = new URLSearchParams(
    targetSearch.startsWith("?") ? targetSearch.slice(1) : targetSearch,
  );
  for (const [key, value] of previewEntries) {
    if (!target.has(key)) target.set(key, value);
  }
  const out = target.toString();
  return out ? `?${out}` : "";
}

export const SafeLink = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, onClick, ...props }, ref) => {
    const location = useLocation();

    const targetPathname =
      typeof to === "string" ? to.split("?")[0].split("#")[0] : to.pathname ?? "";
    const targetSearchRaw =
      typeof to === "string"
        ? (() => {
            const q = to.indexOf("?");
            const h = to.indexOf("#");
            if (q === -1) return "";
            const end = h === -1 ? to.length : h;
            return to.slice(q, end);
          })()
        : to.search ?? "";
    const targetHash =
      typeof to === "string"
        ? (() => {
            const h = to.indexOf("#");
            return h === -1 ? "" : to.slice(h);
          })()
        : to.hash ?? "";

    const mergedTo = useMemo(() => {
      const mergedSearch = mergePreviewParams(targetSearchRaw, location.search);
      if (mergedSearch === targetSearchRaw) return to;
      return {
        pathname: targetPathname,
        search: mergedSearch,
        hash: targetHash,
      };
    }, [to, targetPathname, targetSearchRaw, targetHash, location.search]);

    const isSamePath =
      targetPathname === location.pathname &&
      stripPreviewParams(targetSearchRaw) === stripPreviewParams(location.search) &&
      targetHash === location.hash;

    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      const isModifiedClick =
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey;

      if (!isModifiedClick && isSamePath) {
        e.preventDefault();
      }
      onClick?.(e);
    };

    return <Link ref={ref} to={mergedTo} onClick={handleClick} {...props} />;
  },
);

SafeLink.displayName = "SafeLink";
