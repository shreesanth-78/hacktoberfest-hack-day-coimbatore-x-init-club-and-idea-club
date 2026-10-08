// Static kingdom metadata. NO secrets or win rules live here — those belong to the backend.
export const GAME_CONFIG = { maxStrikes: 3, checkpointLevel: 3, levelsPerKingdom: 6 };

export const KINGDOMS = [
  {
    id: 'civic', index: 0, name: 'The Civic Grids', domain: 'Water & City Works',
    description: 'A prosperous stone city of aqueducts, reservoirs and fountains. Its smart-city water network is guarded by a bronze sentinel.',
    guardian: { name: 'Sentinel Hydro-01', kind: 'hydro', title: 'Warden of the Waters' },
    colors: { primary: '#2b7fc4', dark: '#17476f', accent: '#9bdcff', ground: '#86c466', ground2: '#5fa24a', sky: ['#bfe6ff', '#e9f6d8'] },
    places: ['Well Outpost', 'Canal Watchtower', 'Sluice Checkpoint', 'Fountain Arena', 'Reservoir Records', 'Grand Aqueduct Keep'],
    mapCenter: { x: 300, y: 720 }, emblem: 'drop',
  },
  {
    id: 'bio', index: 1, name: 'The Bio-Archives', domain: 'Healing & Botanical Science',
    description: 'Marble temples, a vast library and glowing crystal gardens. The research vaults of the Bio-Archives are watched by a scholarly guardian.',
    guardian: { name: 'Sentinel Onco-02', kind: 'onco', title: 'Keeper of the Scrolls' },
    colors: { primary: '#1f9d86', dark: '#0f5c4e', accent: '#9bf2d9', ground: '#7cc27a', ground2: '#4f9e6a', sky: ['#d3f5e8', '#eef7d6'] },
    places: ['Herb Garden Outpost', 'Apothecary Tower', 'Crystal Grove Shrine', 'Glyph Arena', 'Hall of Records', 'Sanctum of the Archives'],
    mapCenter: { x: 430, y: 270 }, emblem: 'leaf',
  },
  {
    id: 'trade', index: 2, name: 'The Trade Ports', domain: 'Commerce & Logistics',
    description: 'A fortified coastal city of harbour walls, warehouses and merchant guilds. Its cargo ledgers are guarded by a royal trade inspector.',
    guardian: { name: 'Sentinel Broker-03', kind: 'broker', title: 'Royal Trade Inspector' },
    colors: { primary: '#c8921c', dark: '#7a4a12', accent: '#ffe08a', ground: '#9bc86a', ground2: '#78a853', sky: ['#cfeaff', '#fff1c9'] },
    places: ['Dockside Outpost', 'Harbour Watchtower', 'Customs Checkpoint', 'Guild Game Hall', 'Cargo Records Vault', 'Admiral\'s Citadel'],
    mapCenter: { x: 860, y: 640 }, emblem: 'anchor',
  },
  {
    id: 'risk', index: 3, name: 'The Risk Ledgers', domain: 'Treasury, Law & Allocation',
    description: 'A grand royal castle of treasury vaults and marble courtyards. The decrees on grants and allocations are guarded by a royal auditor.',
    guardian: { name: 'Sentinel Ledger-04', kind: 'ledger', title: 'Royal Auditor' },
    colors: { primary: '#7b3fa8', dark: '#3f1f60', accent: '#e2c2ff', ground: '#8fbf6a', ground2: '#6d9e58', sky: ['#e3d3f5', '#f6eccf'] },
    places: ['Tax Gate Outpost', 'Treasury Tower', 'Decree Checkpoint', 'Court of Games', 'Royal Records Chamber', 'Throne of Ledgers'],
    mapCenter: { x: 1170, y: 260 }, emblem: 'scales',
  },
  {
    id: 'scrap', index: 4, name: 'The Scrap Wastes', domain: 'Ruins & Reclaimed Technology',
    description: 'Desert ruins, canyons and giant heaps of ancient machinery. The recycling vaults are guarded by a hulking construct of stone and metal.',
    guardian: { name: 'Sentinel Reclaimer-05', kind: 'reclaimer', title: 'Construct of the Wastes' },
    colors: { primary: '#d9692b', dark: '#7a2a14', accent: '#ffc58a', ground: '#e0c488', ground2: '#c9a566', sky: ['#ffe0b0', '#fbe9c4'] },
    places: ['Junkyard Outpost', 'Rust Watchtower', 'Salvage Checkpoint', 'Gear Puzzle Arena', 'Archive of Parts', 'Colossus Fortress'],
    mapCenter: { x: 1380, y: 720 }, emblem: 'gear',
  },
];

export const kingdomById = (id) => KINGDOMS.find((k) => k.id === id);
