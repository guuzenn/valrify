import { Footer, Header } from "../components/SiteChrome";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <><Header compact/><main className="page shell narrow auth-flow-page"><p className="eyebrow">// KEAMANAN AKUN</p><h1 className="page-title">PASSWORD BARU.</h1><p className="page-intro">Gunakan password unik yang tidak dipakai di akun lain.</p><ResetPasswordForm token={token}/></main><Footer/></>;
}
