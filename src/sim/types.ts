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
  surrender: {
    offeredToId: string;
    offeredTick: number;
    previousFactionId: string;
  } | null;
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

export type GoalKind =
  | "material-security"
  | "build-wealth"
  | "build-power"
  | "serve-faction"
  | "explore-world"
  | "expand-influence"
  | "recover-strength";

export interface CharacterGoal {
  id: string;
  kind: GoalKind;
  label: string;
  priority: number;
  progress: number;
  status: "active" | "satisfied" | "abandoned";
  origin: string;
  createdTick: number;
}

export interface CharacterPlan {
  id: string;
  goalId: string;
  intent: string;
  preferredActions: string[];
  targetId?: string;
  createdTick: number;
  reviewAfterTick: number;
  reason: string;
  orderId?: string;
}

export interface Relationship {
  characterId: string;
  trust: number;
  affinity: number;
  respect: number;
  fear: number;
  grievance: number;
  obligation: number;
  lastChangedTick: number;
}

export interface SettlementKnowledge {
  settlementId: string;
  observedTick: number;
  confidence: number;
  factionId: string | null;
  garrisonEstimate: number;
  stocksEstimate: Resources;
  priceEstimate: Resources;
  source: "direct" | "faction-report" | "rumor";
}

export type OrderDirective = "protect" | "pressure" | "trade-supplies" | "explore";

export interface StandingOrder {
  id: string;
  issuerId: string;
  directive: OrderDirective;
  targetId?: string;
  priority: number;
  issuedTick: number;
  expiresTick: number | null;
}

export type CharacterController =
  | { kind: "autonomous" }
  | { kind: "human"; playerId: string };

export interface Player {
  id: string;
  displayName: string;
  characterId: string;
  knownCharacterIds: string[];
  conversationTagScores: Record<string, number>;
}

export type ConversationKind = "direct" | "group";

export type MessageTag =
  | "urgent"
  | "trade"
  | "political"
  | "threat"
  | "request"
  | "supportive"
  | "hostile"
  | "manipulation-attempt"
  | "spam";

export interface ConversationThread {
  id: string;
  kind: ConversationKind;
  title: string;
  participantIds: string[];
  createdById: string;
  createdTick: number;
  lastMessageTick: number | null;
}

export interface ConversationMessage {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdTick: number;
  source: "human" | "autonomous";
  tags: MessageTag[];
  replyToId?: string;
  inferredPlayerTags?: string[];
  discardedActionCount?: number;
}

export interface ScheduledReply {
  id: string;
  threadId: string;
  characterId: string;
  triggerMessageId: string;
  createdTick: number;
  dueTick: number;
  status: "pending" | "responded";
  respondedTick?: number;
}

export type PlayerAction =
  | "travel"
  | "buy-provisions"
  | "trade-local"
  | "work"
  | "recruit"
  | "raid"
  | "claim-settlement"
  | "rest";

export type PlayerCommand =
  | {
      id: string;
      playerId: string;
      issuedTick: number;
      type: "character-action";
      action: PlayerAction;
      targetId?: string;
    }
  | {
      id: string;
      playerId: string;
      issuedTick: number;
      type: "issue-order";
      characterId: string;
      directive: OrderDirective;
      targetId?: string;
      priority: number;
      expiresTick: number | null;
    };

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
  controller: CharacterController;
  goals: CharacterGoal[];
  activeGoalId: string | null;
  plan: CharacterPlan | null;
  relationships: Record<string, Relationship>;
  knowledge: Record<string, SettlementKnowledge>;
  standingOrders: StandingOrder[];
  lastPlanReviewTick: number;
  currentGoal: string;
  lastDecisionTick: number;
  lastBattleTick: number;
  victories: number;
  defeats: number;
}

export interface WorldState {
  version: 3;
  scenario: string;
  seed: number;
  rngState: number;
  tick: number;
  ticksPerDay: number;
  nextEventSequence: number;
  nextCommandSequence: number;
  nextThreadSequence: number;
  nextMessageSequence: number;
  nextReplySequence: number;
  factions: Record<string, Faction>;
  settlements: Record<string, Settlement>;
  characters: Record<string, Character>;
  players: Record<string, Player>;
  pendingCommands: PlayerCommand[];
  conversationThreads: Record<string, ConversationThread>;
  conversationMessages: ConversationMessage[];
  scheduledReplies: ScheduledReply[];
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
