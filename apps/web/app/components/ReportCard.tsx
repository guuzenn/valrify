import Link from "next/link";
import { formatIndonesianDate } from "@valrify/domain";
import { ArrowIcon } from "./ArrowIcon";
import type { RecentCase } from "../../lib/api";

export function ReportCard({ report }: { report: RecentCase }) {
  return <article className="report-card">
    <div className="report-card-meta"><span>Laporan komunitas</span><span>{report.publicId}</span></div>
    <time dateTime={report.transactionDate ?? undefined}>{report.transactionDate ? `Kejadian ${formatIndonesianDate(report.transactionDate)}` : "Tanggal tidak dicantumkan"}</time>
    <h3>{report.entityName}</h3><p>{report.title}</p>
    <Link href={`/case/${report.publicId}`}>Baca laporan <span className="report-card-arrow"><ArrowIcon/></span></Link>
  </article>;
}
