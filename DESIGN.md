# DESIGN.md: AI Personal Trainer

Arah desain berdasarkan jawaban Arie (19 Nov 2026): nuansa **sporty & energik**, aksen **oranye**, **toggle terang/gelap** yang default-nya mengikuti setting HP. Detail turunannya di bawah ditulis Claude, lengkap dengan alasan per keputusan (antislop R-31).

## Design Read

Dibaca sebagai PWA mobile untuk orang dewasa yang mencatat makan dan latihan beberapa kali sehari, dengan bahasa visual papan skor olahraga.
Dial: **ENERGY 3 / RHYTHM 2 / MOTION 1**.

- ENERGY 3: angka besar tebal dan satu oranye kuat, sesuai brief "sporty & energik".
- RHYTHM 2: layar aplikasi butuh pola yang konsisten supaya cepat dipindai; variasinya ada di focal number tiap layar.
- MOTION 1: app dibuka puluhan kali sehari, jadi motion dibatasi ke feedback tekan (scale 0.97, 120ms) dan transisi state. Tidak ada animasi masuk halaman.

## Identitas

- **Motif: angka papan skor.** Setiap layar punya satu angka besar memakai Barlow Condensed tebal dengan angka tabular, misalnya sisa kalori atau skor summary. Itu focal point layarnya.
- **Motif: garis lintasan.** Progres makro digambar sebagai bar tebal berujung kotak, seperti lajur lintasan lari, bukan pill membulat.
- **Wordmark:** "AI Personal Trainer" sebagai teks di Barlow Condensed. Logo belum ada (placeholder, R-23).

## Warna

Dua warna inti (ink, paper) ditambah satu aksen. Aksen hanya dipakai di momen kunci: tombol aksi utama, angka sisa kalori, dan bar protein (makro yang paling penting untuk goal recomp).

| Token | Terang | Gelap | Alasan |
| --- | --- | --- | --- |
| `paper` | #F4F2EE | #0E0F12 | Dasar sedikit hangat, supaya tidak klinis seperti putih murni |
| `surface` | #FFFFFF | #17191D | Kartu dan input, memisahkan konten dari dasar |
| `ink` | #15161A | #F2F0EB | Teks utama, kontras 16:1 |
| `muted` | #5C5F66 | #A3A6AD | Label sekunder, kontras di atas 5.7:1 di semua permukaan |
| `line` | #DAD6CF | #2A2D33 | Garis pemisah dan track bar |
| `accent` | #F05312 | #FF6A2B | Oranye. Di terang dibuat lebih gelap supaya kontras sebagai elemen UI di atas paper ≥ 3:1 (3.16) |
| `on-accent` | #15161A | #15161A | Teks di atas oranye (5.1:1 dan 6.3:1) |
| `accent-ink` | #B83A00 | #FF8A55 | Teks berwarna oranye (≥ 5.1:1) |
| `danger` | #B42318 | #FF8A80 | Hanya untuk error dan hapus |

## Tipografi

- **Barlow Condensed 600/700**: angka dan judul. Font condensed muat angka besar di layar HP yang sempit, dan bentuknya mengingatkan pada nomor punggung dan papan skor.
- **Barlow 400/500/600**: teks isi. Satu keluarga dengan display font, jadi tetap padu, dan terbaca baik di ukuran kecil.
- Label memakai sentence case tanpa letter-spacing lebar.

## Bentuk dan ruang

- Radius: kartu 6px, tombol 6px, input 6px. Sudut tegas cocok dengan kesan sporty, dan tidak ada yang berbentuk pill.
- Bayangan: tidak ada. Hierarki dibangun dari kontras warna permukaan dan ukuran angka.
- Spasi: kelipatan 4. Antar-section 24 sampai 32, di dalam kartu 16.

## Mobile

Target tap minimal 44px, input 16px (supaya tidak auto-zoom di iOS), `100dvh`, safe-area inset, tanpa tap highlight, hover hanya di perangkat dengan pointer presisi, `theme-color` mengikuti tema.
