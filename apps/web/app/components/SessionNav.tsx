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
  return <Link href="/login" className={user?"nav-session active":"nav-session"}>{user?(user.role==="ADMIN"||user.role==="MODERATOR"?"ADMIN":"AKUN"):"MASUK"}</Link>;
}
