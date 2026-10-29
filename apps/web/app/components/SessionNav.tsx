"use client";

import { NavigationLink as Link } from "./NavigationLink";
import { useEffect, useState } from "react";
import { authSessionChangedEvent, browserApi } from "../../lib/browser-api";

type SessionUser = { role: string };

export function SessionNav() {
  const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => {
    const refreshSession = () => {
      browserApi<{ user: SessionUser }>("/auth/me")
        .then((result) => setUser(result.user))
        .catch(() => setUser(null));
    };
    refreshSession();
    window.addEventListener(authSessionChangedEvent, refreshSession);
    return () => {
      window.removeEventListener(authSessionChangedEvent, refreshSession);
    };
  }, []);
  const isAdmin=user?.role==="ADMIN"||user?.role==="MODERATOR";
  return <>{isAdmin&&<Link href="/admin">Admin</Link>}<Link href={user?"/account":"/login"} className={user?"nav-session active":"nav-session"}>{user?"Akun saya":"Masuk"}</Link></>;
}
