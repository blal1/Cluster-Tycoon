/**
 * Cluster Tycoon - Core Type Definitions
 */

export type NodeKind = 'entry' | 'loadbalancer' | 'server' | 'database' | 'storage' | 'cache';

export type NodeStatus = 'nominal' | 'warning' | 'critical' | 'offline' | 'meltdown';

export type IncidentKind = 'ddos' | 'hardware_failure' | 'storage_threshold' | 'traffic_spike' | 'cache_stampede';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type GameDifficulty = 'easy' | 'normal' | 'hard' | 'endless';

export type AppScreen = 'menu' | 'playing' | 'settings' | 'tutorial' | 'gameover';

export interface Point2D {
  x: number;
  y: number;
}

export interface NodeTemplate {
  kind: NodeKind;
  label: string;
  short: string;
  description: string;
  costUsd: number;
  hourlyUsd: number;
  cpuCores: number;
  ramGb: number;
  storageGb: number;
  capacityRps: number;
  maxUpgrades: number;
  upgradeFactor: number;
  upgradeCostUsd: number;
  accentVar: string;
  glyph: string;
}

export interface ClusterNode {
  id: string;
  kind: NodeKind;
  pos: Point2D;
  name: string;
  cpuCores: number;
  cpuUtilization: number;
  cpuTier: number;
  ramGb: number;
  ramUsedGb: number;
  ramTier: number;
  storageGb: number;
  storageUsedGb: number;
  sharding: boolean;
  replication: number;
  capacityRps: number;
  currentRps: number;
  status: NodeStatus;
  latencyMs: number;
  repairSeconds: number;
  meltdownSeconds: number;
  shielded: boolean;
  autoReboot: boolean;
  createdAtMs: number;
}

export interface ClusterEdge {
  id: string;
  fromId: string;
  toId: string;
  throughputRps: number;
  load: number;
  latencyMs: number;
}

export interface Incident {
  id: string;
  kind: IncidentKind;
  nodeId: string | null;
  title: string;
  detail: string;
  startedAtMs: number;
  secondsRemaining: number;
  severity: IncidentSeverity;
  acknowledged: boolean;
}

export interface BillLineItem {
  service: string;
  detail: string;
  amountUsd: number;
}

export interface MonthlyBill {
  id: string;
  issuedAtMs: number;
  periodStartMs: number;
  periodEndMs: number;
  lineItems: BillLineItem[];
  totalUsd: number;
  cashOnHandUsd: number;
  unpaid: boolean;
}

export interface EconomyState {
  cashUsd: number;
  totalRevenueUsd: number;
  totalSpendUsd: number;
  accruedCostUsd: number;
  revenuePerRpsUsd: number;
  secondsToBill: number;
  cycleBaseInboundRps: number;
  lastBill: MonthlyBill | null;
  billsPaid: number;
  pendingBill: MonthlyBill | null;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export type BuildTool =
  | { kind: 'select' }
  | { kind: 'connect' }
  | { kind: NodeKind };

export interface SimulationState {
  elapsedMs: number;
  speed: number; // 0 = pause, 1 = normal, 2 = fast, 4 = hyper
  difficulty: GameDifficulty;
  nodes: Record<string, ClusterNode>;
  edges: Record<string, ClusterEdge>;
  nodeOrder: string[];
  incidents: Record<string, Incident>;
  incidentOrder: string[];
  economy: EconomyState;
  selectedNodeId: string | null;
  activeTool: BuildTool;
  inboundRps: number;
  servedRps: number;
  droppedRps: number;
  camera: CameraState;
  gameOver: boolean;
  gameOverReason: string | null;
  meltdownCount: number;
  peakServedRps: number;
}

export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  musicVolume: number;
  vibrationEnabled: boolean;
  crtScanlines: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReaderAnnouncements: boolean;
  speechSynthesisEnabled: boolean;
  soundBeaconOnSelect: boolean;
}

export interface AppState {
  screen: AppScreen;
  returnScreen: AppScreen;
  sim: SimulationState;
  settings: GameSettings;
  hasSave: boolean;
  revision: number;
}

export type GameAction =
  | { type: 'screen'; screen: AppScreen; returnScreen?: AppScreen }
  | { type: 'openSettings' }
  | { type: 'openManual' }
  | { type: 'startNewCluster'; difficulty?: GameDifficulty }
  | { type: 'exit' }
  | { type: 'setTool'; tool: BuildTool }
  | { type: 'selectNode'; nodeId: string | null }
  | { type: 'placeNode'; kind: NodeKind; pos: Point2D }
  | { type: 'moveNode'; nodeId: string; pos: Point2D }
  | { type: 'deleteNode'; nodeId: string }
  | { type: 'deleteEdge'; edgeId: string }
  | { type: 'connectNodes'; fromId: string; toId: string }
  | { type: 'scaleVertical'; nodeId: string }
  | { type: 'upgradeCpu'; nodeId: string }
  | { type: 'upgradeRam'; nodeId: string }
  | { type: 'upgradeStorage'; nodeId: string }
  | { type: 'toggleSharding'; nodeId: string }
  | { type: 'addReplication'; nodeId: string }
  | { type: 'addServerBehind'; nodeId: string }
  | { type: 'toggleShield'; nodeId: string }
  | { type: 'toggleAutoReboot'; nodeId: string }
  | { type: 'setSpeed'; speed: number }
  | { type: 'togglePause' }
  | { type: 'setCamera'; camera: Partial<CameraState> }
  | { type: 'dismissIncident'; incidentId: string }
  | { type: 'payBill'; billId: string }
  | { type: 'defaultBill'; billId: string }
  | { type: 'updateSettings'; patch: Partial<GameSettings> }
  | { type: 'resetData' }
  | { type: 'resetSimulation' };
