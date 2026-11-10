# Struktur Indotopia

**1. Konsep inti**
- Tycoon pabrik 2D di browser, tampilan atas berbasis ubin, single-player tanpa server
- Bangun rantai produksi di lahan sendiri, olah bahan naik tingkat, jual ke toko, hasilnya buat upgrade dan perluas

**2. Alur main**
- Modal awal $50 + kapak, tebang pohon dan panen bahan buat bahan dasar
- Bangun mesin pertama, produksi jalan otomatis, antar hasil ke toko
- Uang hasil jual dipakai riset mesin tingkat berikutnya, upgrade alat, perluas lahan
- Ujung jalur v1: Motor dari Blacksmith

**3. Dunia**
- Satu lahan pribadi buat pabrik dan sumber daya, satu kota berisi empat toko tetap
- Tema ikut game asli: kayu dan besi

**4. Sistem inti**
- Peta ubin, bangunan ditaruh di petak, conveyor menyambung mesin ke Storage
- Mesin memilih satu resep, bahan masuk, proses pakai waktu, hasil keluar
- Firelog jadi bahan bakar Smelter; Oven membakar Firelog sebagai bahan resep
- Batas item aktif 150: produksi berhenti saat batas tercapai; Storage menaikkannya

**5. Rantai produksi**
- Kayu: Sawhorse, lalu Carpenter (Wood Frame, Table, Bench, Window)
- Bata dan kaca: Oven berbahan Firelog + Clay/Sand
- Logam: Smelter melebur bijih jadi ingot (besi, tembaga, timah, perunggu)
- Komponen: Blacksmith (Nails, Coil, Gear, Iron Beam, Iron Frame, Drill Head, Motor)
- Pendukung: Log Splitter (Firelog massal), Storage, Conveyor

**6. Ekonomi**
- Jual hanya ke toko khusus per jenis barang, harga tetap dari sistem
- Exchange menjual bahan dengan harga premium sebagai jalan pintas
- Uang menempel di pemain, tidak ada pasar antar pemain (single-player)

**7. Teknis**
- HTML5 Canvas + JavaScript polos, tanpa framework, tanpa build step
- Pola conveyor jalur menyambung ditulis sendiri (terinspirasi pola umum, tanpa menyalin kode berlisensi GPL)
- Aset gambar prosedural di Canvas (paket Kenney Tiny tidak bisa diunduh dari lingkungan build: kenney.nl menjawab 403; lisensinya CC0 bila nanti dipakai)
- Simpanan otomatis di localStorage browser

**8. Keputusan yang dikunci di PRD**
- Unlock mesin memakai bayar riset
- Lingkup v1 sampai Blacksmith dan Motor; sisanya tahap berikutnya
- Karakter pemain digambar sederhana, jalan 4 arah
