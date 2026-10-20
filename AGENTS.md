# Quran Offline — memori proyek

> File ini dimuat otomatis oleh agen (omp/Claude/Codex/dll.) saat sesi dibuka di folder ini.
> Simpan keputusan, constraint, dan gotcha yang harus diingat lintas sesi. Perbarui, jangan ganti.

## Apa ini
PWA Al-Qur'an **web-based, offline penuh** — vanilla JS, tanpa framework, tanpa build step.
Repo: https://github.com/muhginanjar/quran (branch `main`, remote `origin`). Bahasa UI: Indonesia.

## Aturan main repo
- Static site di root: `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`,
  `data/`, `fonts/`, `icons/`, `scripts/`. Serve: `./serve.sh` (python http.server).
- **Setiap perubahan aset yang di-precache wajib bump `SHELL = 'quran-shell-vN'` di `sw.js`**
  (cache-first; tanpa bump, klien lama tak pernah dapat update). Precache pakai `cache:'reload'`
  agar tidak kena HTTP cache basi.
- Data hanya lewat builder: `node scripts/build-data.mjs` (teks+terjemahan+halaman/juz) dan
  `node scripts/build-mushaf-lines.mjs` (layout baris). Jangan edit `data/*.js` manual.
  Cache unduhan: `scripts/.cache/` (gitignored).
- Verifikasi = jalankan aplikasinya betulan (browser), bukan cuma test.

## Keputusan desain (jangan dibalik tanpa alasan)
- Data di-EMBED sebagai JS (`window.QURAN`, `window.MUSHAF604`), bukan fetch JSON — jalan juga via `file://`.
- **Mode Mushaf: 16 baris/halaman, rata penuh pakai KASHIDA/tatweel (U+0640, boleh ditumpuk)** —
  bukan space-between lebar (spasi lebar pernah diminta user dihapus). Baris penutup paragraf/halaman
  dibiarkan natural seperti cetak. Reflow dari data Madinah; pembagian halaman = KFGQPC 604.
- Basmalah = satu band judul bersama nama surah (permintaan user: "kayak nama bab").
- Font Arab: SATU saja **KFGQPC Uthmanic Script HAFS** (resmi King Fahd; sama dgn Quran Android).
  Amiri hanya utk angka & nama surah UI; Reem Kufi untuk logo القرآن (outline jadi path di ikon).
  Pilihan font/Sakkal Majalla sudah DIHAPUS — jangan dihidupkan lagi kecuali user minta.
- Terjemahan: Kemenag + Assaibiq + "Keduanya" + "Tanpa terjemahan" (mode baca).
- Audio: per-ayat & per-surah dari cdn.islamic.network (hanya slug ini yang hidup:
  `ar.alafasy`, `ar.husary`, `ar.mahermuaiqly`). SW cache audio: fetch **tanpa Range**
  (permintaan media bawa `Range` → 206 → `cache.put` throw → audio mati total; sudah diperbaiki).
- Bookmark/last-read/halaman mushaf = localStorage murni lokal (offline-safe).
- Riset 2026-10: **tabel halaman mushaf 20-baris (Peshawar/Qadim) TIDAK ADA di sumber publik**
  (Tarteel QUL butuh login; Quran Foundation API butuh key; Qurani.ai 610/16L datanya cacat
  off-by-one). Jangan bikin pembagian halaman 20-baris karangan sendiri.

## Sumber data & lisensi
- fawazahmed0/quran-api (Uthmani Hafs + terjemahan), api.quran.com v4 (metadata, halaman/juz),
  zonetecde/mushaf-layout ISC branch `v2` (baris KFGQPC), Reem Kufi OFL, Amiri OFL,
  KFGQPC Hafs = EULA resmi KFGQPC (font resmi, dipakai luas di app open-source).
- Anchor validasi data: 2:253→hal 42, 18:1→293, 78:1→582, 112:1→604, juz 2 mulai 2:142→22.

## Gotcha environment (testing)
- Browser harness: `tab.run` = runtime Bun (BUKAN halaman) — pakai `tab.evaluate` untuk JS halaman.
- `goto` beda-hash TIDAK me-reload dokumen; SW baru butuh 1–2 navigasi penuh sampai aktif.
- `python3 -m http.server` tanpa `Cache-Control` → browser heuristik-cache aset basi;
  saat uji perubahan, disable HTTP cache via CDP `Network.setCacheDisabled` atau query-bust.
- Headless Chromium kadang autoplay audio OK, tapi jangan percaya tanpa cek `A.currentTime`.

## Riwayat singkat
v1 teks+terjemah+audio+search+bookmark → logo Kufi + mode baca → mode mushaf 604 (swipe,
auto-save) → baris persis KFGQPC → user minta: semua 16 baris justify kashida + font KFGQPC saja.
Commit terakhir: lihat `git log --oneline -5`.
