import { DeterministicRng } from "./rng.ts";
import type {
  Character,
  Faction,
  Personality,
  Resources,
  Settlement,
  WorldState,
} from "./types.ts";

const firstNames = [
  "Mara", "Bram", "Niko", "Sable", "Jun", "Iris", "Toma", "Vale", "Orin", "Kessa",
  "Rook", "Lio", "Ada", "Pax", "Mina", "Corin", "Zara", "Finn", "Esme", "Dax",
];

const lastNames = [
  "Vane", "Morrow", "Reef", "Calder", "Sorn", "Hale", "Dusk", "Quill", "Marrow", "Drake",
  "Tern", "Ash", "Gale", "Pike", "Wren", "Stone", "Rill", "Crow", "Vale", "Frost",
];

function resources(
  provisions: number,
  arms: number,
  medicine: number,
  shipMaterials: number,
): Resources {
  return { provisions, arms, medicine, shipMaterials };
}

function makeSettlement(
  values: Omit<Settlement, "ownerId" | "workers" | "targetStocks">,
): Settlement {
  return {
    ...values,
    ownerId: null,
    workers: Math.round(values.population * 0.42),
    targetStocks: resources(180, 90, 70, 100),
  };
}

function personalityFor(archetype: string, rng: DeterministicRng): Personality {
  const base: Personality = {
    ambition: rng.between(0.25, 0.75),
    aggression: rng.between(0.15, 0.65),
    caution: rng.between(0.25, 0.8),
    loyalty: rng.between(0.3, 0.85),
    curiosity: rng.between(0.2, 0.85),
    commerce: rng.between(0.15, 0.8),
  };

  if (archetype === "raider") {
    base.aggression = rng.between(0.78, 0.98);
    base.ambition = rng.between(0.7, 0.95);
    base.caution = rng.between(0.1, 0.35);
  } else if (archetype === "merchant") {
    base.commerce = rng.between(0.8, 0.98);
    base.aggression = rng.between(0.05, 0.25);
  } else if (archetype === "officer") {
    base.loyalty = rng.between(0.75, 0.98);
    base.caution = rng.between(0.5, 0.85);
  } else if (archetype === "explorer") {
    base.curiosity = rng.between(0.82, 0.99);
  }

  return base;
}

function makeCharacter(
  index: number,
  rng: DeterministicRng,
  settlementIds: string[],
): Character {
  const archetypes = ["officer", "merchant", "explorer", "raider", "steward"];
  const archetype = archetypes[index % archetypes.length];
  const locationId = settlementIds[index % settlementIds.length];
  const factionId = index < 13 ? "world-government" : index < 22 ? "free-tide" : null;
  const veteran = index === 0 || index === 13;

  return {
    id: `character-${String(index + 1).padStart(2, "0")}`,
    name: `${firstNames[index % firstNames.length]} ${lastNames[(index * 7 + Math.floor(index / firstNames.length) * 3) % lastNames.length]}`,
    archetype,
    factionId,
    locationId,
    travel: null,
    money: rng.integer(90, 260),
    cargo: resources(rng.integer(18, 38), rng.integer(0, 5), rng.integer(0, 4), rng.integer(0, 6)),
    health: 100,
    morale: rng.integer(70, 100),
    sailors: rng.integer(8, 22),
    troops: {
      count: veteran ? rng.integer(75, 105) : rng.integer(12, 48),
      experience: veteran ? rng.between(0.55, 0.8) : rng.between(0.05, 0.35),
      discipline: archetype === "officer" ? rng.between(0.7, 0.92) : rng.between(0.35, 0.78),
    },
    attributes: {
      power: veteran ? rng.integer(68, 82) : rng.integer(20, 55),
      speed: veteran ? rng.integer(60, 78) : rng.integer(20, 55),
      endurance: veteran ? rng.integer(65, 82) : rng.integer(25, 58),
      resilience: veteran ? rng.integer(65, 82) : rng.integer(25, 58),
    },
    skills: {
      strategy: archetype === "officer" ? rng.integer(58, 86) : rng.integer(18, 60),
      leadership: veteran ? rng.integer(70, 90) : rng.integer(20, 68),
      navigation: archetype === "explorer" ? rng.integer(60, 88) : rng.integer(20, 65),
      trade: archetype === "merchant" ? rng.integer(64, 90) : rng.integer(15, 60),
    },
    personality: personalityFor(archetype, rng),
    currentGoal: "establish-position",
    lastDecisionTick: -1,
    lastBattleTick: -100,
    victories: 0,
    defeats: 0,
  };
}

export function createPrototypeWorld(seed = 1847): WorldState {
  const rng = new DeterministicRng(seed);
  const factions: Record<string, Faction> = {
    "world-government": {
      id: "world-government",
      name: "World Government",
      color: "#345995",
      treasury: 18_000,
      taxRate: 0.14,
    },
    "free-tide": {
      id: "free-tide",
      name: "Free Tide Compact",
      color: "#d05a47",
      treasury: 2_800,
      taxRate: 0.08,
    },
  };

  const settlements: Record<string, Settlement> = {
    "crown-harbor": makeSettlement({
      id: "crown-harbor",
      name: "Crown Harbor",
      position: { x: 24, y: 28 },
      factionId: "world-government",
      population: 18_000,
      focus: "arms",
      production: resources(5.5, 6.5, 2.2, 3.4),
      stocks: resources(220, 155, 82, 105),
      garrison: 260,
      fortification: 1.35,
      stability: 91,
    }),
    "verdant-cay": makeSettlement({
      id: "verdant-cay",
      name: "Verdant Cay",
      position: { x: 48, y: 69 },
      factionId: null,
      population: 7_200,
      focus: "provisions",
      production: resources(9.5, 1.1, 4.6, 2.2),
      stocks: resources(310, 48, 135, 66),
      garrison: 70,
      fortification: 1.08,
      stability: 78,
    }),
    "cinder-key": makeSettlement({
      id: "cinder-key",
      name: "Cinder Key",
      position: { x: 79, y: 31 },
      factionId: "free-tide",
      population: 6_400,
      focus: "shipMaterials",
      production: resources(3.2, 4.8, 1.4, 8.2),
      stocks: resources(96, 128, 42, 260),
      garrison: 115,
      fortification: 1.16,
      stability: 73,
    }),
    glassport: makeSettlement({
      id: "glassport",
      name: "Glassport",
      position: { x: 63, y: 48 },
      factionId: "world-government",
      population: 10_500,
      focus: "medicine",
      production: resources(4.1, 2.5, 7.7, 3.2),
      stocks: resources(145, 76, 215, 91),
      garrison: 155,
      fortification: 1.22,
      stability: 86,
    }),
  };

  const settlementIds = Object.keys(settlements);
  const characters: Record<string, Character> = {};
  for (let index = 0; index < 30; index += 1) {
    const character = makeCharacter(index, rng, settlementIds);
    characters[character.id] = character;
  }

  // Put a bold Free Tide captain within reach of an early consequential choice.
  characters["character-14"].locationId = "crown-harbor";
  characters["character-14"].personality.aggression = 0.97;
  characters["character-14"].personality.ambition = 0.94;
  characters["character-14"].personality.caution = 0.08;

  return {
    version: 1,
    scenario: "four-island-pressure-test",
    seed,
    rngState: rng.state,
    tick: 0,
    ticksPerDay: 6,
    nextEventSequence: 1,
    factions,
    settlements,
    characters,
  };
}
