import {
  Incident,
  IncidentKind,
  IncidentSeverity,
  ClusterNode,
  SimulationState,
  IncidentHistoryEntry,
} from '../types/game';

export interface IncidentTemplate {
  kind: IncidentKind;
  title: string;
  shortDesc: string;
  detailedDesc: string;
  severity: IncidentSeverity;
  baseDurationSec: number;
  mitigationAction: string;
  mitigationCostUsd: number;
  trafficMultiplier?: number;
  icon: string;
  accentColor: string;
}

export const INCIDENT_CATALOG: Record<IncidentKind, IncidentTemplate> = {
  power_fluctuation: {
    kind: 'power_fluctuation',
    title: 'Rack PDU Power Fluctuation',
    shortDesc: 'Intermittent brownout outages cycling across rack power rails.',
    detailedDesc:
      'A faulty Power Distribution Unit (PDU) in datacenter Zone 2 is experiencing voltage drops and transformer arc faults. Affected nodes flap between offline and recovering every 3 seconds, dropping transit packets and causing severe latency spikes.',
    severity: 'high',
    baseDurationSec: 28,
    mitigationAction: 'Deploy Redundant UPS Power Rail',
    mitigationCostUsd: 160,
    icon: '⚡',
    accentColor: 'var(--ct-amber)',
  },
  ddos_spike: {
    kind: 'ddos_spike',
    title: 'Volumetric Layer-7 DDoS Spike',
    shortDesc: 'Multi-gigabit botnet synthetic request surge targeting cluster ingress.',
    detailedDesc:
      'A coordinated botnet flood is driving massive synthetic HTTP request spikes (4.5x baseline) against your public entry point. Without AWS Shield scrubbing, downstream load balancers and servers saturate 100% CPU, triggering dropped requests and cascading thermal meltdowns.',
    severity: 'critical',
    baseDurationSec: 24,
    trafficMultiplier: 4.5,
    mitigationAction: 'Engage AWS Shield Scrubbing',
    mitigationCostUsd: 220,
    icon: '🌊',
    accentColor: 'var(--ct-red)',
  },
  memory_leak: {
    kind: 'memory_leak',
    title: 'Unbounded Heap Memory Leak',
    shortDesc: 'Runaway worker processes exhausting RAM toward OOM termination.',
    detailedDesc:
      'An uncollected closure in application query workers is leaking heap memory continuously. RAM utilization climbs uncontrollably toward 100%, causing page thrashing and triggering Linux Out-Of-Memory (OOM) killer terminations.',
    severity: 'medium',
    baseDurationSec: 30,
    mitigationAction: 'Trigger Fast Graceful Process Recycle',
    mitigationCostUsd: 80,
    icon: '💾',
    accentColor: 'var(--ct-gold)',
  },
  hardware_failure: {
    kind: 'hardware_failure',
    title: 'Hardware Node Outage',
    shortDesc: 'Fatal hardware panic requiring field repair or live migration.',
    detailedDesc:
      'A physical ECC memory fault or mother-board PCIe bridge failure has caused a kernel panic on a compute node. The instance is completely down until maintenance finishes or a live migration is executed.',
    severity: 'critical',
    baseDurationSec: 20,
    mitigationAction: 'Live-Migrate to Hot Standby Node',
    mitigationCostUsd: 120,
    icon: '🔨',
    accentColor: 'var(--ct-red)',
  },
  storage_threshold: {
    kind: 'storage_threshold',
    title: 'S3 Object Storage Quota Spill',
    shortDesc: 'Rapid storage accumulation approaching 80% quota limits.',
    detailedDesc:
      'Uncompressed log archives and database transaction dumps are filling object bucket storage rapidly. If capacity hits 100%, write requests will be rejected with HTTP 507 Insufficient Storage.',
    severity: 'low',
    baseDurationSec: 25,
    mitigationAction: 'Apply S3 Lifecycle Archive Rule',
    mitigationCostUsd: 50,
    icon: '📦',
    accentColor: 'var(--ct-violet)',
  },
  traffic_spike: {
    kind: 'traffic_spike',
    title: 'Viral Demand Surge',
    shortDesc: 'Sudden legitimate user influx following product launch feature.',
    detailedDesc:
      'Your platform was highlighted on the front page of TechCrunch and Hacker News! Legitimate client demand surges by +50%, offering higher revenue opportunities if your cluster can handle the load.',
    severity: 'low',
    baseDurationSec: 20,
    trafficMultiplier: 1.5,
    mitigationAction: 'Auto-Provision Burstable Capacity',
    mitigationCostUsd: 90,
    icon: '🚀',
    accentColor: 'var(--ct-cyan)',
  },
  ddos: {
    kind: 'ddos',
    title: 'Layer-7 SYN Flood',
    shortDesc: 'Classic SYN flood attack putting sustained pressure on frontends.',
    detailedDesc:
      'Malicious actors are attempting to exhaust TCP connection tables with half-open handshakes.',
    severity: 'high',
    baseDurationSec: 22,
    trafficMultiplier: 2.0,
    mitigationAction: 'Deploy SYN Cookie Ingress Filter',
    mitigationCostUsd: 140,
    icon: '🛡️',
    accentColor: 'var(--ct-red)',
  },
  cache_stampede: {
    kind: 'cache_stampede',
    title: 'Dogpile Cache Stampede',
    shortDesc: 'Simultaneous cache key expirations blasting backend databases.',
    detailedDesc:
      'Key TTL synchronization led to thousands of concurrent database reads bypassing the cache layer, spiking DB latency.',
    severity: 'medium',
    baseDurationSec: 20,
    mitigationAction: 'Re-warm Cache & Enable Probabilistic Early Expiration',
    mitigationCostUsd: 75,
    icon: '⚡',
    accentColor: 'var(--ct-amber)',
  },
};

/**
 * Creates an incident instance given its kind, targeting appropriate nodes
 */
export function createIncidentInstance(
  kind: IncidentKind,
  sim: SimulationState,
  targetNodeId?: string,
  generateIdFn?: (p: string) => string
): Incident | null {
  const tmpl = INCIDENT_CATALOG[kind] || INCIDENT_CATALOG.hardware_failure;
  const genId = generateIdFn || ((p: string) => `${p}_${Date.now().toString(36)}`);

  let chosenNodeId: string | null = targetNodeId ?? null;
  let affectedNodeIds: string[] = [];

  const eligibleNodes = Object.values(sim.nodes).filter(
    (n) => n.kind !== 'entry' && n.status !== 'meltdown'
  );

  if (kind === 'power_fluctuation') {
    // Pick 1 to 3 non-entry nodes to suffer intermittent brownouts
    if (chosenNodeId && sim.nodes[chosenNodeId]) {
      affectedNodeIds = [chosenNodeId];
    } else {
      const candidates = eligibleNodes.length > 0 ? eligibleNodes : Object.values(sim.nodes);
      if (candidates.length === 0) return null;
      // Shuffle and pick up to 2-3
      const shuffled = [...candidates].sort(() => Math.random() - 0.5);
      affectedNodeIds = shuffled.slice(0, Math.min(3, Math.max(1, Math.floor(candidates.length / 2)))).map((n) => n.id);
      chosenNodeId = affectedNodeIds[0];
    }
  } else if (kind === 'ddos_spike' || kind === 'ddos' || kind === 'traffic_spike') {
    // Ingress targets
    const entry = Object.values(sim.nodes).find((n) => n.kind === 'entry');
    chosenNodeId = entry?.id ?? null;
    affectedNodeIds = chosenNodeId ? [chosenNodeId] : [];
  } else if (kind === 'memory_leak') {
    const servers = eligibleNodes.filter((n) => n.kind === 'server');
    const pick = servers.length > 0 ? servers[Math.floor(Math.random() * servers.length)] : eligibleNodes[0];
    if (!pick) return null;
    chosenNodeId = targetNodeId ?? pick.id;
    affectedNodeIds = [chosenNodeId];
  } else if (kind === 'storage_threshold') {
    const s3 = Object.values(sim.nodes).find((n) => n.kind === 'storage') || eligibleNodes[0];
    if (!s3) return null;
    chosenNodeId = targetNodeId ?? s3.id;
    affectedNodeIds = [chosenNodeId];
  } else {
    // Hardware failure / default
    if (!chosenNodeId) {
      const pick = eligibleNodes[Math.floor(Math.random() * eligibleNodes.length)];
      if (!pick) return null;
      chosenNodeId = pick.id;
    }
    affectedNodeIds = [chosenNodeId];
  }

  const nodeName = chosenNodeId && sim.nodes[chosenNodeId] ? sim.nodes[chosenNodeId].name : 'Cluster';
  const detail =
    kind === 'power_fluctuation'
      ? `${affectedNodeIds.map((id) => sim.nodes[id]?.name || id).join(', ')} cycling brownouts due to PDU transformer fluctuation.`
      : kind === 'ddos_spike'
      ? `Synthetic traffic surging by +${Math.round((tmpl.trafficMultiplier! - 1) * 100)}% on ingress ${nodeName}.`
      : `${nodeName}: ${tmpl.shortDesc}`;

  return {
    id: genId('inc'),
    kind,
    nodeId: chosenNodeId,
    affectedNodeIds,
    title: tmpl.title,
    detail,
    startedAtMs: sim.elapsedMs,
    secondsRemaining: tmpl.baseDurationSec,
    totalDurationSec: tmpl.baseDurationSec,
    severity: tmpl.severity,
    acknowledged: false,
    trafficMultiplier: tmpl.trafficMultiplier ?? 1.0,
    flappingState: kind === 'power_fluctuation' ? 'offline' : 'nominal',
    flappingTimerSec: kind === 'power_fluctuation' ? 2.5 : 0,
    mitigationAction: tmpl.mitigationAction,
    mitigationCostUsd: tmpl.mitigationCostUsd,
  };
}

/**
 * Evaluates active incidents during each simulation tick:
 * - Updates flapping state for power fluctuations
 * - Handles intermittent brownout on affected cluster nodes
 * - Applies memory leak growth
 * - Computes combined traffic multipliers
 */
export function tickIncidentGenerator(
  sim: SimulationState,
  dt: number,
  generateIdFn: (p: string) => string
): {
  updatedIncidents: Record<string, Incident>;
  updatedIncidentOrder: string[];
  newResolvedHistory: IncidentHistoryEntry[];
  powerSparkTriggered: boolean;
  ddosSpikeActive: boolean;
  effectiveTrafficMultiplier: number;
} {
  const updatedIncidents: Record<string, Incident> = {};
  const updatedIncidentOrder: string[] = [];
  const newResolvedHistory: IncidentHistoryEntry[] = [];
  let powerSparkTriggered = false;
  let ddosSpikeActive = false;
  let effectiveTrafficMultiplier = 1.0;

  for (const incId of sim.incidentOrder) {
    const inc = sim.incidents[incId];
    if (!inc) continue;

    const remaining = inc.secondsRemaining - dt;

    if (remaining <= 0) {
      // Incident naturally expired
      newResolvedHistory.push({
        id: inc.id,
        kind: inc.kind,
        title: inc.title,
        resolvedAtMs: sim.elapsedMs,
        durationSec: Math.round(inc.totalDurationSec),
        mitigationUsed: 'SOP Wait & Automatic Recovery',
        severity: inc.severity,
      });
      continue;
    }

    const updatedInc: Incident = {
      ...inc,
      secondsRemaining: remaining,
    };

    // 1. Power Fluctuation intermittent flapping logic
    if (inc.kind === 'power_fluctuation') {
      let timer = (inc.flappingTimerSec ?? 2.5) - dt;
      let currentState = inc.flappingState ?? 'offline';

      if (timer <= 0) {
        // Toggle flapping state: offline (power drop) <-> recovering (brownout jitter)
        currentState = currentState === 'offline' ? 'recovering' : 'offline';
        timer = 2.2 + Math.random() * 1.4; // 2.2 - 3.6s cycle
        powerSparkTriggered = true;
      }

      updatedInc.flappingState = currentState;
      updatedInc.flappingTimerSec = timer;
    }

    // 2. DDoS Spike multiplier calculation
    if (inc.kind === 'ddos_spike') {
      ddosSpikeActive = true;
      const entryNode = Object.values(sim.nodes).find((n) => n.kind === 'entry');
      // If user shielded the entry node, mitigate 70% of the attack!
      const shieldFactor = entryNode?.shielded ? 0.3 : 1.0;
      const rawMultiplier = inc.trafficMultiplier ?? 4.5;
      const netMultiplier = 1.0 + (rawMultiplier - 1.0) * shieldFactor;
      effectiveTrafficMultiplier = Math.max(effectiveTrafficMultiplier, netMultiplier);
    } else if (inc.kind === 'ddos') {
      const entryNode = Object.values(sim.nodes).find((n) => n.kind === 'entry');
      const shieldFactor = entryNode?.shielded ? 0.4 : 1.0;
      effectiveTrafficMultiplier = Math.max(effectiveTrafficMultiplier, 1.0 + 1.0 * shieldFactor);
    } else if (inc.kind === 'traffic_spike') {
      effectiveTrafficMultiplier = Math.max(effectiveTrafficMultiplier, 1.5);
    }

    updatedIncidents[incId] = updatedInc;
    updatedIncidentOrder.push(incId);
  }

  return {
    updatedIncidents,
    updatedIncidentOrder,
    newResolvedHistory,
    powerSparkTriggered,
    ddosSpikeActive,
    effectiveTrafficMultiplier,
  };
}

/**
 * Calculates Cluster Resilience & Reliability Metrics
 */
export function calculateResilienceMetrics(sim: SimulationState): {
  resilienceScore: number; // 0 - 100
  availabilityPercent: number; // 99.x%
  mtbfSeconds: number; // Mean Time Between Failures
  activeIncidentCount: number;
  totalIncidentsResolved: number;
} {
  const elapsedSec = Math.max(1, sim.elapsedMs / 1000);
  const totalIncidents = (sim.incidentHistory?.length ?? 0) + sim.incidentOrder.length;
  const mtbfSeconds = totalIncidents > 0 ? Math.round(elapsedSec / totalIncidents) : Math.round(elapsedSec);

  // Uptime / availability estimation
  const totalNodes = Object.keys(sim.nodes).length;
  const degradedNodes = Object.values(sim.nodes).filter(
    (n) => n.status === 'offline' || n.status === 'meltdown' || n.powerFluctuating
  ).length;

  const nodeAvailabilityRatio = totalNodes > 0 ? 1 - degradedNodes / totalNodes : 1;
  const dropPenalty = sim.inboundRps > 0 ? Math.min(0.2, sim.droppedRps / sim.inboundRps) : 0;
  const rawAvailability = Math.max(0.95, (nodeAvailabilityRatio * 0.999 - dropPenalty));
  const availabilityPercent = Math.min(99.99, Math.max(88.0, rawAvailability * 100));

  // Resilience score: based on redundancy, shielding, autoReboot, and MTBF
  let resilienceScore = 50;
  if (sim.incidentOrder.length === 0) resilienceScore += 15;
  if (sim.economy.cashUsd >= 2000) resilienceScore += 10;
  const shieldedEntry = Object.values(sim.nodes).some((n) => n.kind === 'entry' && n.shielded);
  if (shieldedEntry) resilienceScore += 10;
  const replicatedDb = Object.values(sim.nodes).some((n) => n.kind === 'database' && n.replication > 1);
  if (replicatedDb) resilienceScore += 8;
  const hasCache = Object.values(sim.nodes).some((n) => n.kind === 'cache');
  if (hasCache) resilienceScore += 7;

  resilienceScore = Math.min(100, Math.max(10, resilienceScore));

  return {
    resilienceScore,
    availabilityPercent: Math.round(availabilityPercent * 10) / 10,
    mtbfSeconds,
    activeIncidentCount: sim.incidentOrder.length,
    totalIncidentsResolved: sim.incidentHistory?.length ?? 0,
  };
}
