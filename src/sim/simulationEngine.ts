import {
  SimulationState,
  ClusterNode,
  ClusterEdge,
  Incident,
  MonthlyBill,
  BillLineItem,
  NodeKind,
  GameDifficulty,
  CloudRegionId,
  GeoDnsMode,
} from '../types/game';
import {
  BILLING_CYCLE_SECONDS,
  BASE_REVENUE_PER_RPS,
  NODE_TEMPLATES,
  INITIAL_START_CASH,
  getRegionForPosition,
  getAvailabilityZoneForPosition,
  getCrossRegionLatency,
} from '../constants/gameConfig';
import {
  createIncidentInstance,
  tickIncidentGenerator,
} from './incidentGenerator';
import { audio } from '../audio/proceduralAudio';

let idCounter = 0;
export function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter.toString(36)}`;
}

export function setIdCounter(val: number) {
  idCounter = val;
}

export function getIdCounter(): number {
  return idCounter;
}

export function createNode(
  kind: NodeKind,
  pos: { x: number; y: number },
  name: string,
  createdAtMs: number
): ClusterNode {
  const tmpl = NODE_TEMPLATES[kind];
  const region = getRegionForPosition(pos.x);
  const availabilityZone = getAvailabilityZoneForPosition(pos);
  return {
    id: generateId(kind.slice(0, 3)),
    kind,
    pos,
    name,
    cpuCores: tmpl.cpuCores,
    cpuUtilization: 0,
    cpuTier: 0,
    ramGb: tmpl.ramGb,
    ramUsedGb: 0,
    ramTier: 0,
    storageGb: tmpl.storageGb,
    storageUsedGb: 0,
    sharding: false,
    replication: 1,
    capacityRps: tmpl.capacityRps,
    currentRps: 0,
    status: 'nominal',
    latencyMs: 1.5,
    repairSeconds: 0,
    meltdownSeconds: 0,
    shielded: false,
    autoReboot: true,
    region,
    availabilityZone,
    geoDnsMode: kind === 'entry' ? 'failover' : undefined,
    createdAtMs,
  };
}

export function createEdge(
  fromId: string,
  toId: string,
  nodes?: Record<string, ClusterNode>
): ClusterEdge {
  let isCrossRegion = false;
  let crossRegionLatencyMs = 0;
  if (nodes && nodes[fromId] && nodes[toId]) {
    const fromRegion = nodes[fromId].region ?? getRegionForPosition(nodes[fromId].pos.x);
    const toRegion = nodes[toId].region ?? getRegionForPosition(nodes[toId].pos.x);
    isCrossRegion = fromRegion !== toRegion;
    crossRegionLatencyMs = isCrossRegion ? getCrossRegionLatency(fromRegion, toRegion) : 0;
  }
  return {
    id: generateId('edg'),
    fromId,
    toId,
    throughputRps: 0,
    load: 0,
    latencyMs: isCrossRegion ? crossRegionLatencyMs : 1.5,
    isCrossRegion,
    crossRegionLatencyMs,
    severed: false,
  };
}

export function createInitialSimulation(difficulty: GameDifficulty = 'normal'): SimulationState {
  const initialCash = INITIAL_START_CASH[difficulty];

  const ingress = createNode('entry', { x: -260, y: 0 }, 'ingress-01', 0);
  const alb = createNode('loadbalancer', { x: 40, y: 0 }, 'alb-public', 0);
  const srvA = createNode('server', { x: 340, y: -110 }, 'app-node-a', 0);
  const srvB = createNode('server', { x: 340, y: 110 }, 'app-node-b', 0);

  const nodes: Record<string, ClusterNode> = {
    [ingress.id]: ingress,
    [alb.id]: alb,
    [srvA.id]: srvA,
    [srvB.id]: srvB,
  };

  const edge1 = createEdge(ingress.id, alb.id, nodes);
  const edge2 = createEdge(alb.id, srvA.id, nodes);
  const edge3 = createEdge(alb.id, srvB.id, nodes);

  const edges: Record<string, ClusterEdge> = {
    [edge1.id]: edge1,
    [edge2.id]: edge2,
    [edge3.id]: edge3,
  };

  return {
    elapsedMs: 0,
    speed: 1,
    difficulty,
    nodes,
    edges,
    nodeOrder: [ingress.id, alb.id, srvA.id, srvB.id],
    incidents: {},
    incidentOrder: [],
    economy: {
      cashUsd: initialCash,
      totalRevenueUsd: 0,
      totalSpendUsd: 0,
      accruedCostUsd: 0,
      revenuePerRpsUsd: BASE_REVENUE_PER_RPS,
      secondsToBill: BILLING_CYCLE_SECONDS,
      cycleBaseInboundRps: 0,
      lastBill: null,
      billsPaid: 0,
      pendingBill: null,
    },
    selectedNodeId: null,
    activeTool: { kind: 'select' },
    inboundRps: 0,
    servedRps: 0,
    droppedRps: 0,
    networkLatencyMs: 6.8,
    clusterHops: 2,
    geoDnsMode: 'failover',
    crossRegionRps: 0,
    activeFailover: false,
    failoverSourceRegion: null,
    failoverTargetRegion: null,
    regionalRps: { 'us-east-1': 0, 'eu-west-1': 0, 'ap-southeast-1': 0 },
    regionalHealth: { 'us-east-1': 'nominal', 'eu-west-1': 'nominal', 'ap-southeast-1': 'nominal' },
    camera: { x: 40, y: 0, zoom: 1 },
    gameOver: false,
    gameOverReason: null,
    meltdownCount: 0,
    peakServedRps: 0,
    chaosMode: false,
    chaosIntervalSec: 75,
    nextChaosSec: 75,
    incidentHistory: [],
  };
}

// Pseudo-random wave for organic internet traffic fluctuations
function trafficWave(seconds: number): number {
  return (
    Math.sin(seconds / 9.3) * 0.55 +
    Math.sin(seconds / 3.1) * 0.3 +
    Math.sin(seconds / 1.7) * 0.15
  );
}

function lerp(current: number, target: number, rate: number, dt: number): number {
  const factor = 1 - Math.exp(-rate * dt);
  return current + (target - current) * factor;
}

function clampVal(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// Build adjacency list
function buildAdjacency(
  nodes: Record<string, ClusterNode>,
  edges: Record<string, ClusterEdge>
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const id of Object.keys(nodes)) {
    map.set(id, []);
  }
  for (const edge of Object.values(edges)) {
    const list = map.get(edge.fromId);
    if (list) list.push(edge.toId);
  }
  return map;
}

// Topological ordering
function topologicalOrder(
  nodeOrder: string[],
  nodes: Record<string, ClusterNode>,
  adjacency: Map<string, string[]>
): string[] {
  const inDegree = new Map<string, number>();
  for (const id of nodeOrder) inDegree.set(id, 0);

  for (const targets of adjacency.values()) {
    for (const target of targets) {
      inDegree.set(target, (inDegree.get(target) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const id of nodeOrder) {
    if ((inDegree.get(id) || 0) === 0) queue.push(id);
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (nodes[curr]) {
      result.push(curr);
      for (const next of adjacency.get(curr) || []) {
        if (!nodes[next]) continue;
        const remaining = (inDegree.get(next) || 0) - 1;
        inDegree.set(next, remaining);
        if (remaining === 0) queue.push(next);
      }
    }
  }

  // Include any remaining disconnected nodes
  for (const id of nodeOrder) {
    if (!result.includes(id)) result.push(id);
  }

  return result;
}

// Dynamically calculates cluster network latency based on active nodes and connection hops
export function computeClusterTopologyLatency(
  nodes: Record<string, ClusterNode>,
  edges: Record<string, ClusterEdge>,
  inboundRps: number = 0,
  droppedRps: number = 0
): { latencyMs: number; activeNodes: number; maxHops: number; avgHops: number } {
  const nodeList = Object.values(nodes);
  if (nodeList.length === 0) {
    return { latencyMs: 0, activeNodes: 0, maxHops: 0, avgHops: 0 };
  }

  // Active nodes currently operational
  const activeNodes = nodeList.filter(
    (n) => n.status !== 'offline' && n.status !== 'meltdown' && n.repairSeconds <= 0 && n.meltdownSeconds <= 0
  );
  const activeCount = activeNodes.length;

  if (activeCount === 0) {
    return { latencyMs: 999, activeNodes: 0, maxHops: 0, avgHops: 0 };
  }

  // Build adjacency and compute shortest hops from entry nodes
  const edgeList = Object.values(edges);
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of nodeList) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }

  for (const e of edgeList) {
    if (nodes[e.fromId] && nodes[e.toId]) {
      adj.get(e.fromId)?.push(e.toId);
      inDegree.set(e.toId, (inDegree.get(e.toId) || 0) + 1);
    }
  }

  let roots = nodeList.filter((n) => n.kind === 'entry');
  if (roots.length === 0) {
    roots = nodeList.filter((n) => (inDegree.get(n.id) || 0) === 0);
  }
  if (roots.length === 0) {
    roots = [nodeList[0]];
  }

  // Breadth-first search from ingress roots to find connection hops
  const hopMap = new Map<string, number>();
  const queue: string[] = [];

  for (const r of roots) {
    hopMap.set(r.id, 0);
    queue.push(r.id);
  }

  while (queue.length > 0) {
    const currId = queue.shift()!;
    const currHops = hopMap.get(currId) || 0;
    const targets = adj.get(currId) || [];
    for (const targetId of targets) {
      if (!hopMap.has(targetId)) {
        hopMap.set(targetId, currHops + 1);
        queue.push(targetId);
      }
    }
  }

  // Calculate maximum and average connection hops across active nodes
  const activeHopValues: number[] = [];
  let maxHops = 0;
  for (const n of activeNodes) {
    const hops = hopMap.get(n.id);
    if (hops !== undefined) {
      activeHopValues.push(hops);
      if (hops > maxHops) maxHops = hops;
    }
  }

  const avgHops =
    activeHopValues.length > 0
      ? activeHopValues.reduce((a, b) => a + b, 0) / activeHopValues.length
      : 0;

  // Base VPC transit: 1.2 ms
  // Per connection hop switching & serialization delay: 2.2 ms per hop
  // Active node mesh & distributed routing overhead: 0.35 ms per active node
  const baseTransitMs = 1.2;
  const hopOverheadMs = avgHops * 2.2;
  const activeScaleMs = activeCount * 0.35;

  // Processing queue latency across active nodes on path
  const avgNodeProcessingMs =
    activeNodes.reduce((acc, n) => acc + (Number.isFinite(n.latencyMs) ? n.latencyMs : 1.5), 0) /
    activeCount;

  // Congestion & TCP retransmission penalty if packets are dropped
  const dropRatio = inboundRps > 0 ? clampVal(droppedRps / inboundRps, 0, 1) : 0;
  const dropPenaltyMs = dropRatio * 45;

  // Cross-region physical optical transit delay (e.g. +72ms transatlantic, +118ms Eurasia)
  let crossRegionTransitPenalty = 0;
  for (const edge of edgeList) {
    const fn = nodes[edge.fromId];
    const tn = nodes[edge.toId];
    if (fn && tn && fn.region && tn.region && fn.region !== tn.region) {
      let delay = edge.crossRegionLatencyMs || getCrossRegionLatency(fn.region, tn.region);
      if (edge.severed) delay += 350; // Undersea fiber cut satellite latency
      if (delay > crossRegionTransitPenalty) crossRegionTransitPenalty = delay;
    }
  }

  const totalLatencyMs = Math.round((baseTransitMs + hopOverheadMs + activeScaleMs + avgNodeProcessingMs + dropPenaltyMs + crossRegionTransitPenalty) * 10) / 10;

  return {
    latencyMs: totalLatencyMs,
    activeNodes: activeCount,
    maxHops,
    avgHops: Math.round(avgHops * 10) / 10,
  };
}

// Generate itemized AWS invoice
export function generateMonthlyBill(
  sim: SimulationState,
  nodes: Record<string, ClusterNode>,
  periodStartMs: number,
  periodEndMs: number
): MonthlyBill {
  const lineItems: BillLineItem[] = [];

  const serviceCategories = [
    { service: 'Application Load Balancer', kinds: ['loadbalancer'] },
    { service: 'EC2 - Compute Engine Instances', kinds: ['server'] },
    { service: 'ElastiCache - Redis Cluster', kinds: ['cache'] },
    { service: 'RDS - Managed Database Service', kinds: ['database'] },
    { service: 'S3 - Simple Storage Service', kinds: ['storage'] },
  ];

  for (const cat of serviceCategories) {
    let cost = 0;
    let units = 0;
    for (const node of Object.values(nodes)) {
      if (!cat.kinds.includes(node.kind)) continue;
      const tmpl = NODE_TEMPLATES[node.kind];
      cost += tmpl.hourlyUsd;
      units += 1;
    }
    if (units > 0) {
      lineItems.push({
        service: cat.service,
        detail: `${units} provisioned resource${units === 1 ? '' : 's'} (${(BILLING_CYCLE_SECONDS / 60).toFixed(0)}m cycle)`,
        amountUsd: Math.round(cost * 100) / 100,
      });
    }
  }

  // Storage usage cost
  let totalStorageUsedGb = 0;
  for (const node of Object.values(nodes)) {
    if (node.storageGb > 0) totalStorageUsedGb += node.storageUsedGb;
  }
  if (totalStorageUsedGb > 0) {
    lineItems.push({
      service: 'Cloud Storage & IOPS Retention',
      detail: `${totalStorageUsedGb.toFixed(1)} GB retained data`,
      amountUsd: Math.round(totalStorageUsedGb * 0.023 * 100) / 100,
    });
  }

  const subtotal = lineItems.reduce((acc, item) => acc + item.amountUsd, 0);

  // AWS Free Tier Credit
  const freeTierCredit = Math.min(4.5, Math.round(subtotal * 0.25 * 100) / 100);
  if (freeTierCredit > 0) {
    lineItems.push({
      service: 'AWS Free Tier Discount',
      detail: 'Standard introductory monthly discount',
      amountUsd: -freeTierCredit,
    });
  }

  const total = Math.max(0, Math.round(lineItems.reduce((acc, item) => acc + item.amountUsd, 0) * 100) / 100);

  return {
    id: generateId('inv'),
    issuedAtMs: sim.elapsedMs,
    periodStartMs,
    periodEndMs,
    lineItems,
    totalUsd: total,
    cashOnHandUsd: Math.round(sim.economy.cashUsd * 100) / 100,
    unpaid: true,
  };
}

// Single step of simulation
export function stepSimulation(sim: SimulationState, dt: number): SimulationState {
  if (sim.gameOver || sim.economy.pendingBill !== null) return sim;

  const newElapsedMs = sim.elapsedMs + dt * 1000;
  const elapsedSec = newElapsedMs / 1000;

  // 1. Tick Incident Generator for active incidents and brownout states
  const {
    updatedIncidents,
    updatedIncidentOrder,
    newResolvedHistory,
    powerSparkTriggered,
    effectiveTrafficMultiplier,
  } = tickIncidentGenerator(sim, dt, generateId);

  if (powerSparkTriggered) {
    audio.playPowerSpark();
  }

  // Clone nodes and edges
  const newNodes: Record<string, ClusterNode> = {};
  for (const id of sim.nodeOrder) {
    const node = sim.nodes[id];
    if (node) {
      newNodes[id] = { ...node, powerFluctuating: false };
    }
  }

  const newEdges: Record<string, ClusterEdge> = {};
  for (const id of Object.keys(sim.edges)) {
    const edge = sim.edges[id];
    if (edge) newEdges[id] = { ...edge };
  }

  // Apply Power Fluctuation intermittent brownouts and Memory Leaks
  for (const inc of Object.values(updatedIncidents)) {
    if (inc.kind === 'power_fluctuation') {
      const targets =
        inc.affectedNodeIds && inc.affectedNodeIds.length > 0
          ? inc.affectedNodeIds
          : inc.nodeId
          ? [inc.nodeId]
          : [];
      for (const targetId of targets) {
        const victim = newNodes[targetId];
        if (victim) {
          victim.powerFluctuating = true;
          if (inc.flappingState === 'offline') {
            victim.status = 'offline';
            victim.repairSeconds = Math.max(victim.repairSeconds, 0.5);
          } else {
            victim.status = 'warning';
          }
        }
      }
    } else if (inc.kind === 'regional_blackout' && inc.targetRegion) {
      // Complete regional substation failure: knocks out all compute & storage nodes in targetRegion
      for (const n of Object.values(newNodes)) {
        if (n.region === inc.targetRegion && n.kind !== 'entry') {
          n.status = 'offline';
          n.repairSeconds = Math.max(n.repairSeconds, 1.0);
          n.currentRps = 0;
        }
      }
    } else if (inc.kind === 'fiber_cut') {
      // Undersea optical fiber cut: mark cross-region edges severed
      for (const edge of Object.values(newEdges)) {
        const fn = newNodes[edge.fromId];
        const tn = newNodes[edge.toId];
        if (fn && tn && fn.region && tn.region && fn.region !== tn.region) {
          edge.severed = true;
          edge.crossRegionLatencyMs = (getCrossRegionLatency(fn.region, tn.region) || 72) + 350;
        }
      }
    } else if (inc.kind === 'memory_leak' && inc.nodeId) {
      const leakNode = newNodes[inc.nodeId];
      if (leakNode && leakNode.ramGb > 0) {
        leakNode.ramUsedGb = clampVal(
          leakNode.ramUsedGb + leakNode.ramGb * 0.08 * dt,
          0,
          leakNode.ramGb
        );
        if (leakNode.ramUsedGb >= leakNode.ramGb * 0.98 && leakNode.repairSeconds <= 0) {
          leakNode.repairSeconds = 6;
          leakNode.status = 'offline';
          leakNode.ramUsedGb = leakNode.ramGb * 0.2;
        }
      }
    }
  }

  // Update cross-region statuses on edges
  for (const edge of Object.values(newEdges)) {
    const fn = newNodes[edge.fromId];
    const tn = newNodes[edge.toId];
    if (fn && tn) {
      const isCross = (fn.region || 'eu-west-1') !== (tn.region || 'eu-west-1');
      edge.isCrossRegion = isCross;
      if (!edge.severed) {
        edge.crossRegionLatencyMs = isCross ? getCrossRegionLatency(fn.region, tn.region) : 0;
      }
    }
  }

  // Calculate inbound target traffic (surged heavily during DDoS spike)
  const wave = trafficWave(elapsedSec);
  const cycleProgress = clampVal(1 - sim.economy.secondsToBill / BILLING_CYCLE_SECONDS, 0, 1);
  const diffMultiplier = sim.difficulty === 'easy' ? 0.35 : sim.difficulty === 'hard' ? 0.8 : 0.55;
  const growth = 1 + diffMultiplier * cycleProgress;

  const baseTraffic =
    sim.economy.cycleBaseInboundRps > 0 ? sim.economy.cycleBaseInboundRps : Math.max(12, sim.inboundRps);
  const targetInbound = Math.max(
    8,
    baseTraffic * growth * effectiveTrafficMultiplier + wave * baseTraffic * 0.2
  );
  const smoothedInbound = Math.max(8, lerp(sim.inboundRps, targetInbound, 0.4, dt));

  // Forward request allocation map
  const inboundMap = new Map<string, number>();
  for (const id of sim.nodeOrder) inboundMap.set(id, 0);

  const adjacency = buildAdjacency(newNodes, newEdges);
  const topoNodes = topologicalOrder(sim.nodeOrder, newNodes, adjacency);

  let totalServedRps = 0;
  let totalDroppedRps = 0;
  let newMeltdownEvents = 0;
  let activeFailover = false;
  let failoverSourceRegion: CloudRegionId | null = null;
  let failoverTargetRegion: CloudRegionId | null = null;
  const hasStorageThreshold = Object.values(updatedIncidents).some((inc) => inc.kind === 'storage_threshold');

  // Process nodes in topological order
  for (const nodeId of topoNodes) {
    const node = newNodes[nodeId];
    if (!node) continue;

    const offeredRps = inboundMap.get(nodeId) ?? 0;

    // Entry point: acts as traffic generator
    if (node.kind === 'entry') {
      node.currentRps = smoothedInbound;
      node.status = 'nominal';
      node.cpuUtilization = 0;
      node.ramUsedGb = 0;
      node.latencyMs = 0.5;

      // Distribute to downstream nodes via GeoDNS
      const geoResult = distributeDownstream(
        node,
        smoothedInbound,
        inboundMap,
        adjacency,
        newNodes,
        node.geoDnsMode || sim.geoDnsMode || 'failover'
      );
      if (geoResult.activeFailover) {
        activeFailover = true;
        failoverSourceRegion = geoResult.failoverSource;
        failoverTargetRegion = geoResult.failoverTarget;
      }
      continue;
    }

    // Object Storage (S3): accumulates data, doesn't execute compute
    if (node.kind === 'storage') {
      const growthRateGb = (smoothedInbound * 0.02 * 0.35 * dt * (hasStorageThreshold ? 2.5 : 1.0)) / 1024;
      node.storageUsedGb = clampVal(node.storageUsedGb + growthRateGb, 0, node.storageGb);
      node.currentRps = Math.min(offeredRps, node.capacityRps);
      node.cpuUtilization = 0;
      node.ramUsedGb = 0;
      node.latencyMs = 1.5;

      const fillRatio = node.storageGb > 0 ? node.storageUsedGb / node.storageGb : 0;
      node.status = fillRatio >= 0.95 ? 'critical' : fillRatio >= 0.8 ? 'warning' : 'nominal';
      continue;
    }

    // In-Memory Cache (Redis): serves high RPS, absorbs load
    if (node.kind === 'cache') {
      if (node.meltdownSeconds > 0 || node.repairSeconds > 0) {
        totalDroppedRps += offeredRps;
        node.currentRps = 0;
        node.latencyMs = Infinity;
        node.status = node.meltdownSeconds > 0 ? 'meltdown' : 'offline';
        continue;
      }

      const served = Math.min(offeredRps, node.capacityRps);
      const dropped = offeredRps - served;
      totalDroppedRps += dropped;

      node.currentRps = served;
      const targetCpu = clampVal(served / Math.max(1, node.capacityRps), 0, 1.2);
      node.cpuUtilization = lerp(node.cpuUtilization, targetCpu, 3.0, dt);
      node.ramUsedGb = lerp(node.ramUsedGb, node.ramGb * (0.2 + node.cpuUtilization * 0.7), 2.0, dt);
      node.latencyMs = 0.8 + node.cpuUtilization * 1.5;

      node.status = node.cpuUtilization >= 1.0 ? 'critical' : node.cpuUtilization >= 0.75 ? 'warning' : 'nominal';
      distributeDownstream(node, served, inboundMap, adjacency, newNodes);
      continue;
    }

    // Compute nodes (server, loadbalancer, database)
    const isDown = node.meltdownSeconds > 0 || node.repairSeconds > 0;
    if (isDown) {
      totalDroppedRps += offeredRps;
      node.currentRps = 0;
      node.latencyMs = Infinity;
      node.status = node.meltdownSeconds > 0 ? 'meltdown' : 'offline';
      continue;
    }

    // Capacity & drop check
    const served = Math.min(offeredRps, node.capacityRps);
    const dropped = offeredRps - served;
    totalDroppedRps += dropped;

    // CPU modeling
    const effectiveCores = Math.max(0.001, node.cpuCores);
    const activeLoad = served * (1 / 55);
    const idleBaseline = effectiveCores * 0.08;
    const targetUtil = (activeLoad + idleBaseline) / effectiveCores;
    const cpuRate = targetUtil > node.cpuUtilization ? 2.6 : 1.8;
    const newCpu = lerp(node.cpuUtilization, targetUtil, cpuRate, dt);

    // RAM modeling
    const targetRam = clampVal(
      node.ramGb * (0.12 + newCpu * 0.6) + (served * 0.02) / 1024,
      0,
      node.ramGb
    );
    const newRam = lerp(node.ramUsedGb, targetRam, 2.0, dt);

    // Database disk growth
    if (node.kind === 'database') {
      const dbGrowth = (served * 0.02 * 3.2 * dt) / 1024;
      node.storageUsedGb = clampVal(node.storageUsedGb + dbGrowth, 0, node.storageGb);
    }

    // Latency modeling
    const headroom = Math.max(0.04, 1 - newCpu);
    const latency = 1.5 + 1.4 / headroom + (served / Math.max(1, node.capacityRps)) * 2.2;

    node.currentRps = served;
    node.cpuUtilization = newCpu;
    node.ramUsedGb = newRam;
    node.latencyMs = latency;

    // Check status
    if (newCpu >= 1.0) {
      node.status = 'critical';
    } else if (newCpu >= 0.75 || (node.ramGb > 0 && newRam / node.ramGb >= 0.8)) {
      node.status = 'warning';
    } else {
      node.status = 'nominal';
    }

    if (node.kind === 'server') {
      totalServedRps += served;
    }

    // Forward downstream
    distributeDownstream(node, served, inboundMap, adjacency, newNodes);
  }

  // Meltdown & auto-repair tick
  for (const nodeId of topoNodes) {
    const node = newNodes[nodeId];
    if (!node) continue;

    // Trigger meltdown if CPU pushed past 100%
    if (node.cpuUtilization >= 1.0 && node.meltdownSeconds <= 0) {
      node.meltdownSeconds = 20;
      newMeltdownEvents += 1;
    }

    if (node.meltdownSeconds > 0) {
      node.meltdownSeconds = Math.max(0, node.meltdownSeconds - dt);
      node.cpuUtilization = Math.max(0, node.cpuUtilization - 0.6 * dt);
      node.currentRps = 0;
      node.status = 'meltdown';
      if (node.meltdownSeconds === 0) {
        node.cpuUtilization = 0.2;
        node.status = 'nominal';
      }
    }

    if (node.repairSeconds > 0) {
      node.repairSeconds = Math.max(0, node.repairSeconds - dt);
      node.status = 'offline';
      if (node.repairSeconds === 0) {
        node.status = 'nominal';
      }
    }
  }

  // Update edges throughput, load, and latency
  for (const edge of Object.values(newEdges)) {
    const fromNode = newNodes[edge.fromId];
    const toNode = newNodes[edge.toId];
    if (!fromNode || !toNode) continue;

    const flow = Math.min(fromNode.currentRps, toNode.currentRps > 0 ? toNode.currentRps : fromNode.currentRps);
    edge.throughputRps = flow;
    const capacity = toNode.capacityRps > 0 ? toNode.capacityRps : fromNode.capacityRps;
    edge.load = capacity > 0 ? clampVal(flow / capacity, 0, 1) : 0;
    const edgeLatency = fromNode.latencyMs + toNode.latencyMs;
    edge.latencyMs = Number.isFinite(edgeLatency) ? edgeLatency : Infinity;
  }

  // Process and expire incidents via incidentGenerator
  const newIncidents: Record<string, Incident> = { ...updatedIncidents };
  const newIncidentOrder: string[] = [...updatedIncidentOrder];
  let nextChaosSec = sim.nextChaosSec ?? 75;

  // 1. Chaos Mode: automated chaos monkey testing
  if (sim.chaosMode) {
    nextChaosSec -= dt;
    if (nextChaosSec <= 0 && newIncidentOrder.length === 0) {
      nextChaosSec = sim.chaosIntervalSec || 75;
      const chaosKinds: Incident['kind'][] = [
        'power_fluctuation',
        'ddos_spike',
        'memory_leak',
        'hardware_failure',
        'traffic_spike',
      ];
      const pickedKind = chaosKinds[Math.floor(Math.random() * chaosKinds.length)];
      const chaosInc = createIncidentInstance(
        pickedKind,
        { ...sim, nodes: newNodes },
        undefined,
        generateId
      );
      if (chaosInc) {
        newIncidents[chaosInc.id] = chaosInc;
        newIncidentOrder.push(chaosInc.id);
        if (chaosInc.kind === 'ddos_spike') {
          audio.playDdosAlarm();
        } else if (chaosInc.kind === 'power_fluctuation') {
          audio.playPowerSpark();
        } else {
          audio.playIncidentAlert();
        }
      }
    }
  } else {
    // 2. Standard scheduled incident generation (including Power Fluctuation and DDoS Spike)
    const minTimeForIncidents = sim.difficulty === 'easy' ? 360 : sim.difficulty === 'hard' ? 180 : 240;
    if (elapsedSec >= minTimeForIncidents && newIncidentOrder.length === 0) {
      const cycleInterval = sim.difficulty === 'easy' ? 180 : sim.difficulty === 'hard' ? 120 : 150;
      const prevBucket = Math.floor((sim.elapsedMs / 1000 - minTimeForIncidents) / cycleInterval);
      const currBucket = Math.floor((newElapsedMs / 1000 - minTimeForIncidents) / cycleInterval);

      if (currBucket > prevBucket) {
        const candidates: Incident['kind'][] = [
          'power_fluctuation',
          'ddos_spike',
          'hardware_failure',
          'memory_leak',
          'traffic_spike',
          'storage_threshold',
        ];
        const pickedKind = candidates[Math.floor(Math.random() * candidates.length)];
        const newInc = createIncidentInstance(
          pickedKind,
          { ...sim, nodes: newNodes },
          undefined,
          generateId
        );
        if (newInc) {
          if (newInc.kind === 'hardware_failure' && newInc.nodeId) {
            const failNode = newNodes[newInc.nodeId];
            if (failNode) {
              failNode.repairSeconds = 15;
              failNode.status = 'offline';
              failNode.currentRps = 0;
            }
          }
          newIncidents[newInc.id] = newInc;
          newIncidentOrder.push(newInc.id);
          if (newInc.kind === 'ddos_spike') {
            audio.playDdosAlarm();
          } else if (newInc.kind === 'power_fluctuation') {
            audio.playPowerSpark();
          } else {
            audio.playIncidentAlert();
          }
        }
      }
    }
  }

  const updatedHistory = [...(sim.incidentHistory || []), ...newResolvedHistory].slice(-30);

  // Financial calculations
  const totalHourlyCost = Object.values(newNodes).reduce(
    (acc, n) => acc + NODE_TEMPLATES[n.kind].hourlyUsd,
    0
  );
  const costThisTick = totalHourlyCost * (dt / 3600);
  const revenueThisTick = totalServedRps * sim.economy.revenuePerRpsUsd * dt;

  let newCash = sim.economy.cashUsd + revenueThisTick - costThisTick;
  let newSecondsToBill = sim.economy.secondsToBill - dt;
  let pendingBill: MonthlyBill | null = sim.economy.pendingBill;

  // Bill generation when countdown reaches 0
  if (newSecondsToBill <= 0) {
    newSecondsToBill += BILLING_CYCLE_SECONDS;
    const periodStart = sim.elapsedMs - BILLING_CYCLE_SECONDS * 1000;
    pendingBill = generateMonthlyBill(
      { ...sim, elapsedMs: newElapsedMs, economy: { ...sim.economy, cashUsd: newCash } },
      newNodes,
      periodStart,
      newElapsedMs
    );
  }

  // Win / Loss evaluation
  let gameOver = false;
  let gameOverReason = sim.gameOverReason;

  if (sim.difficulty !== 'endless') {
    if (sim.economy.billsPaid >= 10) {
      gameOver = true;
      gameOverReason = 'mastered';
    } else if (newCash >= 25000) {
      gameOver = true;
      gameOverReason = 'acquired';
    }
  }

  // Dynamic network latency and connection hops computation
  const topologyMetrics = computeClusterTopologyLatency(
    newNodes,
    newEdges,
    smoothedInbound,
    totalDroppedRps
  );

  // Regional metrics and health
  const regionalRps: Record<CloudRegionId, number> = {
    'us-east-1': 0,
    'eu-west-1': 0,
    'ap-southeast-1': 0,
  };
  let crossRegionRps = 0;

  for (const node of Object.values(newNodes)) {
    if (node.region && node.currentRps > 0) {
      regionalRps[node.region] = (regionalRps[node.region] || 0) + node.currentRps;
    }
  }

  for (const edge of Object.values(newEdges)) {
    if (edge.isCrossRegion && edge.throughputRps > 0) {
      crossRegionRps += edge.throughputRps;
    }
  }

  const blackoutRegion = Object.values(updatedIncidents).find(
    (inc) => inc.kind === 'regional_blackout'
  )?.targetRegion;

  const regionalHealth: Record<CloudRegionId, 'nominal' | 'degraded' | 'blackout'> = {
    'us-east-1': blackoutRegion === 'us-east-1' ? 'blackout' : 'nominal',
    'eu-west-1': blackoutRegion === 'eu-west-1' ? 'blackout' : 'nominal',
    'ap-southeast-1': blackoutRegion === 'ap-southeast-1' ? 'blackout' : 'nominal',
  };

  for (const reg of ['us-east-1', 'eu-west-1', 'ap-southeast-1'] as CloudRegionId[]) {
    if (regionalHealth[reg] === 'blackout') continue;
    const regNodes = Object.values(newNodes).filter((n) => n.region === reg && n.kind !== 'entry');
    if (regNodes.length > 0) {
      const hasIssues = regNodes.some((n) => n.status === 'offline' || n.status === 'meltdown' || n.status === 'critical');
      if (hasIssues) regionalHealth[reg] = 'degraded';
    }
  }

  return {
    ...sim,
    elapsedMs: newElapsedMs,
    nodes: newNodes,
    edges: newEdges,
    incidents: newIncidents,
    incidentOrder: newIncidentOrder,
    inboundRps: smoothedInbound,
    servedRps: totalServedRps,
    droppedRps: totalDroppedRps,
    networkLatencyMs: topologyMetrics.latencyMs,
    clusterHops: topologyMetrics.maxHops,
    geoDnsMode: sim.geoDnsMode ?? 'failover',
    crossRegionRps,
    activeFailover,
    failoverSourceRegion,
    failoverTargetRegion,
    regionalRps,
    regionalHealth,
    gameOver,
    gameOverReason,
    meltdownCount: sim.meltdownCount + newMeltdownEvents,
    peakServedRps: Math.max(sim.peakServedRps, totalServedRps),
    chaosMode: sim.chaosMode ?? false,
    chaosIntervalSec: sim.chaosIntervalSec ?? 75,
    nextChaosSec,
    incidentHistory: updatedHistory,
    economy: {
      ...sim.economy,
      cashUsd: newCash,
      totalRevenueUsd: sim.economy.totalRevenueUsd + revenueThisTick,
      totalSpendUsd: sim.economy.totalSpendUsd + costThisTick,
      accruedCostUsd: sim.economy.accruedCostUsd + costThisTick,
      secondsToBill: newSecondsToBill,
      cycleBaseInboundRps: sim.economy.cycleBaseInboundRps > 0 ? sim.economy.cycleBaseInboundRps : smoothedInbound,
      pendingBill,
    },
  };
}

function distributeDownstream(
  source: ClusterNode,
  amount: number,
  inboundMap: Map<string, number>,
  adjacency: Map<string, string[]>,
  nodes: Record<string, ClusterNode>,
  geoDnsMode: GeoDnsMode = 'failover'
): { activeFailover: boolean; failoverSource: CloudRegionId | null; failoverTarget: CloudRegionId | null } {
  const downstream = adjacency.get(source.id) || [];
  if (amount <= 0 || downstream.length === 0) {
    return { activeFailover: false, failoverSource: null, failoverTarget: null };
  }

  const validDownstream = downstream.filter((id) => !!nodes[id]);
  if (validDownstream.length === 0) {
    return { activeFailover: false, failoverSource: null, failoverTarget: null };
  }

  let activeFailover = false;
  let failoverSource: CloudRegionId | null = null;
  let failoverTarget: CloudRegionId | null = null;

  if (source.kind === 'entry') {
    // Geo-DNS Anycast Routing
    const regionalTargets: Record<CloudRegionId, string[]> = {
      'us-east-1': [],
      'eu-west-1': [],
      'ap-southeast-1': [],
    };
    for (const tid of validDownstream) {
      const reg = nodes[tid].region;
      if (reg) regionalTargets[reg].push(tid);
    }

    const healthyTargets = validDownstream.filter((id) => {
      const n = nodes[id];
      return n.status !== 'offline' && n.status !== 'meltdown';
    });

    const unhealthyTargets = validDownstream.filter((id) => {
      const n = nodes[id];
      return n.status === 'offline' || n.status === 'meltdown';
    });

    if (geoDnsMode === 'failover' && healthyTargets.length > 0 && unhealthyTargets.length > 0) {
      activeFailover = true;
      failoverSource = nodes[unhealthyTargets[0]].region;
      failoverTarget = nodes[healthyTargets[0]].region;
      const perTarget = amount / healthyTargets.length;
      for (const targetId of healthyTargets) {
        inboundMap.set(targetId, (inboundMap.get(targetId) || 0) + perTarget);
      }
      return { activeFailover, failoverSource, failoverTarget };
    }

    if (geoDnsMode === 'proximity') {
      const weights: Record<CloudRegionId, number> = {
        'us-east-1': 0.4,
        'eu-west-1': 0.35,
        'ap-southeast-1': 0.25,
      };
      const activeRegions = (Object.keys(regionalTargets) as CloudRegionId[]).filter(
        (r) => regionalTargets[r].length > 0
      );
      if (activeRegions.length > 0) {
        const totalWeight = activeRegions.reduce((sum, r) => sum + weights[r], 0);
        for (const reg of activeRegions) {
          const regShare = (weights[reg] / totalWeight) * amount;
          const regTargets = regionalTargets[reg];
          const perNode = regShare / regTargets.length;
          for (const tid of regTargets) {
            inboundMap.set(tid, (inboundMap.get(tid) || 0) + perNode);
          }
        }
        return { activeFailover, failoverSource, failoverTarget };
      }
    }
  }

  // Standard round-robin distribution
  const perTarget = amount / validDownstream.length;
  for (const targetId of validDownstream) {
    inboundMap.set(targetId, (inboundMap.get(targetId) || 0) + perTarget);
  }
  return { activeFailover, failoverSource, failoverTarget };
}
