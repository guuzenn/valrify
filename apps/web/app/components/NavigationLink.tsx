"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

// Reset menu navigation explicitly: Next may preserve scroll with a sticky header.
export function NavigationLink(props: Omit<ComponentProps<typeof Link>, "onNavigate">) {
  const hash = typeof props.href === "string" ? props.href.includes("#") : Boolean(props.href.hash);
  return <Link {...props} scroll={hash ? props.scroll : false} onNavigate={() => {
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }}/>;
}
