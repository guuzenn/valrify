"use client";

import Form from "next/form";
import Link from "next/link";
import { useState } from "react";
import { Select } from "./Select";
import { ArrowIcon } from "./ArrowIcon";

export function ReportDirectoryFilters({ query, sort }: { query: string; sort: "published" | "incident" }) {
  const [order, setOrder] = useState<string>(sort);
  return <Form action="/laporan" className="report-directory-search">
    <label htmlFor="report-query">Cari laporan</label>
    <div><input id="report-query" name="q" defaultValue={query} maxLength={100} placeholder="Cari nama atau judul laporan" type="search"/></div>
    <div className="report-directory-order"><div><label>Urutkan berdasarkan</label><Select label="Urutkan berdasarkan" value={order} onValueChange={setOrder}><option value="published">Terbaru dipublikasikan</option><option value="incident">Tanggal kejadian terbaru</option></Select><input type="hidden" name="sort" value={order}/></div><button className="tactical-button" type="submit">Terapkan <ArrowIcon/></button></div>
    <p>{sort === "incident" ? "Diurutkan dari kejadian terbaru. Laporan tanpa tanggal kejadian ada di akhir." : "Diurutkan dari laporan terbaru dipublikasikan."}</p>
    {query && <p>Hasil untuk <strong>“{query}”</strong> · <Link href={sort === "incident" ? "/laporan?sort=incident" : "/laporan"}>Hapus pencarian</Link></p>}
  </Form>;
}
