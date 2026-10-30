import type { Metadata } from "next";
import { Footer, Header } from "../components/SiteChrome";
import { GuestReportStatus } from "../components/GuestReportStatus";

export const metadata: Metadata = { title: "Status laporan", robots: { index: false, follow: false } };

export default function ReportStatusPage() {
  return <><Header compact/><main className="page shell narrow info-page"><h1 className="page-title">Status laporan</h1><GuestReportStatus/></main><Footer/></>;
}
