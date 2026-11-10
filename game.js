"use strict";
// Indotopia v1: tycoon pabrik 2D. Semua logika di file ini, data di data.js.

const TILE = 32, MW = 33, MH = 22;
const CITY_X = 24; // kolom awal area kota
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const key = (x, y) => x + "," + y;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DIR_ARROW = { up: "▲", down: "▼", left: "◀", right: "▶" };
const NODE_COLORS = { stone: "#9a9a9a", iron: "#b5651d", copper: "#e08a4c", tin: "#cfd4d8" };

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
    player: { x: 4 * TILE, y: 11 * TILE, dir: "down" },
    beltDir: "right",
    shopTools: {}   // alat yang sudah dibeli pemain di Tool Shop (per tier)
  };
}

// posisi toko tetap di kota: [shopId, x, y, lebar]
const SHOPS = [
  ["carpenterShop", 25, 2, 4],
  ["blacksmithShop", 30, 2, 3],
  ["toolShop", 25, 8, 4],
  ["exchange", 30, 8, 3]
];

function seedNodes() {
  const put = (type, x, y) => S.nodes.push({ type, x, y, readyAt: 0 });
  const trees = [[2,3],[5,2],[8,4],[12,2],[16,3],[20,2],[3,8],[7,9],[11,7],[15,9],[19,7],[22,4],[2,15],[6,17],[10,15],[14,17],[18,15],[21,10],[9,12],[17,12]];
  trees.forEach(([x, y]) => put("tree", x, y));
  [[3,5],[4,5],[3,6]].forEach(([x, y]) => put("sand", x, y));
  [[6,5],[7,5],[6,6]].forEach(([x, y]) => put("clay", x, y));
  [[13,16],[14,16]].forEach(([x, y]) => put("stone", x, y));
  [[16,16],[17,16]].forEach(([x, y]) => put("iron", x, y));
  [[19,16],[20,16]].forEach(([x, y]) => put("copper", x, y));
  [[13,19],[14,19]].forEach(([x, y]) => put("tin", x, y));
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
function isCity(x, y) { return x >= CITY_X; }
function shopAt(x, y) {
  for (const [id, sx, sy, w] of SHOPS) if (x >= sx && x < sx + w && y >= sy && y < sy + 2) return id;
  return null;
}
function nodeAt(x, y) { return S.nodes.find(n => n.x === x && n.y === y); }
function machineAt(x, y) { return S.machines.find(m => m.x === x && m.y === y); }
function blocked(x, y) {
  if (x < 0 || y < 0 || x >= MW || y >= MH) return true;
  if (shopAt(x, y) || machineAt(x, y)) return true;
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
  let html = "<h3>Menu Bangun</h3><p style='font-size:13px'>Uang: $" + S.money + ". Klik bangunan, lalu klik petak rumput di lahan.</p>";
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
  if (isCity(tx, ty) || blocked(tx, ty) || S.belts[key(tx, ty)]) { toast("Petak tidak kosong"); return true; }
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

// ---------- gambar (prosedural, gaya piksel sederhana) ----------
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function draw() {
  const camX = Math.max(0, Math.min(MW * TILE - canvas.width, S.player.x + TILE / 2 - canvas.width / 2));
  const camY = Math.max(0, Math.min(MH * TILE - canvas.height, S.player.y + TILE / 2 - canvas.height / 2));
  ctx.save();
  ctx.translate(-Math.round(camX), -Math.round(camY));
  // tanah
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (isCity(x, y)) rect(x * TILE, y * TILE, TILE, TILE, (x + y) % 2 ? "#8d8578" : "#968e7f");
    else rect(x * TILE, y * TILE, TILE, TILE, (x + y) % 2 ? "#549254" : "#5b9a5b");
  }
  rect(CITY_X * TILE - 4, 0, 4, MH * TILE, "#6d675c");
  // node sumber daya
  const now = performance.now();
  for (const n of S.nodes) {
    const px = n.x * TILE, py = n.y * TILE;
    if (n.readyAt > now) { // tunggul / lubang bekas panen
      rect(px + 10, py + 20, 12, 8, "#7a5c3e");
      continue;
    }
    if (n.type === "tree") {
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
  const camX = Math.max(0, Math.min(MW * TILE - canvas.width, S.player.x + TILE / 2 - canvas.width / 2));
  const camY = Math.max(0, Math.min(MH * TILE - canvas.height, S.player.y + TILE / 2 - canvas.height / 2));
  const wx = (e.clientX - r.left) * (canvas.width / r.width) + camX;
  const wy = (e.clientY - r.top) * (canvas.height / r.height) + camY;
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
const SAVE_KEY = "indotopia-save-v1";
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
  S = freshState(); seedNodes(); buildMode = null; closePanel(); updateHUD();
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
  draw();
  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; save(); updateHUD(); }
  requestAnimationFrame(loop);
}

S = freshState();
if (!load()) seedNodes(); else if (!S.nodes || !S.nodes.length) seedNodes();
updateHUD();
addEventListener("beforeunload", save);
requestAnimationFrame(loop);
