import { reportFormImportSchema } from "@valrify/validation";

export const identifierJsonExamples = [
  { label: "Nomor rekening", note: "provider wajib nama bank; relatedName opsional untuk nama pemilik rekening.", value: { type: "BANK_ACCOUNT", value: "0000000000", provider: "BCA", relatedName: "Nama pemilik contoh" } },
  { label: "E-wallet", note: "provider wajib nama e-wallet; relatedName opsional untuk nama pemiliknya.", value: { type: "EWALLET", value: "080000000000", provider: "DANA", relatedName: "Nama pemilik contoh" } },
  { label: "WhatsApp / telepon", note: "Isi nomor yang dipakai pihak terlapor.", value: { type: "PHONE", value: "080000000000" } },
  { label: "Riot", note: "value untuk username Riot; secondaryValue opsional untuk nickname/Riot ID. Jangan sertakan password atau OTP.", value: { type: "RIOT_ID", value: "username_contoh", secondaryValue: "NamaGame#TAG" } },
  { label: "Discord", note: "Isi username Discord.", value: { type: "DISCORD", value: "username_contoh" } },
  { label: "Facebook", note: "value untuk nama Facebook; secondaryValue opsional untuk link profil lengkap.", value: { type: "FACEBOOK_NAME", value: "Nama Facebook contoh", secondaryValue: "https://www.facebook.com/profil.contoh" } },
  { label: "Alias / nama asli", note: "Isi nama lain yang dipakai pihak yang sama.", value: { type: "PERSON_NAME", value: "Nama alias contoh" } },
  { label: "Username lain", note: "provider opsional untuk nama platform.", value: { type: "OTHER", value: "username_contoh", provider: "Telegram" } },
] as const;

export const reportJsonTemplate = JSON.stringify({
  category: "PAYMENT_FRAUD",
  otherCategory: "",
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
