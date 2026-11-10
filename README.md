# Indotopia

Game tycoon pabrik 2D di browser, terinspirasi Factory Town Tycoon (Roblox). Bangun rantai produksi sendiri: tebang kayu, buat mebel, bakar bata, lebur besi, rakit Motor, jual ke toko kota.

**Main langsung:** https://agusdwijayanto.github.io/Indotopia/

## Cara main
- **WASD / panah**: jalan. **E**: interaksi (panen, buka mesin, buka toko). **B**: menu bangun. **R**: putar arah conveyor. Klik petak di sebelah karakter juga bisa.
- Di HP: joystick virtual + tombol Aksi.
- Panen pohon, pasir, tanah liat, dan bijih di lahan kiri. Bangun mesin di lahan, muat bahannya, pilih resep, ambil hasilnya atau sambungkan conveyor ke Storage.
- Jual hasil ke toko di kota kanan: tiap toko hanya membeli barang tertentu dengan harga tetap.
- Uang dipakai buat riset mesin berikutnya, upgrade alat di Tool Shop, atau beli bahan instan di Exchange (lebih mahal).
- Progres tersimpan otomatis di browser. Tombol Reset mengembalikan ke modal awal $50.

## Jalur produksi v1
Kayu (Sawhorse, Carpenter) → bata dan kaca (Oven) → ingot logam (Smelter) → komponen dan Motor (Blacksmith). Batas item aktif 150; bangun Storage buat menaikkannya.

## Teknologi
HTML5 Canvas + JavaScript polos, tanpa framework dan tanpa build step. Gambar digambar prosedural di Canvas (paket aset Kenney Tiny berlisensi CC0 tidak dapat diunduh dari lingkungan build karena servernya menjawab 403).

Dokumen perencanaan ada di folder `docs/` (STRUKTUR, PRD, TASK). Angka bertanda TUNING di dokumen adalah usulan yang tidak ada di wiki sumber riset.
