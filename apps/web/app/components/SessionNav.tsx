"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authSessionChangedEvent, browserApi, notificationsChangedEvent } from "../../lib/browser-api";

type SessionUser = { role: string };

export function SessionNav() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    const refreshUnread = () => {
      browserApi<{ unreadCount: number }>("/notifications/unread-count")
        .then((result) => setUnreadCount(result.unreadCount))
        .catch(() => setUnreadCount(0));
    };
    const refreshSession = () => {
      browserApi<{ user: SessionUser }>("/auth/me")
        .then((result) => { setUser(result.user); refreshUnread(); })
        .catch(() => { setUser(null); setUnreadCount(0); });
    };
    refreshSession();
    window.addEventListener(authSessionChangedEvent, refreshSession);
    window.addEventListener(notificationsChangedEvent, refreshUnread);
    return () => {
      window.removeEventListener(authSessionChangedEvent, refreshSession);
      window.removeEventListener(notificationsChangedEvent, refreshUnread);
    };
  }, []);
  const isAdmin=user?.role==="ADMIN"||user?.role==="MODERATOR";
  return <>{isAdmin&&<Link href="/admin/reports">ADMIN</Link>}{user&&<Link href="/notifications" className="nav-notifications" aria-label={unreadCount ? `${unreadCount} notifikasi belum dibaca` : "Notifikasi"}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><span>NOTIF</span>{unreadCount>0&&<b>{unreadCount>99?"99+":unreadCount}</b>}</Link>}<Link href={user?"/account":"/login"} className={user?"nav-session active":"nav-session"}>{user?"AKUN":"MASUK"}</Link></>;
}
