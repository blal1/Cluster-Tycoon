import { NodeKind, NodeTemplate, GameDifficulty } from '../types/game';

export const BILLING_CYCLE_SECONDS = 180;
export const BASE_REVENUE_PER_RPS = 0.0042;
export const INITIAL_START_CASH: Record<GameDifficulty, number> = {
  easy: 3600,
  normal: 2400,
  hard: 1200,
  endless: 5000,
};

export const NODE_TEMPLATES: Record<NodeKind, NodeTemplate> = {
  entry: {
    kind: 'entry',
    label: 'Entry Point',
    short: 'ENTRY',
    description: 'Public internet ingress point. Generates inbound web and API request load from worldwide clients.',
    costUsd: 0,
    hourlyUsd: 0,
    cpuCores: 0,
    ramGb: 0,
    storageGb: 0,
    capacityRps: 0,
    maxUpgrades: 0,
    upgradeFactor: 1,
    upgradeCostUsd: 0,
    accentVar: 'var(--ct-cyan)',
    glyph: 'IN',
  },
  loadbalancer: {
    kind: 'loadbalancer',
    label: 'Load Balancer',
    short: 'LB',
    description: 'High-availability Application Load Balancer. Distributes requests evenly across downstream nodes.',
    costUsd: 240,
    hourlyUsd: 0.92,
    cpuCores: 2,
    ramGb: 4,
    storageGb: 0,
    capacityRps: 900,
    maxUpgrades: 4,
    upgradeFactor: 1.5,
    upgradeCostUsd: 180,
    accentVar: 'var(--ct-deck)',
    glyph: 'LB',
  },
  server: {
    kind: 'server',
    label: 'App Server',
    short: 'SRV',
    description: 'EC2 application worker. Processes requests. Saturating CPU (>100%) triggers thermal meltdown and downtime.',
    costUsd: 180,
    hourlyUsd: 0.41,
    cpuCores: 4,
    ramGb: 8,
    storageGb: 0,
    capacityRps: 220,
    maxUpgrades: 5,
    upgradeFactor: 1.5,
    upgradeCostUsd: 140,
    accentVar: 'var(--ct-green)',
    glyph: 'SRV',
  },
  cache: {
    kind: 'cache',
    label: 'In-Memory Cache',
    short: 'REDIS',
    description: 'In-memory Redis/Memcached cluster. Intercepts frequent queries, reducing load on backend databases by 60%.',
    costUsd: 150,
    hourlyUsd: 0.35,
    cpuCores: 2,
    ramGb: 8,
    storageGb: 0,
    capacityRps: 800,
    maxUpgrades: 4,
    upgradeFactor: 1.5,
    upgradeCostUsd: 120,
    accentVar: 'var(--ct-gold)',
    glyph: 'MEM',
  },
  database: {
    kind: 'database',
    label: 'Managed Database',
    short: 'DB',
    description: 'Durable relational SQL / document store. Consumes persistent disk and IOPS on transaction execution.',
    costUsd: 420,
    hourlyUsd: 1.35,
    cpuCores: 4,
    ramGb: 16,
    storageGb: 100,
    capacityRps: 340,
    maxUpgrades: 5,
    upgradeFactor: 1.5,
    upgradeCostUsd: 260,
    accentVar: 'var(--ct-amber)',
    glyph: 'DB',
  },
  storage: {
    kind: 'storage',
    label: 'Object Storage',
    short: 'S3',
    description: 'Cloud object bucket (S3 compatible). Retains static assets and backups. Billed per GB stored; alerts at 80% capacity.',
    costUsd: 90,
    hourlyUsd: 0.021,
    cpuCores: 0,
    ramGb: 0,
    storageGb: 500,
    capacityRps: 1200,
    maxUpgrades: 6,
    upgradeFactor: 2,
    upgradeCostUsd: 60,
    accentVar: 'var(--ct-violet)',
    glyph: 'S3',
  },
};

export const NODE_DIMENSIONS: Record<NodeKind, { w: number; h: number }> = {
  entry: { w: 116, h: 60 },
  loadbalancer: { w: 152, h: 76 },
  server: { w: 152, h: 76 },
  cache: { w: 140, h: 70 },
  database: { w: 140, h: 70 },
  storage: { w: 144, h: 66 },
};

export const GRID_CELL = 40;
export const GRID_MAJOR = 200;
export const SNAP_STEP = 20;

export const DEFAULT_SETTINGS = {
  masterVolume: 0.85,
  sfxVolume: 0.9,
  musicEnabled: true,
  musicVolume: 0.7,
  vibrationEnabled: true,
  crtScanlines: true,
  highContrast: false,
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return '$0.00';
  return currencyFormatter.format(amount);
}

export function formatCompactNumber(val: number): string {
  return compactFormatter.format(val);
}

export function formatRps(rps: number): string {
  const abs = Math.abs(rps);
  if (abs >= 1_000_000) return `${decimalFormatter.format(rps / 1_000_000)}M rps`;
  if (abs >= 1_000) return `${decimalFormatter.format(rps / 1_000)}K rps`;
  return `${compactFormatter.format(rps)} rps`;
}

export function formatGb(gb: number): string {
  if (gb >= 1024) return `${decimalFormatter.format(gb / 1024)} TB`;
  return `${compactFormatter.format(gb)} GB`;
}

export function formatPercent(ratio: number, decimals: number = 0): string {
  return `${(Math.max(0, ratio) * 100).toFixed(decimals)}%`;
}

export function formatSecondsTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const min = Math.floor(s / 60);
  const remSec = s % 60;
  return `${min.toString().padStart(2, '0')}:${remSec.toString().padStart(2, '0')}`;
}

export function spokenCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return 'zero dollars';
  const rounded = Math.round(amount);
  const abs = Math.abs(rounded);
  const label = abs === 1 ? '1 dollar' : `${compactFormatter.format(abs)} dollars`;
  return rounded < 0 ? `minus ${label}` : label;
}

export const MAX_HARDWARE_TIER = 4;

export const CPU_TIER_CONFIG = [
  { tier: 0, name: 'Stock Silicon (x86)', badge: 'GEN-1', color: 'var(--ct-green-dim)' },
  { tier: 1, name: 'Dual Xeon v2', badge: 'GEN-2', color: 'var(--ct-green)' },
  { tier: 2, name: 'EPYC Multi-Die', badge: 'GEN-3', color: 'var(--ct-cyan)' },
  { tier: 3, name: 'HyperThread Array', badge: 'GEN-4', color: 'var(--ct-deck-hot)' },
  { tier: 4, name: 'Quantum Core Matrix', badge: 'QUANTUM', color: 'var(--ct-gold-hot)' },
];

export const RAM_TIER_CONFIG = [
  { tier: 0, name: 'Standard DDR4', slots: 1, color: 'var(--ct-text-muted)' },
  { tier: 1, name: 'Dual-Channel ECC', slots: 2, color: 'var(--ct-cyan)' },
  { tier: 2, name: 'Quad-Bank DDR5', slots: 3, color: 'var(--ct-green)' },
  { tier: 3, name: 'Octa-Channel Enterprise', slots: 4, color: 'var(--ct-deck-hot)' },
  { tier: 4, name: 'Optane Ultra-Cache', slots: 4, color: 'var(--ct-gold)' },
];

export function getCpuUpgradeCost(node: { kind: NodeKind; cpuTier?: number }): number {
  const tmpl = NODE_TEMPLATES[node.kind];
  if (tmpl.maxUpgrades === 0) return 0;
  const currentTier = node.cpuTier ?? 0;
  if (currentTier >= MAX_HARDWARE_TIER) return 0;
  const base = Math.max(50, Math.round(tmpl.upgradeCostUsd * 0.55));
  return Math.round(base * Math.pow(1.5, currentTier));
}

export function getRamUpgradeCost(node: { kind: NodeKind; ramTier?: number }): number {
  const tmpl = NODE_TEMPLATES[node.kind];
  if (tmpl.maxUpgrades === 0 || tmpl.ramGb === 0) return 0;
  const currentTier = node.ramTier ?? 0;
  if (currentTier >= MAX_HARDWARE_TIER) return 0;
  const base = Math.max(40, Math.round(tmpl.upgradeCostUsd * 0.45));
  return Math.round(base * Math.pow(1.4, currentTier));
}

