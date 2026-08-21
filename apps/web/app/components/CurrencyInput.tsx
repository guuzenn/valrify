"use client";

import { useState } from "react";

const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function CurrencyInput({
  name,
  defaultValue = 0,
  max = 1_000_000_000,
  required = false,
}: {
  name: string;
  defaultValue?: number;
  max?: number;
  required?: boolean;
}) {
  const [rawValue, setRawValue] = useState(String(defaultValue));
  const numericValue = rawValue ? Math.min(Number(rawValue), max) : 0;
  const displayValue = rawValue ? formatter.format(numericValue) : "";

  return <>
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={displayValue}
      required={required}
      aria-label="Nominal dalam rupiah"
      onFocus={() => { if (numericValue === 0) setRawValue(""); }}
      onBlur={() => { if (!rawValue) setRawValue("0"); }}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
        setRawValue(digits ? String(Math.min(Number(digits), max)) : "");
      }}
    />
    <input type="hidden" name={name} value={numericValue} />
  </>;
}
