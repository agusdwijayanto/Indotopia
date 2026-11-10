# PRD Indotopia v1

## Tujuan
- Game tycoon pabrik 2D single-player di browser yang mengikuti sistem Factory Town Tycoon (Roblox), loop produksi, jual, upgrade jalan utuh dari modal awal sampai item puncak v1
- Jadi fondasi yang nanti dimodifikasi menjadi versi sendiri

## Pengguna
- Agus sebagai pemain utama, teman sebagai penguji
- Browser HP dan laptop, tanpa install, tanpa akun

## Ruang lingkup v1
- Dua area: lahan pribadi (pabrik dan sumber daya) dan kota (Toko Carpenter, Blacksmith Industry, Tool Shop, Exchange)
- Sumber daya manual: pohon (Log), gali Sand dan Clay, tambang Stone, Iron Ore, Copper Ore, Tin Ore
- Mesin: Sawhorse, Carpenter, Oven, Log Splitter, Smelter, Blacksmith, Storage, Conveyor
- Unlock mesin pakai bayar riset: Carpenter $50, Oven $100, Log Splitter $150 (TUNING), Smelter $250 (TUNING), Blacksmith $1.000
- Resep Carpenter v1: Wood Frame, Table, Bench, Window
- Puncak v1: Motor dari Blacksmith, harga jual $225 (TUNING, kisaran riset $200-250)
- Karakter jalan 4 arah, membawa barang di inventaris, menjual di konter toko
- Batas item aktif 150, mesin berhenti saat batas tercapai; Storage menaikkan batas
- Simpanan otomatis di localStorage, ada tombol Reset

## Di luar lingkup v1
- Multiplayer dan server, Textiles Machine dan kapas, Mining Drill, Steam Engine dan Bronze Cannon, Bed dan Piano
- Desa gurun, kapal bajak laut, wagon, housing dan patung
- Semua modifikasi versi sendiri (tahap sesudah v1 terbukti jalan)

## Ekonomi v1 (harga jual ke toko, dari riset wiki)
- Toko Carpenter membeli: Log $7, Plank $6, Pillar $12, Wood Frame $28, Table $45 (TUNING), Bench $40 (TUNING), Window $55 (TUNING)
- Blacksmith Industry membeli Firelog $6 dan Iron Ingot $24; menjual Nails $25 per bundel 10
- Tool Shop membeli Iron Beam $72, Drill Head $100, Motor $225 (TUNING); menjual upgrade alat bertingkat
- Exchange menjual bahan dasar premium: Log $12, Plank $10, Pillar $20, Brick $30, Wood Frame $48, Coil $38, Iron Beam $125, Iron Frame $83, Drill Head $180

## Kriteria sukses
- Loop penuh bisa dimainkan: dari $50 dan kapak sampai Motor pertama terjual, tanpa jalan buntu
- Waktu proses mesin dan harga toko persis tabel data game
- Game tetap jalan sesudah browser ditutup dan dibuka lagi, simpanan tidak hilang
- Lancar di browser HP dan laptop
- Kontrol: keyboard di laptop, joystick virtual + tombol aksi di HP
