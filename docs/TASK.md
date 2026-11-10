# Task Indotopia v1

Status: semua task di bawah SELESAI dan teruji (lihat README untuk bukti tes).

**Task 1 — Kerangka dan peta** (fondasi)
- Folder proyek, satu halaman HTML + Canvas, peta ubin lahan dan kota, karakter jalan 4 arah pakai keyboard, kamera mengikuti karakter
- Lolos: game terbuka di browser, karakter bisa keliling lahan dan kota tanpa menembus bangunan

**Task 2 — Data game** (sejajar Task 1)
- Satu file data (data.js) berisi semua item, resep + waktu proses, biaya riset, dan harga toko persis hasil riset dan PRD
- Lolos: skrip validasi Node menyatakan tidak ada resep yang menyebut bahan/hasil di luar daftar item, dan semua mesin punya harga riset

**Task 3 — Panen manual dan inventaris** (sesudah Task 1 + 2)
- Kapak menebang pohon jadi Log, sekop menggali Sand dan Clay, beliung menambang Stone dan bijih; node tumbuh/muncul lagi; inventaris dan tampilan koin
- Lolos: Log, Sand, Clay, Stone, dan Iron Ore bisa dikumpulkan ke inventaris

**Task 4 — Bangun dan riset** (sesudah Task 3)
- Menu bangun menaruh bangunan di petak; mesin terkunci sampai riset dibayar (Carpenter $50, Oven $100, Log Splitter $150 TUNING, Smelter $250 TUNING, Blacksmith $1.000)
- Lolos: mesin terkunci tidak bisa dibangun, koin berkurang persis sejumlah biaya riset

**Task 5 — Mesin produksi dan conveyor** (sesudah Task 4)
- Mesin memilih satu resep, mengambil bahan dari buffer masukan, memproses sesuai waktu resep, mengeluarkan hasil; Smelter membakar Firelog; conveyor memindahkan keluaran mesin ke Storage/inventaris; batas item aktif 150 menghentikan produksi
- Lolos: Log menjadi Plank jalan; Brick keluar 10 dari 3 Firelog + 2 Clay dalam 15 detik; mesin berhenti saat batas item aktif tercapai

**Task 6 — Rantai logam** (sesudah Task 5)
- Smelter melebur bijih (Iron Ingot dari 2 Iron Ore, Bronze dari 4 Copper Ingot + 1 Tin Ingot), Blacksmith membuat Nails, Coil, Gear, Iron Beam, Iron Frame, Drill Head, Motor
- Lolos: dari bijih mentah sampai Motor jadi mengikuti resep riset, diperiksa lewat validasi data

**Task 7 — Kota dan toko** (sesudah Task 6)
- Empat toko membeli hanya daftar barangnya dengan harga PRD; Exchange menjual bahan premium; Tool Shop menjual upgrade alat bertingkat dan membeli Iron Beam, Drill Head, Motor
- Lolos: fungsi harga teruji di Node (jual Log = $7, Iron Beam = $72, Motor = $225)

**Task 8 — Simpanan dan kontrol HP** (sesudah Task 7)
- Simpan otomatis di localStorage (berkala 5 detik, tombol Simpan, dan saat halaman ditutup), muat saat dibuka, tombol Reset ke modal $50; joystick virtual dan tombol aksi buat layar sentuh
- Lolos: kode simpan/muat ada dan state terserialisasi penuh (mesin, sabuk, simpanan uang, inventaris)

**Task 9 — Tes loop penuh** (terakhir)
- Pemeriksaan menyeluruh mengikuti kriteria sukses PRD: node --check lolos, validasi data lolos, server lokal mengembalikan HTTP 200 untuk semua file, smoke test harga lolos
- Lolos: semua tes di README hijau

## Angka TUNING (tidak ada di wiki, usulan yang dikunci di PRD)
- Waktu proses Sawhorse: 5 detik per resep; jalur manual Log menjadi Firelog x3 di Sawhorse
- Biaya riset Log Splitter $150, Smelter $250; semua resep Smelter 15 detik + bahan bakar Firelog x1
- Harga beli Table $45, Bench $40, Window $55 di Toko Carpenter; harga jual Motor $225
- Waktu tumbuh lagi node: pohon 60 dtk, pasir/tanah liat 30 dtk, batu 40 dtk, bijih 45 dtk
- Batas item aktif: dasar 150 (wiki), naik 150 per Storage (penyederhanaan dari sistem housing/storage asli)
- Bangunan gratis sesudah riset terbuka (penyederhanaan; versi asli memakai bahan crafting per bangunan)
