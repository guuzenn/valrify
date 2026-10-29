"use client";

import { Children, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from "react";

export function DropdownChevron() {
  return <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg>;
}

export function Select({ label, value, onValueChange, children, disabled = false }: { label: string; value: string; onValueChange: (value: string) => void; children: ReactNode; disabled?: boolean }) {
  const options = Children.toArray(children).filter(isValidElement<{ value: string; children: ReactNode; disabled?: boolean }>).map(option => ({ value: String(option.props.value), label: String(option.props.children), disabled: Boolean(option.props.disabled) }));
  const selected = options.findIndex(option => option.value === value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef({ text: "", time: 0 });
  const id = useId();

  useEffect(() => {
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => {
    if (open) root.current?.querySelector<HTMLElement>('[role="option"][data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onValueChange(option.value); setOpen(false); trigger.current?.focus();
  }

  function move(step: number) {
    for (let offset = 1; offset <= options.length; offset++) {
      const next = (active + step * offset + options.length) % options.length;
      if (!options[next]?.disabled) { setActive(next); return; }
    }
  }

  return <div className="styled-select" ref={root}>
    <button ref={trigger} type="button" className="select-trigger" role="combobox" aria-label={label} aria-expanded={open} aria-controls={`${id}-list`} aria-haspopup="listbox" aria-activedescendant={open ? `${id}-${active}` : undefined} disabled={disabled} onBlur={event => { if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node)) setOpen(false); }} onClick={() => { setActive(Math.max(selected, 0)); setOpen(!open); }} onKeyDown={event => {
      if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
      else if (event.key === "Tab") setOpen(false);
      else if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); if (!open) { setActive(Math.max(selected, 0)); setOpen(true); } else move(event.key === "ArrowDown" ? 1 : -1); }
      else if (event.key === "Home" || event.key === "End") { event.preventDefault(); const indexes = options.map((_, index) => index).filter(index => !options[index]!.disabled); setActive((event.key === "Home" ? indexes[0] : indexes.at(-1)) ?? 0); setOpen(true); }
      else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (open) choose(active); else { setActive(Math.max(selected, 0)); setOpen(true); } }
      else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const text = Date.now() - search.current.time < 700 ? search.current.text + event.key : event.key;
        search.current = { text, time: Date.now() };
        const match = options.findIndex(option => !option.disabled && option.label.toLocaleLowerCase("id-ID").startsWith(text.toLocaleLowerCase("id-ID")));
        if (match >= 0) { event.preventDefault(); setActive(match); if (!open) choose(match); }
      }
    }}><span>{options[selected]?.label ?? "Pilih opsi"}</span><DropdownChevron/></button>
    {open && <div className="select-menu" id={`${id}-list`} role="listbox" aria-label={label}>{options.map((option, index) => <div key={option.value} id={`${id}-${index}`} role="option" aria-selected={option.value === value} aria-disabled={option.disabled || undefined} data-active={active === index} onPointerDown={event => event.preventDefault()} onPointerEnter={() => { if (!option.disabled) setActive(index); }} onClick={event => { event.preventDefault(); choose(index); }}><span>{option.label}</span>{option.value === value && <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m4 10 4 4 8-8"/></svg>}</div>)}</div>}
  </div>;
}
