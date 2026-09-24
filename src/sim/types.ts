export type ResourceKey = "provisions" | "arms" | "medicine" | "shipMaterials";

export type Resources = Record<ResourceKey, number>;

export interface Point {
  x: number;
  y: number;
}

export interface Faction {
  id: string;
  name: string;
  color: string;
  treasury: number;
  taxRate: number;
}

export interface Settlement {
  id: string;
  name: string;
  position: Point;
  factionId: string | null;
  ownerId: string | null;
  population: number;
  workers: number;
  focus: ResourceKey;
  production: Resources;
  stocks: Resources;
  targetStocks: Resources;
  garrison: number;
  fortification: number;
  stability: number;
}

export interface Personality {
  ambition: number;
  aggression: number;
  caution: number;
  loyalty: number;
  curiosity: number;
  commerce: number;
}

export interface CharacterSkills {
  strategy: number;
  leadership: number;
  navigation: number;
  trade: number;
}

export interface CharacterAttributes {
  power: number;
  speed: number;
  endurance: number;
  resilience: number;
}

export interface TroopGroup {
  count: number;
  experience: number;
  discipline: number;
}

export interface TravelState {
  fromId: string;
  toId: string;
  totalTicks: number;
  remainingTicks: number;
}

export interface Character {
  id: string;
  name: string;
  archetype: string;
  factionId: string | null;
  locationId: string | null;
  travel: TravelState | null;
  money: number;
  cargo: Resources;
  health: number;
  morale: number;
  sailors: number;
  troops: TroopGroup;
  attributes: CharacterAttributes;
  skills: CharacterSkills;
  personality: Personality;
  currentGoal: string;
  lastDecisionTick: number;
  lastBattleTick: number;
  victories: number;
  defeats: number;
}

export interface WorldState {
  version: 1;
  scenario: string;
  seed: number;
  rngState: number;
  tick: number;
  ticksPerDay: number;
  nextEventSequence: number;
  factions: Record<string, Faction>;
  settlements: Record<string, Settlement>;
  characters: Record<string, Character>;
}

export interface DecisionCandidate {
  action: string;
  score: number;
  reason: string;
  targetId?: string;
  resource?: ResourceKey;
}

export interface SimEvent {
  sequence: number;
  tick: number;
  type: string;
  actorId?: string;
  targetId?: string;
  settlementId?: string;
  data: Record<string, unknown>;
}

export interface EventDraft {
  type: string;
  actorId?: string;
  targetId?: string;
  settlementId?: string;
  data: Record<string, unknown>;
}

export interface TickResult {
  state: WorldState;
  events: SimEvent[];
}

export const RESOURCE_KEYS: ResourceKey[] = [
  "provisions",
  "arms",
  "medicine",
  "shipMaterials",
];

export function emptyResources(): Resources {
  return { provisions: 0, arms: 0, medicine: 0, shipMaterials: 0 };
}
