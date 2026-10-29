import { reportFormImportSchema } from "@valrify/validation";

export const reportJsonTemplate = JSON.stringify({
  category: "PAYMENT_FRAUD",
  entityName: "Nama akun contoh",
  chronology: "Contoh: transaksi telah disepakati, tetapi barang tidak dikirim setelah pembayaran. Ganti dengan cerita kejadian sebenarnya.",
  transactionDate: "",
  evidenceUrl: "",
  identifiers: [
    { type: "BANK_ACCOUNT", value: "0000000000", provider: "BCA", relatedName: "Nama pemilik contoh" },
    { type: "PHONE", value: "080000000000" },
  ],
}, null, 2);

export function parseReportJson(text: string) {
  if (text.length > 30000) throw new Error("JSON terlalu panjang. Maksimal 30.000 karakter.");
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { throw new Error("JSON belum valid. Periksa tanda kutip, koma, dan kurungnya."); }
  const result = reportFormImportSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0]!;
    throw new Error(`Periksa ${issue.path.join(".") || "format JSON"}. Gunakan struktur template, jenis data yang tersedia, dan batas panjang isian. ${issue.code === "custom" ? issue.message : ""}`.trim());
  }
  return result.data;
}
