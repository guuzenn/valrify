# Deployment Valrify

Target: Ubuntu 24.04 x64, Node 24, user `deploy`, Nginx dan dua layanan systemd yang sudah ada. Adaptasi pola REI Academy: build sebelum migrasi, health check setelah restart, rollback aplikasi bila gagal. Valrify membangun di GitHub, bukan di VPS 2 GB.

## Alur otomatis

Dashboard admin dan direktori rekber memerlukan migration `0017_gifted_carmella_unuscione`. Migration hanya menambah tabel `middleman_directory` beserta indeksnya; data pengguna, role, laporan, dan MFA tetap dipertahankan. Deploy normal menerapkannya sebelum API baru diaktifkan. Jangan menjalankan reset atau seed untuk fitur ini. Setelah deploy, periksa `/admin`, pencarian pengguna, dan `/rekber`; direktori awal kosong sampai admin menambahkan profil. Smoke test web memeriksa heading serta ajakan rekber, sehingga tidak bergantung pada isi direktori atau API yang hidup saat build.

Push `main` → build shared packages → lint/unit/integration test dengan PostgreSQL CI → build web/API → paket standalone → kirim lewat SSH → verifikasi checksum → backup DB → migrasi → ganti symlink `current` → restart → health check.

Pull request hanya menjalankan pemeriksaan/build. Deploy membutuhkan repository variable `DEPLOY_ENABLED=true`, branch `main`, dan environment `production`. Jangan aktifkan variable sebelum setup VPS selesai. Workflow manual tetap tersedia untuk mencoba ulang. Concurrency di workflow dan `flock` di server mencegah deploy bertumpuk; jangan membatalkan deployment saat migrasi/aktivasi.

Struktur server:

```text
/home/deploy/valrify-deploy/
  shared/api.env       -> /home/deploy/valrify/.env (secret tetap di VPS)
  shared/web.env       hanya konfigurasi web dan slug login
  incoming/<sha>-<run>-<attempt>/
  releases/baseline/    tautan ke API dan web lama
  releases/<sha>-<run>-<attempt>/
    REVISION
    api/               compiled code, runtime dependencies, migration SQL
    web/               Next.js standalone beserta public dan static
  current              -> releases/versi-aktif
```

`.env` tidak masuk artifact. Jangan mengirim private key, environment aplikasi, slug admin, atau recovery code ke chat/commit. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` adalah repository variable publik untuk build, bukan secret backend.

## 1. Periksa kondisi awal di VPS

Jalankan dari sesi root/operator. Jangan lanjut mengganti layanan jika status awal gagal; selesaikan masalah tersebut terlebih dahulu.

```bash
systemctl is-active valrify-api valrify-web
curl -fsS --max-time 5 http://127.0.0.1:3001/api/health
curl -fsS --max-time 5 -o /dev/null http://127.0.0.1:3000/rekber
df -h /home/deploy
```

## 2. Siapkan folder dan baseline (sekali)

Perintah ini sesuai path production yang dikonfirmasi 27 Oktober 2026. Jangan ulangi bila `current` sudah ada. Baseline mempertahankan versi lama, tanpa memindahkan atau menimpa file aplikasi.

```bash
test ! -e /home/deploy/valrify-deploy/current
test -f /home/deploy/valrify/apps/api/dist/main.js
test -f /home/deploy/valrify-web/releases/206cd89/apps/web/server.js
install -d -o deploy -g deploy -m 700 /home/deploy/valrify-deploy
install -d -o deploy -g deploy -m 700 /home/deploy/valrify-deploy/shared /home/deploy/valrify-deploy/incoming /home/deploy/valrify-deploy/releases /home/deploy/valrify-deploy/releases/baseline
sudo -u deploy ln -s /home/deploy/valrify/apps/api /home/deploy/valrify-deploy/releases/baseline/api
sudo -u deploy ln -s /home/deploy/valrify-web/releases/206cd89 /home/deploy/valrify-deploy/releases/baseline/web
sudo -u deploy ln -s /home/deploy/valrify-deploy/releases/baseline /home/deploy/valrify-deploy/current
sudo -u deploy ln -s /home/deploy/valrify/.env /home/deploy/valrify-deploy/shared/api.env
```

Buat konfigurasi web tanpa mencetak nilai slug. Web tidak menerima secret database/MFA/R2:

```bash
sudo -u deploy /usr/bin/node --env-file=/home/deploy/valrify/.env <<'NODE'
const fs = require('node:fs');
const assert = require('node:assert/strict');
const slug = process.env.ADMIN_LOGIN_SLUG;
assert(/^mgmt-[a-z0-9]{16,64}$/.test(slug), 'Admin slug is missing or invalid');
const content = [
  'NODE_ENV=production', 'HOSTNAME=127.0.0.1', 'PORT=3000',
  'API_URL=http://127.0.0.1:3001/api', 'PUBLIC_APP_URL=https://valrify.app',
  `ADMIN_LOGIN_SLUG=${slug}`, '',
].join('\n');
fs.writeFileSync('/home/deploy/valrify-deploy/shared/web.env', content, { mode: 0o600, flag: 'wx' });
console.log('Web runtime configuration created without displaying secrets.');
NODE
```

`api.env` tetap menunjuk file environment yang sudah dipakai production. Jika slug admin diubah kelak, sesuaikan `shared/web.env` juga. Jangan hapus repo `/home/deploy/valrify`: baseline dan environment masih memerlukannya.

## 3. Arahkan systemd ke current (sekali)

Simpan salinan konfigurasi lama dan backup DB terlebih dahulu. Tinjau drop-in yang sudah ada sebelum menambahkan konfigurasi ini.

```bash
install -d -m 700 /root/valrify-before-cd
cp -a /etc/systemd/system/valrify-api.service /etc/systemd/system/valrify-web.service /root/valrify-before-cd/
/usr/local/sbin/valrify-backup
install -d /etc/systemd/system/valrify-api.service.d /etc/systemd/system/valrify-web.service.d
cat > /etc/systemd/system/valrify-api.service.d/cd.conf <<'UNIT'
[Service]
WorkingDirectory=/home/deploy/valrify-deploy/current/api
EnvironmentFile=/home/deploy/valrify-deploy/shared/api.env
ExecStart=
ExecStart=/usr/bin/node /home/deploy/valrify-deploy/current/api/dist/main.js
UNIT
cat > /etc/systemd/system/valrify-web.service.d/cd.conf <<'UNIT'
[Service]
WorkingDirectory=/home/deploy/valrify-deploy/current/web/apps/web
EnvironmentFile=/home/deploy/valrify-deploy/shared/web.env
ExecStart=
ExecStart=/usr/bin/node /home/deploy/valrify-deploy/current/web/apps/web/server.js
UNIT
systemctl daemon-reload
systemctl restart valrify-api.service valrify-web.service
systemctl is-active valrify-api valrify-web
curl -fsS --max-time 5 http://127.0.0.1:3001/api/health
curl -fsS --max-time 5 -o /dev/null http://127.0.0.1:3000/rekber
```

Ini masih menjalankan baseline yang sama, melalui path baru. Jika gagal, hapus hanya kedua file `cd.conf` yang baru dibuat (bukan unit asal), daemon-reload, restart kedua layanan dan periksa kembali. Jangan lanjut mengaktifkan CD sebelum baseline sehat.

## 4. Beri izin dua perintah operator

Deployment berjalan sebagai `deploy`; tidak boleh menjalankan semua perintah root tanpa password. Buat izin khusus untuk backup dan restart dua layanan:

```bash
cat > /root/valrify-cd.sudoers <<'SUDOERS'
deploy ALL=(root) NOPASSWD: /usr/local/sbin/valrify-backup "", /usr/bin/systemctl restart valrify-api.service valrify-web.service
SUDOERS
visudo -cf /root/valrify-cd.sudoers
install -o root -g root -m 440 /root/valrify-cd.sudoers /etc/sudoers.d/valrify-cd
sudo -u deploy sudo -n -l
```

User `deploy` mungkin sudah memiliki sudo dengan password; izin ini hanya menambahkan dua operasi tanpa password. Script backup harus tetap dimiliki root dan tidak writable oleh deploy.

## 5. SSH key khusus GitHub

Di PowerShell laptop, buat key baru di luar repo. Saat prompt passphrase untuk key otomatis ini, kosongkan; simpan private key hanya di GitHub secret dan lokasi privat laptop.

```powershell
ssh-keygen -t ed25519 -C "valrify-github-deploy" -f "$env:USERPROFILE\.ssh\valrify_github_deploy"
Get-Content "$env:USERPROFILE\.ssh\valrify_github_deploy.pub"
```

Tambahkan **public key** satu baris ke `/home/deploy/.ssh/authorized_keys`, dengan prefix `restrict ` sebelum `ssh-ed25519`. `restrict` menutup forwarding, PTY, dan fitur tambahan; SSH command dan SFTP/SCP masih dapat digunakan. Pertahankan key login operator yang sudah ada. Folder `.ssh` harus dimiliki deploy/mode 700 dan authorized_keys mode 600. Tes login dengan key baru dari laptop sebelum lanjut.

Verifikasi host key menggunakan console VPS:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Di laptop, ambil baris known_hosts:

```powershell
ssh-keyscan -t ed25519 ALAMAT_VPS
```

Cocokkan fingerprint hasil scan dengan fingerprint console sebelum menyimpannya. Jangan memakai `StrictHostKeyChecking=no` atau mempercayai hasil scan tanpa pembandingan.

Jika `ssh-keyscan` gagal, ambil public host key langsung dari console VPS melalui `cat /etc/ssh/ssh_host_ed25519_key.pub`. Di laptop simpan baris `ALAMAT_VPS ssh-ed25519 BASE64_PUBLIC_HOST_KEY` ke file known_hosts khusus, periksa dengan `ssh-keygen -lf`, dan cocokkan dengan fingerprint console. Ini bukan private host key. Jalankan perintah PowerShell di prompt `PS ...>`, bukan console Bash VPS; untuk blok dengan validasi gunakan `& { ... }` agar `throw` menghentikan seluruh blok.

Tes key deployment dari laptop menggunakan `ssh -i KEY_PATH -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=KNOWN_HOSTS_PATH -T deploy@ALAMAT_VPS whoami`. Hasil harus langsung `deploy` tanpa prompt. Jika key masih memakai passphrase, kosongkan hanya key khusus ini melalui `ssh-keygen -p -f KEY_PATH` sebelum menyimpannya ke GitHub; workflow tidak memuat SSH agent/passphrase.

## 6. Konfigurasi GitHub lalu aktifkan

Repository Settings → Environments → `production`: batasi deployment ke `main` bila fitur ini tersedia untuk paket/visibility repo. Jangan mewajibkan reviewer bila ingin deployment sepenuhnya otomatis.

Environment secrets:

| Nama | Isi | Fungsi |
| --- | --- | --- |
| `DEPLOY_HOST` | IP/hostname SSH VPS, tanpa `https://` | Tujuan koneksi |
| `DEPLOY_SSH_KEY` | Seluruh private key baru termasuk BEGIN/END | Login sebagai deploy |
| `DEPLOY_KNOWN_HOSTS` | Baris known_hosts yang fingerprint-nya sudah dicocokkan | Memastikan server tujuan benar |

Repository variable `NEXT_PUBLIC_TURNSTILE_SITE_KEY` tetap dipakai untuk build. Tambahkan repository variable `DEPLOY_ENABLED=true` terakhir, setelah setup VPS terverifikasi. Variable ini harus di level repository karena kondisi job dievaluasi sebelum environment job dimuat. Semua secret backend tetap di VPS.

Push workflow/script/manifest ke `main`, lalu amati tab Actions. Jika workflow sudah dipush saat flag masih nonaktif, jalankan manual **CI and production deploy** pada `main` sesudah flag diaktifkan. Deploy berikutnya otomatis saat push `main`. Tidak perlu mengunduh artifact ke laptop.

## Verifikasi dan pemulihan

Editor laporan multipihak memerlukan migration `0015_skinny_retro_girl.sql` dan `0016_lean_ronan.sql`, yang dijalankan otomatis sebelum aktivasi rilis. Laporan lama dipertahankan sebagai satu pihak; bank/e-wallet membedakan identifier berdasarkan provider. Setelah admin menyimpan laporan dengan beberapa pihak, hindari rollback API ke versi sebelum fitur ini: versi lama menganggap seluruh identifier dalam satu laporan milik profil utama. Gunakan perbaikan ke depan atau prosedur pemulihan data yang sesuai untuk menjaga atribusi antarprofil.

Setelah deploy pertama, periksa halaman publik, login admin/TOTP, serta alur laporan/bukti. Workflow mengecek health API, konten halaman rekber, aset CSS dan penolakan admin anonim; ini bukan tes seluruh fitur production.

```bash
readlink -f /home/deploy/valrify-deploy/current
cat /home/deploy/valrify-deploy/current/REVISION
systemctl is-active valrify-api valrify-web
```

Jika gagal sebelum aktivasi, layanan lama tidak direstart. Jika restart/health gagal, script memulihkan symlink lama dan memeriksa ulang layanan; workflow tetap merah walaupun rollback berhasil. Jika rollback gagal, butuh operator. Lihat log layanan secara privat; jangan membagikan log mentah yang mungkin memuat data sensitif.

Rollback aplikasi **tidak membatalkan migrasi database**. Gunakan migrasi expand/contract yang tetap mendukung versi sebelumnya; perubahan destruktif perlu prosedur terencana. Jangan otomatis restore DB production karena bisa menghapus transaksi yang baru masuk.

Ada jeda saat restart; pipeline ini tidak menjanjikan zero downtime. Rilis/incoming disimpan untuk pemeriksaan dan rollback, belum dibersihkan otomatis: pantau `df -h` dan `du -sh /home/deploy/valrify-deploy`. Jangan menghapus rilis aktif, baseline, atau versi rollback yang masih diperlukan. Backup lokal sebelum migrasi mengikuti retensi script backup yang sudah ada; salinan off-server tetap pekerjaan terpisah.

Pengujian script: `bash scripts/deploy/release.test.sh` (fixture tanpa jaringan/DB/systemd nyata; Ubuntu menguji symlink dan lock asli). CI juga menjalankan migrator runtime dua kali terhadap database yang telah dimigrasikan drizzle-kit untuk memeriksa idempotensi dan kompatibilitas journal.

Rujukan: [GitHub deployment controls](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments), [GitHub secure use](https://docs.github.com/en/actions/reference/security/secure-use), [pnpm deploy](https://pnpm.io/cli/deploy), [Drizzle migrations](https://orm.drizzle.team/docs/migrations).
