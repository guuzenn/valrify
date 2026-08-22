"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserApi, notifyNotificationsChanged } from "../../lib/browser-api";
import { Footer, Header } from "../components/SiteChrome";

type NotificationItem = {
  id: number;
  type: string;
  message: string;
  actor: { displayName: string; username: string | null; role: string };
  href: string;
  readAt: string | null;
  createdAt: string;
};

type Inbox = { unreadCount: number; items: NotificationItem[] };

function formatTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "V";
}

export default function NotificationsPage() {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    browserApi<Inbox>("/notifications")
      .then(setInbox)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Notifikasi gagal dimuat."));
  }, []);

  async function markRead(item: NotificationItem) {
    if (item.readAt) return;
    try {
      await browserApi(`/notifications/${item.id}/read`, { method: "POST" });
      setInbox((current) => current ? {
        unreadCount: Math.max(0, current.unreadCount - 1),
        items: current.items.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry),
      } : current);
      notifyNotificationsChanged();
    } catch {
      // Link tujuan tetap bisa dibuka walau status baca gagal disimpan.
    }
  }

  async function markAllRead() {
    if (!inbox?.unreadCount || markingAll) return;
    setMarkingAll(true);
    try {
      await browserApi("/notifications/read-all", { method: "POST" });
      const now = new Date().toISOString();
      setInbox({ unreadCount: 0, items: inbox.items.map((item) => ({ ...item, readAt: item.readAt ?? now })) });
      notifyNotificationsChanged();
    } finally {
      setMarkingAll(false);
    }
  }

  return <>
    <Header compact backHref="/community" backLabel="Kembali ke Community" />
    <main className="page shell notifications-page">
      <section className="notifications-hero">
        <div><span>AKTIVITAS AKUN</span><h1>NOTIFIKASI</h1><p>Like dan balasan terbaru dari anggota Community Valrify.</p></div>
        <div className="notifications-summary"><strong>{inbox?.unreadCount ?? 0}</strong><span>BELUM DIBACA</span><button type="button" onClick={markAllRead} disabled={!inbox?.unreadCount || markingAll}>{markingAll ? "MENYIMPAN..." : "TANDAI SEMUA DIBACA"}</button></div>
      </section>

      {error && <section className="notifications-state"><strong>Notifikasi belum bisa dibuka.</strong><p>{error}</p><Link href="/login">MASUK KE AKUN</Link></section>}
      {!error && !inbox && <div className="notifications-loading"><span /> MEMUAT NOTIFIKASI...</div>}
      {inbox && inbox.items.length === 0 && <section className="notifications-state"><strong>Belum ada notifikasi.</strong><p>Kalau ada yang menyukai atau membalas kontenmu, aktivitasnya akan muncul di sini.</p><Link href="/community">BUKA COMMUNITY</Link></section>}
      {inbox && inbox.items.length > 0 && <section className="notifications-list" aria-label="Daftar notifikasi">
        {inbox.items.map((item) => <article key={item.id} className={item.readAt ? "notification-item" : "notification-item unread"}>
          <Link className="notification-avatar" href={item.actor.username ? `/u/${item.actor.username}` : "/community"} aria-label={`Profil ${item.actor.displayName}`}>{initials(item.actor.displayName)}</Link>
          <Link className="notification-content" href={item.href} onClick={() => void markRead(item)}>
            <span className="notification-copy"><strong>{item.actor.username ? `@${item.actor.username}` : item.actor.displayName}</strong> {item.message}</span>
            <time dateTime={item.createdAt}>{formatTime(item.createdAt)} WIB</time>
          </Link>
          {!item.readAt && <span className="notification-unread-dot" aria-label="Belum dibaca" />}
        </article>)}
      </section>}
    </main>
    <Footer />
  </>;
}
