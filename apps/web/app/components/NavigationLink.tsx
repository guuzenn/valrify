"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

// NavigationHistory resets scroll after the destination renders.
export function NavigationLink(props: Omit<ComponentProps<typeof Link>, "onNavigate">) {
  const hash = typeof props.href === "string" ? props.href.includes("#") : Boolean(props.href.hash);
  return <Link {...props} scroll={hash ? props.scroll : false}/>;
}
