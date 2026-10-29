"use client";

import { useEffect, useRef } from "react";

export function TaskDialog({ open, onClose, title, children, className = "", dismissOnBackdrop = true }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; className?: string; dismissOnBackdrop?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const backdropPress = useRef(false);
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current!;
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = overflow; trigger?.focus({ preventScroll: true }); };
  }, [open]);
  return <dialog ref={ref} className={`task-dialog ${className}`} aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }} onPointerDown={event => {
    const rect = event.currentTarget.getBoundingClientRect();
    backdropPress.current = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  }} onKeyDown={event => {
    if (event.key !== "Tab") return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')).filter(item => item.getClientRects().length > 0);
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }} onClick={event => {
    const rect = event.currentTarget.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    if (dismissOnBackdrop && backdropPress.current && outside) onClose();
    backdropPress.current = false;
  }}>
    <div className="task-dialog-heading"><h2>{title}</h2><button type="button" aria-label="Tutup dialog" onClick={onClose}>×</button></div>
    {children}
  </dialog>;
}
