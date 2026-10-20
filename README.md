# Quran Offline 📖

Al-Qur'an lengkap **114 surah / 6.236 ayat** dengan terjemahan Bahasa Indonesia —
**web-based, berjalan penuh offline** sebagai PWA. Tanpa framework, tanpa build step,
tanpa dependensi runtime.

## Fitur

- 📖 Teks Uthmani (Quran Uthmani Hafs) + terjemahan **Kemenag RI** & **Tafsir Assaibiq** (bisa pilih / tampilkan keduanya)
- 🕌 **Mode baca** — teks Arab saja tanpa terjemahan, gaya mushaf; atau per-ayat dengan terjemahan seperti biasa
- 🔡 Pilihan font Arab: **Amiri Quran** (gaya mushaf) atau **Sakkal Majalla** (Naskah klasik) — font dibundel lokal; logo & ikon aplikasi memakai tulisan **القرآن** gaya Kufi (Reem Kufi, OFL)
- 🔎 Pencarian instan ke seluruh ayat (Arab, Latin, arti) + nama surah, dengan highlight
- ⏯ Audio per-ayat & per-surah (Alafasy, Al-Husary, Maher) — **di-cache otomatis**, setelah diputar sekali bisa offline
- 🔖 Penanda ayat & posisi baca terakhir — tersimpan di `localStorage`, tetap ada tanpa internet
- 🌗 Tema terang/gelap otomatis, pengatur ukuran font Arab
- 📲 Installable (PWA): "Tambah ke Layar Utama" → aplikasi mandiri offline penuh
- ✂️ Salin ayat / seluruh surah ke clipboard

## Menjalankan

```sh
./serve.sh          # → http://localhost:8080
```

Butuh server lokal karena service worker & `fetch` tidak jalan dari `file://`.
Alternatif: `python3 -m http.server`, `npx serve`, atau deploy ke hosting statis
(GitHub Pages / Netlify / Cloudflare Pages) — cukup upload seluruh folder ini.

Setelah terbuka, tekan **Pasang aplikasi** (Chrome/Edge) atau bagikan →
*Tambah ke Layar Utama* (iOS Safari). Setelah terpasang, **semua fitur teks,
pencarian, penanda, dan audio yang pernah diputar berjalan tanpa internet**.

## Struktur

```
index.html               # shell SPA
app.js                   # logika aplikasi (router hash, audio, cari, tanda)
styles.css               # tema & tipografi (+ @font-face lokal)
sw.js                    # service worker: precache shell+data, cache audio
manifest.webmanifest     # PWA manifest
data/quran-data.js       # 3.4 MB: teks + 2 terjemahan + metadata 114 surah
fonts/                   # Amiri, Amiri Quran, Sakkal Majalla (woff2)
icons/                   # ikon aplikasi
scripts/build-data.mjs   # pembangkit data/quran-data.js (butuh internet sekali)
```

## Membangun ulang data

```sh
node scripts/build-data.mjs
```

Sumber: [fawazahmed0/quran-api](https://github.com/fawazahmed0/quran-api)
(teks Uthmani + terjemahan) dan [quran.com API v4](https://quran.com/developer)
(metadata surah). Hasil diverifikasi otomatis: 6.236 ayat, 114 surah, tidak ada teks kosong.
Cache unduhan ada di `scripts/.cache/` (di-gitignore).

Audio: [cdn.islamic.network](https://islamic.network) (128 kbps).

## Catatan

- Sakkal Majalla adalah font bawaan Microsoft; file woff2 hasil konversi ikut dibundel untuk pemakaian pribadi/offline. Jika font sudah terpasang di sistem, aplikasi memakainya langsung (`local()`).
- Repo ini statis — bisa di-serve dari direktori apa pun, tidak mengasumsikan domain.
