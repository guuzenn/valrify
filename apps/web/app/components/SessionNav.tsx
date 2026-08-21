"use client";

import Link from "next/link";
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
    return () => window.removeEventListener(authSessionChangedEvent, refreshSession);
  }, []);
  const isAdmin=user?.role==="ADMIN"||user?.role==="MODERATOR";
  return <>{isAdmin&&<Link href="/admin/reports">ADMIN</Link>}<Link href="/login" className={user?"nav-session active":"nav-session"}>{user?"AKUN":"MASUK"}</Link></>;
}
