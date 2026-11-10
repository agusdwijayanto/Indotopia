"use strict";
// Indotopia v1: tycoon pabrik 2D. Semua logika di file ini, data di data.js.

const TILE = 32, MW = 96, MH = 60;
// zona dunia (petak) mengikuti denah game asli, barat ke timur
const PLOT = { x: 2, y: 22, w: 30, h: 22 };  // lahan bangunan pemain
const TOWN = { x: 40, y: 4, w: 24, h: 22 };  // kota: plaza + toko
const MAYOR = { x: 18, y: 20 };              // NPC Mayor di depan area awal
// bangunan pajangan yang tokonya belum aktif: [x, y, lebar, tinggi, pesan]
const SOON = [
  [72, 23, 3, 2, "Toko Desa Gurun — segera hadir"],
  [81, 23, 3, 2, "Toko Desa Gurun — segera hadir"],
  [75, 27, 3, 2, "Toko Desa Gurun — segera hadir"],
  [88, 36, 5, 4, "Toko Kapal Bajak Laut — segera hadir"]
];
// jalan tanah: [x, y, lebar, tinggi]
const ROADS = [
  [16, 14, 75, 2],  // poros utama: area awal - town - desert
  [16, 16, 2, 6],   // dari poros ke pintu plot
  [51, 16, 2, 29],  // cabang town ke bukit tambang
  [8, 44, 2, 12],   // cabang plot ke sungai (jadi jembatan di atas air)
  [78, 16, 2, 26],  // cabang desert: desa gurun - kapal
  [80, 40, 9, 2]    // jalan pantai ke kapal
];
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const key = (x, y) => x + "," + y;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DIR_ARROW = { up: "▲", down: "▼", left: "◀", right: "▶" };
const NODE_COLORS = { stone: "#9a9a9a", iron: "#b5651d", copper: "#e08a4c", tin: "#cfd4d8" };

const ROADSET = new Set();
for (const [rx, ry, rw, rh] of ROADS) for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) ROADSET.add(key(x, y));

function inPlot(x, y) { return x >= PLOT.x && x < PLOT.x + PLOT.w && y >= PLOT.y && y < PLOT.y + PLOT.h; }
function isWaterRaw(x, y) {
  if (y >= 50 && y <= 53 && x <= 40) return true;           // sungai barat
  if (x >= 84 && x <= 87 && y >= 8 && y <= 11) return true; // oasis desert
  if (x >= 93) return true;                                 // laut pantai timur
  return false;
}
// jenis permukaan petak: menentukan warna gambar dan bisa/tidak dilewati
function groundAt(x, y) {
  if (ROADSET.has(key(x, y))) return isWaterRaw(x, y) ? "bridge" : "road";
  if (isWaterRaw(x, y)) return "water";
  if (x >= 68) return "sand"; // desert + pantai
  if (x >= TOWN.x && x < TOWN.x + TOWN.w && y >= TOWN.y && y < TOWN.y + TOWN.h) return "paved";
  if (x >= 41 && x <= 62 && y >= 39 && y <= 58) return "rock"; // bukit tambang
  if (inPlot(x, y)) return "plot";
  if (x < 24 && y < 20) return "forest"; // hutan barat laut
  return "grass";
}
function soonAt(x, y) {
  for (const [sx, sy, w, h, msg] of SOON) if (x >= sx && x < sx + w && y >= sy && y < sy + h) return msg;
  return null;
}

// ---------- state ----------
let S;
function freshState() {
  return {
    money: DATA.startMoney,
    inv: {},
    tools: { axe: 0, shovel: 0, pick: 0 }, // indeks tier
    unlocked: { sawhorse: true, storage: true, conveyor: true },
    machines: [],   // {type,x,y,recipe,in,out,progress}
    belts: {},      // "x,y" -> {dir, item}
    nodes: [],      // {type,x,y,readyAt}
    player: { x: 6 * TILE, y: 30 * TILE, dir: "down" }, // spawn di plot area awal
    beltDir: "right",
    shopTools: {}   // alat yang sudah dibeli pemain di Tool Shop (per tier)
  };
}

// posisi toko tetap: [shopId, x, y, lebar]. Town mengelilingi plaza, Exchange menempel di sisi timur Town
const SHOPS = [
  ["sketchwood", 42, 6, 4],
  ["carpenterShop", 58, 6, 4],
  ["blacksmithShop", 43, 20, 3],
  ["toolShop", 58, 20, 4],
  ["exchange", 64, 12, 3]
];

function seedNodes() {
  const put = (type, x, y) => S.nodes.push({ type, x, y, readyAt: 0 });
  const taken = (x, y) => nodeAt(x, y) || ROADSET.has(key(x, y)) || shopAt(x, y) || soonAt(x, y) || (x === MAYOR.x && y === MAYOR.y);
  // sebaran deterministik per zona; petak jalan/air/plot/kota selalu dilewati
  const scatter = (type, x0, y0, x1, y1, mod, off) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if ((x * 31 + y * 17 + off) % mod) continue;
      const g = groundAt(x, y);
      if (g === "water" || g === "bridge" || g === "road" || g === "plot" || g === "paved") continue;
      if (!taken(x, y)) put(type, x, y);
    }
  };
  scatter("tree", 1, 1, 22, 18, 4, 0);      // hutan barat laut (oak/pine)
  scatter("tree", 69, 2, 91, 57, 29, 3);    // palm jarang di desert
  scatter("tree", 82, 5, 90, 15, 5, 1);     // palm rapat sekitar oasis
  scatter("sand", 2, 47, 38, 49, 4, 2);     // tepi utara sungai
  scatter("sand", 2, 54, 38, 56, 4, 5);     // tepi selatan sungai
  scatter("clay", 2, 47, 38, 56, 5, 7);     // tanah liat di tepi sungai
  scatter("stone", 42, 40, 50, 57, 5, 1);   // bukit tambang: batu
  scatter("iron", 48, 40, 56, 57, 6, 2);    // bukit tambang: besi
  scatter("copper", 54, 40, 61, 57, 6, 4);  // bukit tambang: tembaga
  scatter("tin", 69, 31, 91, 57, 13, 3);    // desert: timah
  scatter("sand", 69, 31, 91, 57, 11, 6);   // desert: pasir
}

// ---------- hitungan stok ----------
function sumObj(o) { let t = 0; for (const k in o) t += o[k]; return t; }
function storageCount() { return S.machines.filter(m => m.type === "storage").length; }
function activeLimit() { return DATA.activeLimitBase + DATA.activeLimitPerStorage * storageCount(); }
function activeCount() {
  let t = sumObj(S.inv);
  for (const m of S.machines) t += sumObj(m.in) + sumObj(m.out);
  for (const k in S.belts) if (S.belts[k].item) t++;
  return t;
}
function addInv(item, n) { S.inv[item] = (S.inv[item] || 0) + n; if (S.inv[item] <= 0) delete S.inv[item]; }

// ---------- peta & tabrakan ----------
function shopAt(x, y) {
  for (const [id, sx, sy, w] of SHOPS) if (x >= sx && x < sx + w && y >= sy && y < sy + 2) return id;
  return null;
}
function nodeAt(x, y) { return S.nodes.find(n => n.x === x && n.y === y); }
function machineAt(x, y) { return S.machines.find(m => m.x === x && m.y === y); }
function blocked(x, y) {
  if (x < 0 || y < 0 || x >= MW || y >= MH) return true;
  if (groundAt(x, y) === "water") return true;
  if (shopAt(x, y) || machineAt(x, y) || soonAt(x, y)) return true;
  if (x === MAYOR.x && y === MAYOR.y) return true;
  const n = nodeAt(x, y);
  if (n && n.readyAt <= performance.now()) return true;
  return false;
}
function frontTile() {
  const d = DIRS[S.player.dir];
  return [Math.floor(S.player.x / TILE) + d[0], Math.floor(S.player.y / TILE) + d[1]];
}

// ---------- panen ----------
// alat lebih tinggi = pukulan lebih sedikit (tier 0: 3, 1: 2, 2+: 1)
let swingAt = 0;
function harvest(node) {
  const now = performance.now();
  if (now - swingAt < 220) return;
  swingAt = now;
  const spec = DATA.nodes[node.type];
  node.hp = (node.hp == null ? Math.max(1, 3 - S.tools[spec.tool]) : node.hp) - 1;
  if (node.hp > 0) { toast("Terus pukul... sisa " + node.hp); return; }
  node.hp = null;
  addInv(spec.out, spec.n);
  node.readyAt = now + spec.respawn * 1000;
  toast("Dapat " + spec.n + " " + spec.out);
  updateHUD();
}

// ---------- mesin & conveyor ----------
function recipeNeeds(r) {
  const need = Object.assign({}, r.in);
  if (r.fuel) need["Firelog"] = (need["Firelog"] || 0) + r.fuel;
  return need;
}
function hasAll(buf, need) { for (const k in need) if ((buf[k] || 0) < need[k]) return false; return true; }

function tickMachines(dt) {
  const limit = activeLimit();
  for (const m of S.machines) {
    const def = DATA.machines[m.type];
    if (!def.recipes.length || m.recipe == null) continue;
    const r = def.recipes[m.recipe];
    const need = recipeNeeds(r);
    if (m.progress <= 0) {
      if (!hasAll(m.in, need)) continue;
      // produksi berhenti saat batas item aktif tercapai
      if (activeCount() >= limit) continue;
      for (const k in need) { m.in[k] -= need[k]; if (!m.in[k]) delete m.in[k]; }
      m.progress = r.time;
    }
    m.progress -= dt;
    if (m.progress <= 0) {
      m.progress = 0;
      for (const k in r.out) m.out[k] = (m.out[k] || 0) + r.out[k];
    }
  }
}

// sabuk memindahkan keluaran mesin ke Storage/inventaris terdekat searah sabuk
let beltTimer = 0;
function tickBelts(dt) {
  beltTimer -= dt;
  if (beltTimer > 0) return;
  beltTimer = 0.45;
  // ambil dari mesin yang bersebelahan dengan sabuk kosong
  for (const k in S.belts) {
    const b = S.belts[k];
    if (b.item) continue;
    const [x, y] = k.split(",").map(Number);
    for (const d of Object.values(DIRS)) {
      const m = machineAt(x - d[0], y - d[1]);
      if (m && m.type !== "storage" && sumObj(m.out) > 0) {
        const item = Object.keys(m.out)[0];
        m.out[item]--; if (!m.out[item]) delete m.out[item];
        b.item = item;
        break;
      }
    }
  }
  // gerakkan item di sabuk
  const moves = [];
  for (const k in S.belts) {
    const b = S.belts[k];
    if (!b.item) continue;
    const [x, y] = k.split(",").map(Number);
    const d = DIRS[b.dir];
    const nx = x + d[0], ny = y + d[1];
    const target = S.belts[key(nx, ny)];
    const m = machineAt(nx, ny);
    if (target && !target.item) moves.push([b, target]);
    else if (m && m.type === "storage") moves.push([b, "inv"]);
    else if (!target && !blocked(nx, ny)) moves.push([b, "inv"]); // ujung sabuk: masuk stok
  }
  for (const [from, to] of moves) {
    if (!from.item) continue;
    if (to === "inv") { addInv(from.item, 1); from.item = null; }
    else if (!to.item) { to.item = from.item; from.item = null; }
  }
}

// ---------- interaksi ----------
function interact() {
  const [fx, fy] = frontTile();
  if (fx === MAYOR.x && fy === MAYOR.y) return toast("Mayor: lahan plotmu 30x22 petak. Perluasan plot belum tersedia.");
  const soon = soonAt(fx, fy);
  if (soon) return toast(soon);
  const shopId = shopAt(fx, fy);
  if (shopId) return openShop(shopId);
  const m = machineAt(fx, fy);
  if (m) return m.type === "storage" ? toast("Storage: batas item aktif sekarang " + activeLimit()) : openMachine(m);
  const n = nodeAt(fx, fy);
  if (n && n.readyAt <= performance.now()) return harvest(n);
}

// ---------- panel UI ----------
const panel = document.getElementById("panel");
const toastEl = document.getElementById("toast");
let toastTimer = null, buildMode = null;

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 1800);
}
function closePanel() { panel.classList.add("hidden"); panel.innerHTML = ""; }
function showPanel(html) {
  panel.innerHTML = '<button id="panelClose">✕</button>' + html;
  panel.classList.remove("hidden");
  document.getElementById("panelClose").onclick = closePanel;
}
const fmtList = o => Object.keys(o).map(k => o[k] + " " + k).join(", ") || "-";

function openShop(id) {
  const shop = DATA.shops[id];
  let html = "<h3>" + shop.name + "</h3><p>Uang kamu: $" + S.money + "</p>";
  const buys = Object.keys(shop.buys);
  if (buys.length) {
    html += "<h4>Toko membeli dari kamu</h4>";
    for (const item of buys) {
      const own = S.inv[item] || 0;
      html += '<div class="row"><span>' + item + " — $" + shop.buys[item] + " (punya " + own + ')</span>' +
        '<span><button data-sell="' + item + '" data-n="1">Jual 1</button> <button data-sell="' + item + '" data-n="all">Semua</button></span></div>';
    }
  }
  let sells = Object.assign({}, shop.sells);
  if (id === "toolShop") {
    // upgrade alat: hanya tier berikutnya yang ditawarkan
    for (const t in DATA.tools) {
      const cur = S.tools[t];
      if (cur + 1 < DATA.tools[t].tiers.length)
        sells[DATA.tools[t].label + " " + DATA.tools[t].tiers[cur + 1]] = DATA.tools[t].prices[cur + 1];
    }
  }
  const sellKeys = Object.keys(sells);
  if (sellKeys.length) {
    html += "<h4>Kamu membeli dari toko</h4>";
    for (const item of sellKeys) {
      html += '<div class="row"><span>' + item + " — $" + sells[item] + '</span><button data-buy="' + item + '">Beli</button></div>';
    }
  }
  if (id === "blacksmithShop") html += "<p style='font-size:12px;opacity:.8'>Nails dijual per bundel isi 10.</p>";
  showPanel(html);
  panel.querySelectorAll("[data-sell]").forEach(b => b.onclick = () => {
    const item = b.dataset.sell;
    const own = S.inv[item] || 0;
    const n = b.dataset.n === "all" ? own : Math.min(1, own);
    if (!n) return toast("Tidak punya " + item);
    addInv(item, -n);
    S.money += n * shop.buys[item];
    toast("Terjual " + n + " " + item + " = $" + (n * shop.buys[item]));
    updateHUD(); openShop(id);
  });
  panel.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => {
    const label = b.dataset.buy;
    if (label === "Nails") {
      if (S.money < sells[label]) return toast("Uang tidak cukup");
      S.money -= sells[label]; addInv("Nails", 10);
    } else if (id === "exchange" || id === "carpenterShop" || id === "blacksmithShop") {
      if (S.money < sells[label]) return toast("Uang tidak cukup");
      S.money -= sells[label]; addInv(label, 1);
    } else { // upgrade alat di Tool Shop
      for (const t in DATA.tools) {
        if (label === DATA.tools[t].label + " " + DATA.tools[t].tiers[S.tools[t] + 1]) {
          if (S.money < sells[label]) return toast("Uang tidak cukup");
          S.money -= sells[label]; S.tools[t]++;
        }
      }
    }
    toast("Beli " + label);
    updateHUD(); openShop(id);
  });
}

function openMachine(m) {
  const def = DATA.machines[m.type];
  let html = "<h3>" + def.name + "</h3>";
  html += "<p style='font-size:13px'>Buffer masuk: " + fmtList(m.in) + "<br>Keluaran: " + fmtList(m.out) + "</p>";
  if (m.progress > 0) html += "<p style='font-size:13px'>Sedang memproses... " + Math.ceil(m.progress) + " dtk</p>";
  html += "<h4>Pilih resep</h4>";
  def.recipes.forEach((r, i) => {
    const need = recipeNeeds(r);
    html += '<div class="row' + (m.recipe === i ? " sel" : "") + '"><span>' + fmtList(r.out) + " ← " + fmtList(need) + " (" + r.time + ' dtk)</span><button data-recipe="' + i + '">Pilih</button></div>';
  });
  html += '<h4>Bahan</h4><div class="row"><span>Muat bahan resep terpilih dari inventaris</span><button id="btnLoad">Muat</button></div>';
  html += '<div class="row"><span>Ambil semua keluaran ke inventaris</span><button id="btnTake">Ambil</button></div>';
  showPanel(html);
  panel.querySelectorAll("[data-recipe]").forEach(b => b.onclick = () => { m.recipe = +b.dataset.recipe; openMachine(m); });
  document.getElementById("btnLoad").onclick = () => {
    if (m.recipe == null) return toast("Pilih resep dulu");
    const need = recipeNeeds(def.recipes[m.recipe]);
    if (!hasAll(S.inv, need)) return toast("Inventaris kurang: butuh " + fmtList(need));
    for (const k in need) { addInv(k, -need[k]); m.in[k] = (m.in[k] || 0) + need[k]; }
    toast("Bahan dimuat"); updateHUD(); openMachine(m);
  };
  document.getElementById("btnTake").onclick = () => {
    for (const k in m.out) addInv(k, m.out[k]);
    m.out = {};
    toast("Keluaran diambil"); updateHUD(); openMachine(m);
  };
}

function openBuild() {
  let html = "<h3>Menu Bangun</h3><p style='font-size:13px'>Uang: $" + S.money + ". Klik bangunan, lalu klik petak di lahan plot (garis kuning).</p>";
  for (const id in DATA.machines) {
    const def = DATA.machines[id];
    if (S.unlocked[id]) {
      html += '<div class="row' + (buildMode === id ? " sel" : "") + '"><span>' + def.name + '</span><button data-build="' + id + '">Taruh</button></div>';
    } else {
      html += '<div class="row"><span>' + def.name + " (terkunci)</span>" +
        '<button data-research="' + id + '">Riset $' + def.research + "</button></div>";
    }
  }
  html += "<p style='font-size:12px;opacity:.8'>Conveyor: arah sabuk diubah dengan tombol R atau tombol Sabuk. Storage menaikkan batas item aktif.</p>";
  showPanel(html);
  panel.querySelectorAll("[data-build]").forEach(b => b.onclick = () => { buildMode = b.dataset.build; openBuild(); });
  panel.querySelectorAll("[data-research]").forEach(b => b.onclick = () => {
    const id = b.dataset.research, price = DATA.machines[id].research;
    if (S.money < price) return toast("Uang tidak cukup buat riset " + DATA.machines[id].name);
    S.money -= price; S.unlocked[id] = true;
    toast(DATA.machines[id].name + " terbuka");
    updateHUD(); openBuild();
  });
}

function placeAt(tx, ty) {
  if (!buildMode) return false;
  if (!inPlot(tx, ty)) { toast("Bangunan hanya boleh di lahan plot"); return true; }
  if (blocked(tx, ty) || S.belts[key(tx, ty)]) { toast("Petak tidak kosong"); return true; }
  if (buildMode === "conveyor") {
    S.belts[key(tx, ty)] = { dir: S.beltDir, item: null };
  } else {
    S.machines.push({ type: buildMode, x: tx, y: ty, recipe: null, in: {}, out: {}, progress: 0 });
  }
  updateHUD();
  return true;
}

// ---------- HUD & inventaris ----------
function updateHUD() {
  document.getElementById("money").textContent = "$" + S.money;
  document.getElementById("active").textContent = "Item aktif: " + activeCount() + "/" + activeLimit();
  const list = document.getElementById("invList");
  const keys = Object.keys(S.inv);
  list.innerHTML = keys.length ? keys.map(k => "<div><span>" + k + "</span><b>" + S.inv[k] + "</b></div>").join("") : "<div>Tidak ada barang</div>";
}

// ---------- kamera ----------
// mengikuti pemain dengan jeda lembut (lerp), berhenti di tepi dunia
const cam = { x: 0, y: 0 };
function camTarget() {
  return [
    Math.max(0, Math.min(MW * TILE - canvas.width, S.player.x + TILE / 2 - canvas.width / 2)),
    Math.max(0, Math.min(MH * TILE - canvas.height, S.player.y + TILE / 2 - canvas.height / 2))
  ];
}
function snapCam() { const [tx, ty] = camTarget(); cam.x = tx; cam.y = ty; }

// ---------- gambar (prosedural, gaya piksel sederhana) ----------
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
const GCOLORS = {
  grass: ["#549254", "#5b9a5b"], forest: ["#40763f", "#478548"], plot: ["#69a862", "#71b06a"],
  paved: ["#8d8578", "#968e7f"], road: ["#a9834f", "#b08d55"], bridge: ["#8a6d3b", "#93763f"],
  sand: ["#dfc98d", "#e6d194"], rock: ["#8a7f72", "#94887a"], water: ["#3a6ea5", "#35679c"]
};
function draw() {
  ctx.save();
  ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
  // tanah per zona (hanya petak yang terlihat kamera)
  const x0 = Math.max(0, Math.floor(cam.x / TILE)), x1 = Math.min(MW - 1, x0 + Math.ceil(canvas.width / TILE) + 1);
  const y0 = Math.max(0, Math.floor(cam.y / TILE)), y1 = Math.min(MH - 1, y0 + Math.ceil(canvas.height / TILE) + 1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const g = groundAt(x, y);
    rect(x * TILE, y * TILE, TILE, TILE, GCOLORS[g][(x + y) % 2]);
    if (g === "water") rect(x * TILE + 6, y * TILE + 14, 12, 2, "#5b8cc0");
  }
  // garis batas plaza town dan lahan plot
  ctx.strokeStyle = "#6d675c"; ctx.lineWidth = 2;
  ctx.strokeRect(48 * TILE, 12 * TILE, 8 * TILE, 6 * TILE);
  ctx.strokeStyle = "#ffd75e";
  ctx.strokeRect(PLOT.x * TILE, PLOT.y * TILE, PLOT.w * TILE, PLOT.h * TILE);
  ctx.lineWidth = 1;
  // node sumber daya
  const now = performance.now();
  for (const n of S.nodes) {
    const px = n.x * TILE, py = n.y * TILE;
    if (n.readyAt > now) { // tunggul / lubang bekas panen
      rect(px + 10, py + 20, 12, 8, "#7a5c3e");
      continue;
    }
    if (n.type === "tree" && groundAt(n.x, n.y) === "sand") { // palm di desert
      rect(px + 14, py + 14, 5, 16, "#8a6d3b");
      rect(px + 2, py + 4, 12, 5, "#3a8540");
      rect(px + 18, py + 4, 12, 5, "#3a8540");
      rect(px + 10, py + 1, 12, 5, "#2e6b30");
    } else if (n.type === "tree") {
      rect(px + 13, py + 18, 6, 12, "#7a5c3e");
      rect(px + 4, py + 2, 24, 18, "#2e6b30");
      rect(px + 8, py + 6, 8, 6, "#3a8540");
    } else if (n.type === "sand") rect(px + 3, py + 8, 26, 18, "#e3cf8f");
    else if (n.type === "clay") rect(px + 3, py + 8, 26, 18, "#c08552");
    else {
      rect(px + 3, py + 10, 26, 18, "#7d7d7d");
      rect(px + 8, py + 13, 7, 7, NODE_COLORS[n.type]);
      rect(px + 18, py + 18, 6, 6, NODE_COLORS[n.type]);
    }
  }
  // conveyor
  for (const k in S.belts) {
    const b = S.belts[k];
    const [x, y] = k.split(",").map(Number);
    rect(x * TILE + 1, y * TILE + 8, TILE - 2, 16, "#444");
    rect(x * TILE + 4, y * TILE + 12, TILE - 8, 2, "#777");
    rect(x * TILE + 4, y * TILE + 20, TILE - 8, 2, "#777");
    ctx.fillStyle = "#ffd75e";
    ctx.font = "12px sans-serif";
    ctx.fillText(DIR_ARROW[b.dir], x * TILE + 11, y * TILE + 20);
    if (b.item) rect(x * TILE + 10, y * TILE + 10, 12, 12, "#d9a441");
  }
  // mesin & storage
  for (const m of S.machines) {
    const px = m.x * TILE, py = m.y * TILE;
    rect(px + 2, py + 2, TILE - 4, TILE - 4, m.type === "storage" ? "#8a6d3b" : "#5d6d7e");
    rect(px + 2, py + 2, TILE - 4, 8, m.type === "storage" ? "#a8854a" : "#74879c");
    if (m.progress > 0) rect(px + 3, py + TILE - 8, (TILE - 6) * (1 - m.progress / DATA.machines[m.type].recipes[m.recipe].time), 4, "#ffd75e");
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(DATA.machines[m.type].name.slice(0, 4), px + 4, py + 22);
  }
  // toko
  for (const [id, sx, sy, w] of SHOPS) {
    rect(sx * TILE, sy * TILE, w * TILE, 2 * TILE, "#7a4a2b");
    rect(sx * TILE, sy * TILE, w * TILE, 14, "#a33e31");
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(DATA.shops[id].name, sx * TILE + 6, sy * TILE + 34);
    rect(sx * TILE + 4, (sy + 1) * TILE + 8, w * TILE - 8, 12, "#c9a86a");
  }
  // bangunan desa gurun & kapal bajak laut (pajangan, toko belum aktif)
  for (const [sx, sy, w, h] of SOON) {
    rect(sx * TILE, sy * TILE, w * TILE, h * TILE, "#a9825a");
    rect(sx * TILE, sy * TILE, w * TILE, 12, "#7a4a2b");
  }
  rect(90 * TILE + 14, 34 * TILE, 4, 2 * TILE, "#5a3a1a");      // tiang kapal
  rect(90 * TILE + 18, 34 * TILE + 4, 14, 18, "#e8e2d2");      // layar kapal
  ctx.fillStyle = "#fff";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("Desa Gurun", 73 * TILE, 22 * TILE + 12);
  ctx.fillText("Kapal Bajak Laut", 86 * TILE, 35 * TILE);
  // NPC Mayor
  rect(MAYOR.x * TILE + 8, MAYOR.y * TILE + 16, 16, 14, "#7a2b50");
  rect(MAYOR.x * TILE + 9, MAYOR.y * TILE + 3, 14, 13, "#f2c185");
  rect(MAYOR.x * TILE + 9, MAYOR.y * TILE + 3, 14, 5, "#333");
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("Mayor", MAYOR.x * TILE + 2, MAYOR.y * TILE - 3);
  // pemain
  const p = S.player;
  rect(p.x + 8, p.y + 16, 16, 14, "#2b50c8");       // badan
  rect(p.x + 9, p.y + 3, 14, 13, "#f2c185");        // kepala
  rect(p.x + 9, p.y + 3, 14, 5, "#5a3a1a");         // rambut
  const d = DIRS[p.dir];                            // penanda arah
  rect(p.x + 14 + d[0] * 6, p.y + 14 + d[1] * 6, 4, 4, "#ffd75e");
  ctx.restore();
}

// ---------- input ----------
const keysDown = {};
addEventListener("keydown", e => {
  keysDown[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === "e") interact();
  if (e.key.toLowerCase() === "r") rotateBelt();
  if (e.key.toLowerCase() === "b") openBuild();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) e.preventDefault();
});
addEventListener("keyup", e => keysDown[e.key.toLowerCase()] = false);

function rotateBelt() {
  const order = ["right", "down", "left", "up"];
  S.beltDir = order[(order.indexOf(S.beltDir) + 1) % 4];
  document.getElementById("btnBeltDir").textContent = "Sabuk: " + DIR_ARROW[S.beltDir];
}

function canvasTile(e) {
  const r = canvas.getBoundingClientRect();
  const wx = (e.clientX - r.left) * (canvas.width / r.width) + cam.x;
  const wy = (e.clientY - r.top) * (canvas.height / r.height) + cam.y;
  return [Math.floor(wx / TILE), Math.floor(wy / TILE)];
}
canvas.addEventListener("click", e => {
  const [tx, ty] = canvasTile(e);
  if (placeAt(tx, ty)) return;
  // klik = hadapkan ke petak itu lalu interaksi
  const ptx = Math.floor(S.player.x / TILE), pty = Math.floor(S.player.y / TILE);
  if (Math.abs(tx - ptx) + Math.abs(ty - pty) === 1) {
    S.player.dir = tx > ptx ? "right" : tx < ptx ? "left" : ty > pty ? "down" : "up";
    interact();
  }
});

// joystick virtual (HP)
const joyVec = { x: 0, y: 0 };
const joy = document.getElementById("joy"), knob = document.getElementById("joyKnob");
let joyId = null;
joy.addEventListener("pointerdown", e => { joyId = e.pointerId; joy.setPointerCapture(joyId); });
joy.addEventListener("pointermove", e => {
  if (e.pointerId !== joyId) return;
  const r = joy.getBoundingClientRect();
  let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
  let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
  const len = Math.hypot(dx, dy) || 1;
  if (len > 1) { dx /= len; dy /= len; }
  joyVec.x = dx; joyVec.y = dy;
  knob.style.left = 35 + dx * 30 + "px";
  knob.style.top = 35 + dy * 30 + "px";
});
const joyEnd = e => { if (e.pointerId === joyId) { joyId = null; joyVec.x = joyVec.y = 0; knob.style.left = "35px"; knob.style.top = "35px"; } };
joy.addEventListener("pointerup", joyEnd);
joy.addEventListener("pointercancel", joyEnd);
document.getElementById("btnAct").addEventListener("click", interact);
document.getElementById("btnBeltDir").addEventListener("click", rotateBelt);

// ---------- gerak pemain ----------
function tickPlayer(dt) {
  let vx = 0, vy = 0;
  if (keysDown["w"] || keysDown["arrowup"]) vy = -1;
  if (keysDown["s"] || keysDown["arrowdown"]) vy = 1;
  if (keysDown["a"] || keysDown["arrowleft"]) vx = -1;
  if (keysDown["d"] || keysDown["arrowright"]) vx = 1;
  if (!vx && !vy && (joyVec.x || joyVec.y)) { vx = joyVec.x; vy = joyVec.y; }
  if (!vx && !vy) return;
  const speed = 150;
  if (Math.abs(vx) > Math.abs(vy)) S.player.dir = vx > 0 ? "right" : "left";
  else S.player.dir = vy > 0 ? "down" : "up";
  const nx = S.player.x + vx * speed * dt, ny = S.player.y + vy * speed * dt;
  const corners = [[nx + 6, ny + 6], [nx + 25, ny + 6], [nx + 6, ny + 29], [nx + 25, ny + 29]];
  // sumbu x dan y dicek terpisah supaya bisa meluncur di dinding
  if (!corners.some(([cx, cy]) => blocked(Math.floor(cx / TILE), Math.floor(S.player.y / TILE)))) S.player.x = nx;
  if (!corners.some(([cx, cy]) => blocked(Math.floor(S.player.x / TILE), Math.floor(cy / TILE)))) S.player.y = ny;
}

// ---------- simpan / muat ----------
const SAVE_KEY = "indotopia-save-v2"; // v2: map 96x60, simpanan lama 33x22 diabaikan
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* penyimpanan penuh/diblokir */ }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (!s || typeof s.money !== "number" || !s.player) return false;
    S = s;
    return true;
  } catch (e) { return false; }
}

// ---------- tombol HUD ----------
document.getElementById("btnBuild").onclick = openBuild;
document.getElementById("btnInv").onclick = () => document.getElementById("invPanel").classList.toggle("hidden");
document.getElementById("btnSave").onclick = () => { save(); toast("Tersimpan"); };
document.getElementById("btnReset").onclick = () => {
  if (!confirm("Reset game ke awal? Semua simpanan dihapus.")) return;
  localStorage.removeItem(SAVE_KEY);
  S = freshState(); seedNodes(); snapCam(); buildMode = null; closePanel(); updateHUD();
  toast("Game direset. Modal $" + DATA.startMoney);
};

// ---------- loop utama ----------
let last = performance.now(), saveTimer = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tickPlayer(dt);
  tickMachines(dt);
  tickBelts(dt);
  const [ctX, ctY] = camTarget();
  const ck = Math.min(1, dt * 5);
  cam.x += (ctX - cam.x) * ck;
  cam.y += (ctY - cam.y) * ck;
  draw();
  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; save(); updateHUD(); }
  requestAnimationFrame(loop);
}

S = freshState();
if (!load()) seedNodes(); else if (!S.nodes || !S.nodes.length) seedNodes();
snapCam();
updateHUD();
addEventListener("beforeunload", save);
requestAnimationFrame(loop);
