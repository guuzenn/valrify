"use client";

import { useId, useState } from "react";
import Form from "next/form";
import { useFormStatus } from "react-dom";
import { ArrowIcon } from "./ArrowIcon";
import { SEARCH_QUERY_MAX_LENGTH, SEARCH_QUERY_MIN_LENGTH } from "../search/search-state";
import { getSearchSubmitError } from "../search/search-state";

export function SearchForm({ defaultValue = "", invalid = false }: { defaultValue?: string; invalid?: boolean }) {
  const [error, setError] = useState("");
  const errorId = useId();

  return <Form action="/search" scroll={false} className="shared-search" noValidate onSubmit={(event) => {
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
    <div className="search-panel" id="cek">
      <label htmlFor="search-q">Nomor atau nama akun</label>
      <div className="search-row"><input id="search-q" name="q" defaultValue={defaultValue} required minLength={SEARCH_QUERY_MIN_LENGTH} maxLength={SEARCH_QUERY_MAX_LENGTH} autoComplete="off" placeholder="Ketik data yang ingin dicek" aria-describedby="search-help" aria-invalid={invalid || undefined}/><SearchButton/></div>
      <p id="search-help" className="landing-search-help">Bisa nomor rekening, WhatsApp, atau username.</p>
      <p className="landing-search-note">Belum ada laporan bukan berarti aman.</p>
    {error && <p id={errorId} className="search-form-error" role="alert">{error}</p>}
    </div><SearchProgress/>
  </Form>;
}

function SearchButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>Cek sekarang <ArrowIcon/></button>;
}
function SearchProgress() {
  const { pending } = useFormStatus();
  return pending ? <p className="search-progress" role="status">Mencari profil...</p> : null;
}
