import { notFound } from "next/navigation";
import { ConfirmationForm } from "../../../components/ConfirmationForm";
import { Footer, Header } from "../../../components/SiteChrome";
import { getEntity } from "../../../../lib/api";

export const dynamic = "force-dynamic";

export default async function ConfirmTransactionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entity = await getEntity(slug);
  if (!entity) notFound();

  return (
    <>
      <Header compact />
      <main className="page shell narrow">
        <p className="eyebrow">// REPUTASI KOMUNITAS</p>
        <h1 className="page-title">TRANSAKSI BERHASIL.</h1>
        <p className="page-intro">
          Konfirmasikan transaksi yang benar-benar selesai dengan {entity.displayName}.
          Setiap kiriman diperiksa sebelum ditampilkan agar reputasi tidak mudah
          dimanipulasi.
        </p>
        <ConfirmationForm
          entityId={entity.id}
          entityName={entity.displayName}
          entitySlug={entity.slug}
        />
      </main>
      <Footer />
    </>
  );
}
