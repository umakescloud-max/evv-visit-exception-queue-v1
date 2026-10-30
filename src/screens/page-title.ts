import { useEffect } from "react";

// index.html still carries the starter's template title, and the builder
// may not edit it. Every screen sets the real document title on mount.
export const PAGE_TITLE = "Visit verification queue — Cedar Bend Home Care concept";

export function usePageTitle(): void {
  useEffect(() => {
    document.title = PAGE_TITLE;
  }, []);
}
