import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header } from "../components/SiteChrome";

export const metadata: Metadata = {
  title: "Cara Amankan Akun",
  description: "Panduan Admin Valrify untuk mengecek seller, rekber, First Email, data akun, dan proses pencairan dana.",
};

function Policy({ label, title, children, href, tone = "riot" }: { label: string; title: string; children: React.ReactNode; href?: string; tone?: "riot" | "google" | "community" }) {
  return <aside className={`policy-callout ${tone}`}><div><span>{label}</span><strong>{title}</strong><p>{children}</p></div>{href && <a href={href} target="_blank" rel="noreferrer">BACA SUMBER RESMI <span aria-hidden="true">↗</span></a>}</aside>;
}

const flow = ["Cek seller dan rekber", "Transfer ke rekber", "Seller kasih data akun", "Cek dan amankan akun", "Minta dana dicairkan"];
const terms = [
  ["REKBER", "Rekening bersama. Pihak ketiga yang menahan dana sampai pembeli selesai mengecek dan mengamankan akun."],
  ["FE", "First Email. Email pertama yang dipakai saat akun Riot dibuat."],
  ["TAKE FE", "Seller ikut memberikan akses ke First Email."],
  ["NO FE", "Seller tidak memberikan akses ke First Email."],
  ["HOLD", "Dana tetap ditahan rekber sampai waktu atau syarat yang disepakati."],
  ["REFFUL", "Seller memberikan identitas kepada rekber sesuai aturan rekber tersebut."],
  ["HB", "Hackback. Akun diambil kembali oleh pemilik sebelumnya setelah transaksi."],
  ["MFA", "Verifikasi tambahan saat login, misalnya lewat Riot Mobile atau aplikasi authenticator."],
];
const secureSteps = [
  ["GANTI EMAIL RIOT", "Pindahkan email Riot ke email yang dikuasai pembeli."],
  ["LEPAS AKUN YANG MASIH TERTAUT", "Lepas Twitch, Google, Facebook, Xbox, PlayStation, atau akun lain milik seller."],
  ["LEPAS MFA LAMA", "Lepas Riot Mobile atau authenticator yang masih dikuasai seller."],
  ["GANTI PASSWORD", "Gunakan password baru yang kuat dan tidak dipakai di tempat lain."],
  ["LOGIN ULANG", "Masuk lagi memakai email dan password yang baru."],
  ["LOGOUT ALL DEVICES", "Keluarkan semua perangkat lain yang masih login."],
  ["PASANG MFA BARU", "Pasang Riot Mobile atau authenticator yang hanya dikuasai pembeli."],
];

export default function AccountSafetyPage() {
  return <><Header compact backHref="/" backLabel="Kembali ke beranda"/><main className="page shell safety-page">
    <section className="safety-hero">
      <div><p className="eyebrow">// PANDUAN ADMIN VALRIFY</p><h1 className="page-title">DANA MASUK.<br/>CEK AKUN.<br/>BARU CAIR.</h1></div>
      <p>Panduan sederhana untuk mengurangi risiko saat membeli akun. Tidak ada cara yang bisa menjamin akun bebas hackback.</p>
    </section>

    <Policy label="ATURAN RESMI RIOT" title="Jual beli dan transfer akun dilarang oleh Riot." href="https://www.riotgames.com/en/terms-of-service">
      Riot melarang akun dan data login dijual, dibagikan, atau dipindahkan. Halaman ini hanya membantu mengurangi risiko bagi orang yang tetap memilih bertransaksi. Ini bukan jaminan aman dan bukan panduan resmi dari Riot.
    </Policy>

    <nav className="safety-jump" aria-label="Daftar isi panduan"><a href="#istilah">ISTILAH</a><a href="#sebelum-transfer">SEBELUM TRANSFER</a><a href="#cek-akun">CEK AKUN</a><a href="#amankan">AMANKAN</a></nav>

    <section className="safety-section" id="istilah">
      <div className="safety-section-heading"><p className="panel-index">01 / KENALI ISTILAHNYA</p><h2>BIAR NGGAK BINGUNG.</h2><p>Baca bagian ini dulu. Istilah berikut sering dipakai dalam jual beli akun Valorant.</p></div>
      <div className="glossary-grid">{terms.map(([term, meaning]) => <article key={term}><strong>{term}</strong><p>{meaning}</p></article>)}</div>
      <p className="safety-copy"><strong>Take FE tidak otomatis aman. No FE juga tidak otomatis berbahaya.</strong> Keamanan tetap bergantung pada riwayat akun, kejujuran seller, dan hasil pemeriksaan.</p>
    </section>

    <section className="trade-flow" aria-labelledby="flow-title"><div><p className="panel-index">ALUR TRANSAKSI</p><h2 id="flow-title">URUTANNYA BEGINI.</h2></div><ol>{flow.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></li>)}</ol></section>

    <section className="safety-section" id="sebelum-transfer">
      <div className="safety-section-heading"><p className="panel-index">02 / SEBELUM TRANSFER KE REKBER</p><h2>CEK SELLER DAN REKBER.</h2><p>Jangan transfer sebelum seller, rekber, dan nomor yang dipakai sudah kamu pastikan.</p></div>
      <div className="red-flag-list">
        <article><span>01</span><div><h3>CEK RIWAYAT SELLER</h3><p>Cari nama, nomor, rekening, username, dan nama lain yang pernah dipakai seller di Valrify dan grup Facebook.</p><Link href="/search">CEK DI VALRIFY <span aria-hidden="true">↗</span></Link></div></article>
        <article><span>02</span><div><h3>MINTA BUKTI PEMBELIAN</h3><p>Kalau seller mengaku akun itu hasil beli, minta bukti belinya. Jika katanya dari store, hubungi akun resmi store dan tanyakan apakah akun itu benar pernah dijual di sana.</p></div></article>
        <article><span>03</span><div><h3>PASTIKAN REKBERNYA ASLI</h3><p>Kalau kamu tidak kenal rekbernya, tanyakan di grup komunitas. Cocokkan nomor dengan nomor resmi rekber. Jangan percaya nomor alternatif yang hanya dikirim seller.</p></div></article>
        <article><span>04</span><div><h3>TRANSFER KE REKBER</h3><p>Transfer dana ke rekening resmi rekber, bukan ke seller. Setelah dana diterima rekber, seller baru memberikan data akun untuk diperiksa.</p></div></article>
      </div>
    </section>

    <section className="safety-section" id="cek-akun">
      <div className="safety-section-heading"><p className="panel-index">03 / SETELAH SELLER KASIH DATA AKUN</p><h2>LOGIN DAN PERIKSA.</h2><p>Dana masih dipegang rekber. Jangan minta dana dicairkan sebelum semua pemeriksaan selesai.</p></div>
      <div className="safety-check-grid">
        <article><span>01</span><h3>CEK DI DALAM GAME</h3><p>Buka <strong>Collection</strong> lalu cocokkan semua skin dengan penjelasan seller. Jangan hanya percaya screenshot atau rekaman.</p><ul><li>Cek apakah nomor Premier sudah verified. Ini hanya untuk akses Premier, bukan bukti akun aman.</li><li>Opsional: cek rank, saldo VP, dan penalti. Sebagian penalti baru terlihat saat mencoba masuk Competitive.</li></ul></article>
        <article><span>02</span><h3>CEK DI WEB RIOT</h3><p>Masuk ke web resmi Riot untuk melihat region akun. Jangan ganti email atau password dulu sebelum riwayat akun selesai diperiksa.</p><a href="https://account.riotgames.com/" target="_blank" rel="noreferrer">BUKA RIOT ACCOUNT <span aria-hidden="true">↗</span></a></article>
        <article><span>03</span><h3>BUKA MY TICKETS</h3><p>Buka Riot Support lalu pilih <strong>My Tickets</strong>. Cari tiket pemulihan akun dan cocokkan username di tiket dengan username login akun.</p><a href="https://support-valorant.riotgames.com/hc/en-us/requests" target="_blank" rel="noreferrer">BUKA RIOT TICKETS <span aria-hidden="true">↗</span></a></article>
      </div>
      <div className="safety-note-grid">
        <Policy label="CATATAN ADMIN VALRIFY" title="Tiket recovery adalah tanda untuk lebih hati hati." tone="community">Kalau username cocok, tanyakan kapan dan kenapa akun pernah dipulihkan. Recovery berulang bisa menjadi tanda riwayat akun bermasalah. Namun, tiket recovery tidak otomatis berarti seller akan melakukan hackback.</Policy>
        <Policy label="PENTING" title="Tiket lama bisa berasal dari akun lain." tone="community">Jika dua akun pernah memakai email yang sama, tiket akun lama kadang masih ikut terlihat. Cocokkan username, Riot ID, region, dan isi tiketnya.</Policy>
      </div>
      <Policy label="KEBIJAKAN PLAYER SUPPORT" title="Riot hanya membantu pemilik asli akun." href="https://support-valorant.riotgames.com/hc/en-us/articles/45808345695891">Punya email dan password terbaru tidak membuat pembeli menjadi pemilik asli di mata Player Support. Risiko ini tetap ada walaupun data akun sudah diganti.</Policy>
    </section>

    <section className="safety-section" id="fe">
      <div className="safety-section-heading"><p className="panel-index">04 / JIKA FE IKUT DIKASIH</p><h2>CEK FIRST EMAIL.</h2><p>FE adalah email pertama yang dipakai saat akun dibuat. Mengganti email Riot tidak mengubah riwayat FE akun tersebut.</p></div>
      <div className="fe-examples">
        <article><span>TIPE 01</span><h3>YOUR RIOT ACCOUNT HAS BEEN CREATED</h3><p>Sering muncul jika akun dibuat lewat Google atau Facebook. Username tidak selalu terlihat, jadi bukti ini lebih mudah dimanipulasi memakai akun baru.</p></article>
        <article><span>TIPE 02</span><h3>WELCOME TO RIOT GAMES</h3><p>Biasanya ada username. Cocokkan username, alamat pengirim, tanggal, dan isi emailnya.</p></article>
        <article><span>TIPE 03</span><h3>THE FIELDS OF JUSTICE AWAIT</h3><p>Bisa muncul jika akun lebih dulu dipakai untuk League of Legends atau Wild Rift. Biasanya username juga terlihat.</p></article>
      </div>
      <div className="identity-warning"><strong>AWAS HURUF MIRIP.</strong><p>Perhatikan huruf <code>I</code> besar dan <code>l</code> kecil. Bentuknya mirip dan sering dipakai untuk membuat username palsu terlihat sama.</p></div>
      <p className="safety-copy">Pemilik FE mungkin tahu data untuk recovery, seperti tanggal akun dibuat, email pendaftaran, dan bukti top up. Karena itu, bukti FE tetap harus dicocokkan dengan akun dan riwayat seller.</p>
      <Policy label="KEBIJAKAN RESMI GOOGLE" title="Data recovery lama bisa masih dipakai selama 7 hari." href="https://support.google.com/accounts/answer/183723?hl=id" tone="google">Setelah nomor, email recovery, atau cara verifikasi diganti, Google mungkin masih mengirim kode ke data lama selama 7 hari. Nomor baru juga bisa membutuhkan waktu sampai 7 hari untuk aktif. Tujuh hari adalah waktu tunggu, bukan jaminan akun pasti aman.</Policy>
      <div className="fe-security-check"><div><span>JIKA TAKE FE</span><h3>AMANKAN EMAILNYA.</h3><p>Kalau Google masih meminta verifikasi seller, minta seller membantu selagi dana masih dipegang rekber.</p></div><ol><li>Ganti password email.</li><li>Ganti recovery email dan nomor telepon.</li><li>Cek 2FA, passkey, recovery contact, dan aplikasi yang masih terhubung.</li><li>Logout dari perangkat lama.</li><li>Jika perlu, gunakan HOLD sampai data recovery lama tidak muncul lagi.</li></ol></div>
    </section>

    <section className="safety-section handover" id="amankan">
      <div className="safety-section-heading"><p className="panel-index">05 / SETELAH DATA AKUN DIKASIH</p><h2>AMANKAN SEMUANYA.</h2><p>Lakukan langkah ini saat dana masih dipegang rekber. Setelah selesai, baru minta rekber mencairkan dana ke seller.</p></div>
      <ol className="handover-steps">{secureSteps.map(([title, description], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{title}</strong><p>{description}</p></div></li>)}</ol>
      <div><Policy label="KEAMANAN RESMI RIOT" title="Pasang kembali MFA milik pembeli." href="https://support-valorant.riotgames.com/hc/en-us/articles/46410758641811">Setelah MFA seller dilepas, segera pasang MFA baru. Gunakan Riot Mobile atau aplikasi authenticator yang hanya bisa dibuka oleh pembeli.</Policy><div className="release-check"><span>LANGKAH TERAKHIR</span><strong>MINTA REKBER CAIRKAN DANA.</strong><p>Sebelum pencairan, minta rekber mengecek lagi apakah nama dan rekening seller sesuai dengan identitas yang diberikan.</p></div></div>
    </section>

    <section className="safety-finish"><p className="eyebrow">// KALAU ADA YANG ANEH</p><h2>JANGAN LANJUT DULU.</h2><p>Kalau cerita seller berubah, nomor rekber berbeda, data akun tidak sesuai, atau kamu ditekan untuk cepat mencairkan dana, berhenti dan cek ulang.</p><Link className="tactical-button" href="/search">CEK DI VALRIFY ↗</Link></section>
  </main><Footer/></>;
}
