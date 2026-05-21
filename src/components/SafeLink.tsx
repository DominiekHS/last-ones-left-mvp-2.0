import { forwardRef, MouseEvent } from "react";
import { Link, LinkProps, useLocation } from "react-router-dom";

/**
 * A drop-in replacement for react-router's <Link> that prevents
 * duplicate history entries (and the resulting "blink" / re-render)
 * when the user clicks a link pointing to the page they're already on.
 *
 * Compares pathname + search + hash. Honors modifier keys / non-left clicks
 * so middle-click and cmd/ctrl-click still open in a new tab.
 */
export const SafeLink = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, onClick, ...props }, ref) => {
    const location = useLocation();

    const targetPath = typeof to === "string" ? to : `${to.pathname ?? ""}${to.search ?? ""}${to.hash ?? ""}`;
    const currentPath = `${location.pathname}${location.search}${location.hash}`;

    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      const isModifiedClick =
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey;

      if (!isModifiedClick && targetPath === currentPath) {
        e.preventDefault();
      }
      onClick?.(e);
    };

    return <Link ref={ref} to={to} onClick={handleClick} {...props} />;
  },
);

SafeLink.displayName = "SafeLink";
