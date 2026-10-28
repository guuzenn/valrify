"use client";

import { useId, useState, type ReactNode } from "react";
import { getSearchSubmitError } from "../search/search-state";

export function SearchForm({ className, children }: { className: string; children: ReactNode }) {
  const [error, setError] = useState("");
  const errorId = useId();

  return <form action="/search" className={className} noValidate onSubmit={(event) => {
    const input = event.currentTarget.querySelector<HTMLInputElement>('input[name="q"]')!;
    const message = getSearchSubmitError(input.value);
    setError(message);
    input.setAttribute("aria-invalid", String(Boolean(message)));
    if (message) {
      event.preventDefault();
      input.setAttribute("aria-errormessage", errorId);
      input.focus();
    } else {
      input.removeAttribute("aria-errormessage");
    }
  }} onInput={(event) => {
    setError("");
    const input = event.currentTarget.querySelector<HTMLInputElement>('input[name="q"]')!;
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-errormessage");
  }}>
    {children}
    {error && <p id={errorId} className="search-form-error" role="alert">{error}</p>}
  </form>;
}
