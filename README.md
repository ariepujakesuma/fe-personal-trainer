# fe-personal-trainer

Frontend PWA AI Personal Trainer: catat makanan dari foto, olahraga, dan berat badan; lihat sisa kalori, makro, dan summary AI harian.

Stack: Next.js 16 (App Router), React 19, Tailwind CSS 4, SWR, Sonner. Arah desain ada di [`DESIGN.md`](./DESIGN.md).

## Setup

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL = URL be-personal-trainer (dengan atau tanpa /api/v1)
npm install
npm run dev -- -p 3001
```

Backend harus mengizinkan origin frontend lewat `CORS_ORIGIN`.

## Halaman

| Path | Isi |
| --- | --- |
| `/login`, `/register` | Akun (JWT disimpan di localStorage) |
| `/onboarding` | Profil pertama kali, lalu target dihitung |
| `/` | Sisa kalori, makro, daftar makan/olahraga, berat badan. Pakai `?date=YYYY-MM-DD` untuk hari lain |
| `/catat` | Pilih: foto makanan, tulis makanan, olahraga, berat badan |
| `/catat/makanan?mode=photo\|text` | Foto dikompres ke 1024 px di browser, lalu dianalisis AI |
| `/makanan?id=` | Cek dan edit hasil AI, lalu simpan ke catatan |
| `/catat/olahraga` | Isi dari cerita (AI) atau manual |
| `/catat/berat` | Berat badan + riwayat 30 hari |
| `/summary` | Skor, ringkasan, dan 3 rekomendasi untuk besok |
| `/profil` | Target, reminder email, tema (ikuti HP / terang / gelap), data diri, keluar |

## Catatan

- Ikon PWA (`public/icon-*.png`) masih placeholder: kotak oranye bertuliskan "PT". Ganti kalau logonya sudah ada.
- Belum ada service worker, jadi app belum bisa dipakai offline. Install ke home screen sudah bisa lewat manifest.
