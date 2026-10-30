"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, Suspense, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowIcon } from "./ArrowIcon";

const CanGoBack = createContext(false);
const historyKey = "valrifyHasPreviousPage";
const scrollKey = "valrifyScrollPosition";

function NavigationEvents({ onChange }: { onChange: (value: boolean) => void }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const previous = useRef<string | null>(null);
  const restoring = useRef<string | null>(null);

  useLayoutEffect(() => {
    const push = window.history.pushState.bind(window.history);
    const replace = window.history.replaceState.bind(window.history);
    window.history.pushState = (data, unused, url) => {
      push({ ...data, [historyKey]: true, [scrollKey]: null }, unused, url);
    };
    window.history.replaceState = (data, unused, url) => {
      replace({ ...data, [historyKey]: window.history.state?.[historyKey] === true, [scrollKey]: window.history.state?.[scrollKey] }, unused, url);
    };
    // Save before navigation can shorten the document and clamp its scroll position.
    const saveScroll = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self") || new URL(link.href).origin !== window.location.origin) return;
      replace({ ...window.history.state, [scrollKey]: [window.scrollX, window.scrollY] }, "");
    };
    const restore = () => { restoring.current = window.location.href; };
    window.addEventListener("popstate", restore, true);
    document.addEventListener("click", saveScroll, true);
    return () => {
      window.removeEventListener("popstate", restore, true);
      document.removeEventListener("click", saveScroll, true);
      window.history.pushState = push;
      window.history.replaceState = replace;
    };
  }, []);

  useLayoutEffect(() => {
    const route = `${pathname}?${search}`;
    const browserRoute = `${window.location.pathname}?${new URLSearchParams(window.location.search)}`;
    if (route !== browserRoute) return;
    if (previous.current === route) return;
    const first = previous.current === null;
    onChange(window.history.state?.[historyKey] === true);
    // Next can commit during popstate before our listener runs; classify navigation in the frame.
    const frame = first ? null : window.requestAnimationFrame(() => {
      const isRestoring = restoring.current === window.location.href;
      const position: unknown = window.history.state?.[scrollKey];
      if (isRestoring) {
        if (Array.isArray(position) && position.length === 2 && position.every(value => typeof value === "number" && Number.isFinite(value))) {
          window.scrollTo({ left: position[0], top: position[1], behavior: "instant" });
        }
      } else if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      restoring.current = null;
    });
    previous.current = route;
    return () => { if (frame !== null) window.cancelAnimationFrame(frame); };
  }, [pathname, search, onChange]);

  return null;
}

export function NavigationHistory({ children }: { children: ReactNode }) {
  const [canGoBack, setCanGoBack] = useState(false);
  return <CanGoBack.Provider value={canGoBack}>
    {children}
    <Suspense fallback={null}><NavigationEvents onChange={setCanGoBack}/></Suspense>
  </CanGoBack.Provider>;
}

export function BackLink({ href, label }: { href: string; label: string }) {
  const canGoBack = useContext(CanGoBack);
  const router = useRouter();
  return <Link href={href} onNavigate={event => {
    if (canGoBack) { event.preventDefault(); router.back(); }
  }}><span aria-hidden="true"><ArrowIcon direction="left"/></span> {canGoBack ? "Kembali" : label}</Link>;
}
