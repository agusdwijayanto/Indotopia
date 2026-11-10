// Data game Indotopia. Angka dari riset wiki Factory Town Tycoon;
// angka yang tidak ada di wiki ditandai TUNING di docs/TASK.md dan README.
const DATA = {
  startMoney: 50,
  activeLimitBase: 150,      // batas item aktif dasar (wiki)
  activeLimitPerStorage: 150, // tiap Storage menaikkan batas (penyederhanaan)

  items: [
    "Log", "Firelog", "Pillar", "Plank", "Nails", "Wood Frame", "Table",
    "Bench", "Window", "Brick", "Glass", "Sand", "Clay", "Stone",
    "Iron Ore", "Copper Ore", "Tin Ore", "Iron Ingot", "Copper Ingot",
    "Tin Ingot", "Bronze Ingot", "Coil", "Gear", "Iron Beam", "Iron Frame",
    "Drill Head", "Motor"
  ],

  // fuel: Firelog yang dibakar terpisah tiap siklus (khusus Smelter)
  machines: {
    sawhorse: {
      name: "Sawhorse", research: 0,
      recipes: [
        { out: { "Pillar": 1 }, in: { "Log": 1 }, time: 5 },
        { out: { "Plank": 1 }, in: { "Pillar": 1 }, time: 5 },
        { out: { "Firelog": 3 }, in: { "Log": 1 }, time: 5 }
      ]
    },
    carpenter: {
      name: "Carpenter", research: 50,
      recipes: [
        { out: { "Wood Frame": 1 }, in: { "Plank": 4, "Nails": 4 }, time: 20 },
        { out: { "Table": 1 }, in: { "Wood Frame": 1, "Pillar": 1 }, time: 25 },
        { out: { "Bench": 1 }, in: { "Wood Frame": 1, "Pillar": 1 }, time: 20 },
        { out: { "Window": 1 }, in: { "Wood Frame": 1, "Glass": 1 }, time: 25 }
      ]
    },
    oven: {
      name: "Oven", research: 100,
      recipes: [
        { out: { "Brick": 10 }, in: { "Firelog": 3, "Clay": 2 }, time: 15 },
        { out: { "Glass": 1 }, in: { "Firelog": 3, "Sand": 2 }, time: 15 }
      ]
    },
    splitter: {
      name: "Log Splitter", research: 150,
      recipes: [
        { out: { "Firelog": 6 }, in: { "Log": 1 }, time: 7 }
      ]
    },
    smelter: {
      name: "Smelter", research: 250,
      recipes: [
        { out: { "Iron Ingot": 1 }, in: { "Iron Ore": 2 }, fuel: 1, time: 15 },
        { out: { "Copper Ingot": 1 }, in: { "Copper Ore": 1 }, fuel: 1, time: 15 },
        { out: { "Tin Ingot": 1 }, in: { "Tin Ore": 1 }, fuel: 1, time: 15 },
        { out: { "Bronze Ingot": 1 }, in: { "Copper Ingot": 4, "Tin Ingot": 1 }, fuel: 1, time: 15 }
      ]
    },
    blacksmith: {
      name: "Blacksmith", research: 1000,
      recipes: [
        { out: { "Nails": 10 }, in: { "Iron Ingot": 1 }, time: 20 },
        { out: { "Coil": 1 }, in: { "Copper Ingot": 1 }, time: 20 },
        { out: { "Gear": 1 }, in: { "Bronze Ingot": 1 }, time: 25 },
        { out: { "Iron Beam": 1 }, in: { "Iron Ingot": 1 }, time: 20 },
        { out: { "Iron Frame": 1 }, in: { "Iron Ingot": 2 }, time: 30 },
        { out: { "Drill Head": 1 }, in: { "Stone": 5, "Iron Beam": 1 }, time: 50 },
        { out: { "Motor": 1 }, in: { "Coil": 1, "Iron Frame": 1, "Gear": 1 }, time: 50 }
      ]
    },
    storage: { name: "Storage", research: 0, recipes: [] },
    conveyor: { name: "Conveyor", research: 0, recipes: [] }
  },

  // buys: harga toko membeli dari pemain; sells: harga pemain membeli dari toko
  shops: {
    sketchwood: {
      name: "SketchWood Cotton",
      buys: {},
      sells: {}
    },
    carpenterShop: {
      name: "Toko Carpenter",
      buys: { "Log": 7, "Plank": 6, "Pillar": 12, "Wood Frame": 28, "Table": 45, "Bench": 40, "Window": 55 },
      sells: {}
    },
    blacksmithShop: {
      name: "Blacksmith Industry",
      buys: { "Firelog": 6, "Iron Ingot": 24 },
      sells: { "Nails": 25 } // per bundel isi 10
    },
    toolShop: {
      name: "Tool Shop",
      buys: { "Iron Beam": 72, "Drill Head": 100, "Motor": 225 },
      sells: {} // upgrade alat diisi dari tools di bawah
    },
    exchange: {
      name: "Exchange",
      buys: {},
      sells: { "Log": 12, "Plank": 10, "Pillar": 20, "Brick": 30, "Wood Frame": 48, "Coil": 38, "Iron Beam": 125, "Iron Frame": 83, "Drill Head": 180 }
    }
  },

  // tier: nama alat dan harga beli upgrade (tier 0 = alat awal gratis)
  tools: {
    axe:    { label: "Kapak",   tiers: ["Celt", "Bronze", "Iron", "Steel"], prices: [0, 250, 1000, 2500] },
    shovel: { label: "Sekop",   tiers: ["Kayu", "Stone", "Bronze", "Iron"], prices: [0, 250, 500, 1000] },
    pick:   { label: "Beliung", tiers: ["Kayu", "Stone", "Bronze", "Iron"], prices: [0, 250, 500, 1000] }
  },

  // node panen: alat, hasil, jumlah, detik tumbuh lagi (TUNING)
  nodes: {
    tree:  { tool: "axe",    out: "Log",        n: 1, respawn: 60 },
    sand:  { tool: "shovel", out: "Sand",       n: 2, respawn: 30 },
    clay:  { tool: "shovel", out: "Clay",       n: 2, respawn: 30 },
    stone: { tool: "pick",   out: "Stone",      n: 2, respawn: 40 },
    iron:  { tool: "pick",   out: "Iron Ore",   n: 2, respawn: 45 },
    copper:{ tool: "pick",   out: "Copper Ore", n: 2, respawn: 45 },
    tin:   { tool: "pick",   out: "Tin Ore",    n: 2, respawn: 45 }
  }
};

if (typeof module !== "undefined") module.exports = DATA;
