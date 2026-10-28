import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import {
  AppState,
  GameAction,
  SimulationState,
  GameSettings,
  GameDifficulty,
  ClusterNode,
  ClusterEdge,
  BuildTool,
  NodeKind,
} from '../types/game';
import {
  NODE_TEMPLATES,
  DEFAULT_SETTINGS,
  BILLING_CYCLE_SECONDS,
  getCpuUpgradeCost,
  getRamUpgradeCost,
  getStorageUpgradeCost,
  getReplicationCost,
  getShardingCost,
  MAX_HARDWARE_TIER,
  getRegionForPosition,
  getAvailabilityZoneForPosition,
  getCrossRegionLatency,
} from '../constants/gameConfig';
import {
  createInitialSimulation,
  createNode,
  createEdge,
  stepSimulation,
  getIdCounter,
  setIdCounter,
  generateId,
} from '../sim/simulationEngine';
import { createIncidentInstance } from '../sim/incidentGenerator';
import { audio } from '../audio/proceduralAudio';

const SAVE_KEY = 'cluster-tycoon.save.v2';
const SETTINGS_KEY = 'cluster-tycoon.settings.v2';
const HIGHSCORE_KEY = 'cluster-tycoon.highscore.v2';

function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: GameSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function getHighScore(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(HIGHSCORE_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(score: number): number {
  const current = getHighScore();
  if (score > current) {
    try {
      localStorage.setItem(HIGHSCORE_KEY, score.toString());
    } catch {}
    return score;
  }
  return current;
}

export function calculateScore(sim: SimulationState): number {
  const elapsedSec = Math.floor(sim.elapsedMs / 1000);
  const rawScore =
    sim.economy.billsPaid * 1000 +
    Math.round(sim.peakServedRps) * 10 +
    elapsedSec * 1 -
    sim.meltdownCount * 200 -
    sim.incidentOrder.length * 50;
  return Math.max(0, rawScore);
}

function checkHasSave(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

// Initial App State
let appState: AppState = {
  screen: 'menu',
  returnScreen: 'menu',
  sim: createInitialSimulation('normal'),
  settings: loadSettings(),
  hasSave: checkHasSave(),
  revision: 0,
};

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAppState(): AppState {
  return appState;
}

// State Reducer
export function dispatch(action: GameAction) {
  const prev = appState;
  const next = reduce(prev, action);

  if (next !== prev) {
    appState = next;
    notify();
  }
}

function reduce(state: AppState, action: GameAction): AppState {
  switch (action.type) {
    case 'screen':
      return {
        ...state,
        screen: action.screen,
        returnScreen: action.returnScreen ?? (state.screen === 'playing' ? 'playing' : state.returnScreen),
        revision: state.revision + 1,
      };

    case 'openSettings':
      return {
        ...state,
        screen: 'settings',
        returnScreen: state.screen === 'playing' ? 'playing' : 'menu',
        revision: state.revision + 1,
      };

    case 'openManual':
      return {
        ...state,
        screen: 'tutorial',
        returnScreen: state.screen === 'playing' ? 'playing' : 'menu',
        revision: state.revision + 1,
      };

    case 'startNewCluster': {
      const diff = action.difficulty ?? 'normal';
      const sim = createInitialSimulation(diff);
      return {
        ...state,
        screen: 'playing',
        returnScreen: 'menu',
        sim,
        revision: state.revision + 1,
      };
    }

    case 'exit':
      return {
        ...state,
        screen: 'menu',
        returnScreen: 'menu',
        revision: state.revision + 1,
      };

    case 'setTool':
      return {
        ...state,
        sim: {
          ...state.sim,
          activeTool: action.tool,
          selectedNodeId: null,
        },
        revision: state.revision + 1,
      };

    case 'selectNode': {
      if (action.nodeId && state.sim.nodes[action.nodeId]) {
        const targetNode = state.sim.nodes[action.nodeId];
        audio.playNodeBeacon(targetNode.status);
      }
      return {
        ...state,
        sim: {
          ...state.sim,
          selectedNodeId: action.nodeId,
        },
        revision: state.revision + 1,
      };
    }

    case 'placeNode': {
      const tmpl = NODE_TEMPLATES[action.kind];
      if (state.sim.economy.cashUsd < tmpl.costUsd) {
        audio.playDenied();
        audio.triggerVibrate([20, 60, 20]);
        return state;
      }

      // Spend cost
      const newCash = state.sim.economy.cashUsd - tmpl.costUsd;
      const count = Object.values(state.sim.nodes).filter((n) => n.kind === action.kind).length + 1;
      const nodeName = `${tmpl.short.toLowerCase()}-${count.toString().padStart(2, '0')}`;
      const newNode = createNode(action.kind, action.pos, nodeName, state.sim.elapsedMs);

      audio.playDeploy();
      audio.triggerVibrate(15);

      return {
        ...state,
        sim: {
          ...state.sim,
          nodes: {
            ...state.sim.nodes,
            [newNode.id]: newNode,
          },
          nodeOrder: [...state.sim.nodeOrder, newNode.id],
          selectedNodeId: newNode.id,
          activeTool: { kind: 'select' },
          economy: {
            ...state.sim.economy,
            cashUsd: newCash,
            totalSpendUsd: state.sim.economy.totalSpendUsd + tmpl.costUsd,
          },
        },
        revision: state.revision + 1,
      };
    }

    case 'moveNode': {
      const node = state.sim.nodes[action.nodeId];
      if (!node) return state;
      const newRegion = getRegionForPosition(action.pos.x);
      const newAz = getAvailabilityZoneForPosition(action.pos);
      const updatedNode = {
        ...node,
        pos: action.pos,
        region: newRegion,
        availabilityZone: newAz,
      };

      const updatedNodes = {
        ...state.sim.nodes,
        [action.nodeId]: updatedNode,
      };

      // Recalculate cross-region status and latency on connected edges
      const updatedEdges = { ...state.sim.edges };
      for (const [eid, edge] of Object.entries(updatedEdges)) {
        if (edge.fromId === action.nodeId || edge.toId === action.nodeId) {
          const fn = updatedNodes[edge.fromId];
          const tn = updatedNodes[edge.toId];
          if (fn && tn) {
            const isCross = (fn.region || 'eu-west-1') !== (tn.region || 'eu-west-1');
            updatedEdges[eid] = {
              ...edge,
              isCrossRegion: isCross,
              crossRegionLatencyMs: isCross ? getCrossRegionLatency(fn.region, tn.region) : 0,
            };
          }
        }
      }

      return {
        ...state,
        sim: {
          ...state.sim,
          nodes: updatedNodes,
          edges: updatedEdges,
        },
        revision: state.revision + 1,
      };
    }

    case 'deleteNode': {
      const node = state.sim.nodes[action.nodeId];
      if (!node) return state;

      const remainingNodes = { ...state.sim.nodes };
      delete remainingNodes[action.nodeId];

      const remainingEdges: Record<string, ClusterEdge> = {};
      for (const [id, edge] of Object.entries(state.sim.edges)) {
        if (edge.fromId !== action.nodeId && edge.toId !== action.nodeId) {
          remainingEdges[id] = edge;
        }
      }

      audio.playDelete();
      audio.triggerVibrate(25);

      return {
        ...state,
        sim: {
          ...state.sim,
          nodes: remainingNodes,
          edges: remainingEdges,
          nodeOrder: state.sim.nodeOrder.filter((id) => id !== action.nodeId),
          selectedNodeId: state.sim.selectedNodeId === action.nodeId ? null : state.sim.selectedNodeId,
        },
        revision: state.revision + 1,
      };
    }

    case 'deleteEdge': {
      if (!state.sim.edges[action.edgeId]) return state;
      const edges = { ...state.sim.edges };
      delete edges[action.edgeId];
      audio.playDelete();
      return {
        ...state,
        sim: {
          ...state.sim,
          edges,
        },
        revision: state.revision + 1,
      };
    }

    case 'connectNodes': {
      const { fromId, toId } = action;
      if (fromId === toId) return state;
      if (!state.sim.nodes[fromId] || !state.sim.nodes[toId]) return state;

      // Check if already connected
      const exists = Object.values(state.sim.edges).some(
        (e) => e.fromId === fromId && e.toId === toId
      );
      if (exists) return state;

      // Prevent immediate cycles
      const hasCycle = checkCycle(state.sim.edges, toId, fromId);
      if (hasCycle) {
        audio.playDenied();
        return state;
      }

      const newEdge = createEdge(fromId, toId, state.sim.nodes);
      audio.playConnect();
      audio.triggerVibrate(20);

      return {
        ...state,
        sim: {
          ...state.sim,
          edges: {
            ...state.sim.edges,
            [newEdge.id]: newEdge,
          },
        },
        revision: state.revision + 1,
      };
    }

    case 'setGeoDnsMode': {
      audio.playClick();
      return {
        ...state,
        sim: {
          ...state.sim,
          geoDnsMode: action.mode,
        },
        revision: state.revision + 1,
      };
    }

    case 'upgradeCpu': {
      const node = state.sim.nodes[action.nodeId];
      if (!node) return state;
      const cost = getCpuUpgradeCost(node);
      if (cost <= 0) return state;

      if (state.sim.economy.cashUsd < cost) {
        audio.playDenied();
        audio.triggerVibrate([20, 60, 20]);
        return state;
      }

      const tmpl = NODE_TEMPLATES[node.kind];
      const nextTier = Math.min(MAX_HARDWARE_TIER, (node.cpuTier ?? 0) + 1);
      const upgradedCores = Math.max(node.cpuCores + 4, Math.round(node.cpuCores * tmpl.upgradeFactor));
      const upgradedCapacity = Math.round(node.capacityRps * 1.35);

      const upgradedNode: ClusterNode = {
        ...node,
        cpuTier: nextTier,
        cpuCores: upgradedCores,
        capacityRps: upgradedCapacity,
      };

      audio.playPaySuccess();
      audio.triggerVibrate(30);

      return {
        ...state,
        sim: {
          ...state.sim,
          nodes: {
            ...state.sim.nodes,
            [action.nodeId]: upgradedNode,
          },
          economy: {
            ...state.sim.economy,
            cashUsd: state.sim.economy.cashUsd - cost,
            totalSpendUsd: state.sim.economy.totalSpendUsd + cost,
          },
        },
        revision: state.revision + 1,
      };
    }

    case 'upgradeRam': {
      const node = state.sim.nodes[action.nodeId];
      if (!node) return state;
      const cost = getRamUpgradeCost(node);
      if (cost <= 0) return state;

      if (state.sim.economy.cashUsd < cost) {
        audio.playDenied();
        audio.triggerVibrate([20, 60, 20]);
        return state;
      }

      const nextTier = Math.min(MAX_HARDWARE_TIER, (node.ramTier ?? 0) + 1);
      const upgradedRam = Math.max(node.ramGb * 2, node.ramGb + 8);

      const upgradedNode: ClusterNode = {
        ...node,
        ramTier: nextTier,
        ramGb: upgradedRam,
      };

      audio.playPaySuccess();
      audio.triggerVibrate(30);

      return {
        ...state,
        sim: {
          ...state.sim,
          nodes: {
            ...state.sim.nodes,
            [action.nodeId]: upgradedNode,
          },
          economy: {
            ...state.sim.economy,
            cashUsd: state.sim.economy.cashUsd - cost,
            totalSpendUsd: state.sim.economy.totalSpendUsd + cost,
          },
        },
        revision: state.revision + 1,
      };
    }

    case 'scaleVertical': {
      const node = state.sim.nodes[action.nodeId];
      if (!node) return state;
      const tmpl = NODE_TEMPLATES[node.kind];
      if (tmpl.maxUpgrades === 0) return state;

      if (state.sim.economy.cashUsd < tmpl.upgradeCostUsd) {
        audio.playDenied();
        audio.triggerVibrate([20, 60, 20]);
        return state;
      }

      const upgradedNode: ClusterNode = {
        ...node,
        cpuTier: Math.min(MAX_HARDWARE_TIER, (node.cpuTier ?? 0) + 1),
        ramTier: Math.min(MAX_HARDWARE_TIER, (node.ramTier ?? 0) + 1),
        cpuCores: Math.round(node.cpuCores * tmpl.upgradeFactor),
        ramGb: Math.round(node.ramGb * tmpl.upgradeFactor),
        storageGb: node.storageGb === 0 ? 0 : Math.round(node.storageGb * tmpl.upgradeFactor),
        capacityRps: Math.round(node.capacityRps * tmpl.upgradeFactor),
      };

      audio.playPaySuccess();
      audio.triggerVibrate(30);

      return {
        ...state,
        sim: {
          ...state.sim,
          nodes: {
            ...state.sim.nodes,
            [action.nodeId]: upgradedNode,
          },
          economy: {
            ...state.sim.economy,
            cashUsd: state.sim.economy.cashUsd - tmpl.upgradeCostUsd,
            totalSpendUsd: state.sim.economy.totalSpendUsd + tmpl.upgradeCostUsd,
          },
        },
        revision: state.revision + 1,
      };
    }

    case 'upgradeStorage': {
      const node = state.sim.nodes[action.nodeId];
      if (!node) return state;
      const cost = getStorageUpgradeCost(node);
      if (cost <= 0) return state;

      if (state.sim.economy.cashUsd < cost) {
        audio.playDenied();
        audio.triggerVibrate([20, 60, 20]);
        return state;
      }

      const upgradedNode: ClusterNode = {
        ...node,
        storageGb: node.storageGb * 2,
      };

      audio.playPaySuccess();
      audio.triggerVibrate(30);

      return {
        ...state,
        sim: {
          ...state.sim,
          nodes: {
            ...state.sim.nodes,
            [action.nodeId]: upgradedNode,
          },
          economy: {
            ...state.sim.economy,
            cashUsd: state.sim.economy.cashUsd - cost,
            totalSpendUsd: state.sim.economy.totalSpendUsd + cost,
          },
        },
        revision: state.revision + 1,
      };
    }

    case 'toggleSharding': {
      const node = state.sim.nodes[action.nodeId];
      if (!node || node.sharding) return state;
      const cost = getShardingCost(node);

      if (state.sim.economy.cashUsd < cost) {
        audio.playDenied();
        audio.triggerVibrate([20, 60, 20]);
        return state;
      }

      audio.playPaySuccess();
      audio.triggerVibrate(30);

      return {
        ...state,
        sim: {
          ...state.sim,
          nodes: {
            ...state.sim.nodes,
            [action.nodeId]: {
              ...node,
              sharding: true,
            },
          },
          economy: {
            ...state.sim.economy,
            cashUsd: state.sim.economy.cashUsd - cost,
            totalSpendUsd: state.sim.economy.totalSpendUsd + cost,
          },
        },
        revision: state.revision + 1,
      };
    }

    case 'addReplication': {
      const node = state.sim.nodes[action.nodeId];
      if (!node) return state;
      const cost = getReplicationCost(node);
      if (cost <= 0) return state;

      if (state.sim.economy.cashUsd < cost) {
        audio.playDenied();
        audio.triggerVibrate([20, 60, 20]);
        return state;
      }

      audio.playPaySuccess();
      audio.triggerVibrate(30);

      return {
        ...state,
        sim: {
          ...state.sim,
          nodes: {
            ...state.sim.nodes,
            [action.nodeId]: {
              ...node,
              replication: node.replication + 1,
              capacityRps: Math.round(node.capacityRps * 1.4),
            },
          },
          economy: {
            ...state.sim.economy,
            cashUsd: state.sim.economy.cashUsd - cost,
            totalSpendUsd: state.sim.economy.totalSpendUsd + cost,
          },
        },
        revision: state.revision + 1,
      };
    }

    case 'addServerBehind': {
      const parentNode = state.sim.nodes[action.nodeId];
      if (!parentNode) return state;

      const serverTmpl = NODE_TEMPLATES.server;
      if (state.sim.economy.cashUsd < serverTmpl.costUsd) {
        audio.playDenied();
        audio.triggerVibrate([20, 60, 20]);
        return state;
      }

      // Calculate placement offset
      const newY = parentNode.pos.y + 120;
      const newX = parentNode.pos.x + 220;

      const count = Object.values(state.sim.nodes).filter((n) => n.kind === 'server').length + 1;
      const name = `app-node-${count.toString().padStart(2, '0')}`;
      const newServer = createNode('server', { x: newX, y: newY }, name, state.sim.elapsedMs);
      const newEdge = createEdge(parentNode.id, newServer.id);

      audio.playDeploy();
      audio.triggerVibrate(20);

      return {
        ...state,
        sim: {
          ...state.sim,
          nodes: {
            ...state.sim.nodes,
            [newServer.id]: newServer,
          },
          edges: {
            ...state.sim.edges,
            [newEdge.id]: newEdge,
          },
          nodeOrder: [...state.sim.nodeOrder, newServer.id],
          selectedNodeId: newServer.id,
          economy: {
            ...state.sim.economy,
            cashUsd: state.sim.economy.cashUsd - serverTmpl.costUsd,
            totalSpendUsd: state.sim.economy.totalSpendUsd + serverTmpl.costUsd,
          },
        },
        revision: state.revision + 1,
      };
    }

    case 'toggleShield': {
      const node = state.sim.nodes[action.nodeId];
      if (!node) return state;
      audio.playSelect();
      return {
        ...state,
        sim: {
          ...state.sim,
          nodes: {
            ...state.sim.nodes,
            [action.nodeId]: {
              ...node,
              shielded: !node.shielded,
            },
          },
        },
        revision: state.revision + 1,
      };
    }

    case 'toggleAutoReboot': {
      const node = state.sim.nodes[action.nodeId];
      if (!node) return state;
      audio.playClick();
      return {
        ...state,
        sim: {
          ...state.sim,
          nodes: {
            ...state.sim.nodes,
            [action.nodeId]: {
              ...node,
              autoReboot: !node.autoReboot,
            },
          },
        },
        revision: state.revision + 1,
      };
    }

    case 'setSpeed':
      audio.playClick();
      return {
        ...state,
        sim: {
          ...state.sim,
          speed: Math.max(0, action.speed),
        },
        revision: state.revision + 1,
      };

    case 'togglePause':
      audio.playClick();
      return {
        ...state,
        sim: {
          ...state.sim,
          speed: state.sim.speed === 0 ? 1 : 0,
        },
        revision: state.revision + 1,
      };

    case 'setCamera':
      return {
        ...state,
        sim: {
          ...state.sim,
          camera: {
            ...state.sim.camera,
            ...action.camera,
          },
        },
        revision: state.revision + 1,
      };

    case 'dismissIncident': {
      const inc = state.sim.incidents[action.incidentId];
      if (!inc) return state;
      audio.playClick();
      return {
        ...state,
        sim: {
          ...state.sim,
          incidents: {
            ...state.sim.incidents,
            [action.incidentId]: {
              ...inc,
              acknowledged: true,
            },
          },
        },
        revision: state.revision + 1,
      };
    }

    case 'triggerIncident': {
      const inc = createIncidentInstance(
        action.kind,
        state.sim,
        action.targetNodeId,
        generateId
      );
      if (!inc) return state;

      const newNodes = { ...state.sim.nodes };
      if (inc.kind === 'hardware_failure' && inc.nodeId) {
        const failNode = newNodes[inc.nodeId];
        if (failNode) {
          newNodes[inc.nodeId] = {
            ...failNode,
            repairSeconds: 15,
            status: 'offline',
            currentRps: 0,
          };
        }
      }

      if (inc.kind === 'ddos_spike') {
        audio.playDdosAlarm();
      } else if (inc.kind === 'power_fluctuation') {
        audio.playPowerSpark();
      } else {
        audio.playIncidentAlert();
      }
      audio.triggerVibrate([60, 40, 140]);

      return {
        ...state,
        sim: {
          ...state.sim,
          nodes: newNodes,
          incidents: {
            ...state.sim.incidents,
            [inc.id]: inc,
          },
          incidentOrder: [...state.sim.incidentOrder, inc.id],
        },
        revision: state.revision + 1,
      };
    }

    case 'mitigateIncident': {
      const inc = state.sim.incidents[action.incidentId];
      if (!inc) return state;

      const cost = inc.mitigationCostUsd ?? 80;
      if (state.sim.economy.cashUsd < cost) {
        audio.playDenied();
        return state;
      }

      const remainingIncidents = { ...state.sim.incidents };
      delete remainingIncidents[action.incidentId];
      const remainingOrder = state.sim.incidentOrder.filter((id) => id !== action.incidentId);

      const newNodes = { ...state.sim.nodes };
      const targets =
        inc.affectedNodeIds && inc.affectedNodeIds.length > 0
          ? inc.affectedNodeIds
          : inc.nodeId
          ? [inc.nodeId]
          : [];
      for (const tId of targets) {
        if (newNodes[tId]) {
          newNodes[tId] = {
            ...newNodes[tId],
            powerFluctuating: false,
            repairSeconds: 0,
            status: newNodes[tId].cpuUtilization >= 1.0 ? 'critical' : 'nominal',
          };
        }
      }

      audio.playMitigationSuccess();
      audio.triggerVibrate([40, 60, 40]);

      const historyEntry = {
        id: inc.id,
        kind: inc.kind,
        title: inc.title,
        resolvedAtMs: state.sim.elapsedMs,
        durationSec: Math.round(inc.totalDurationSec - inc.secondsRemaining),
        mitigationUsed: action.mitigationType || inc.mitigationAction || 'Manual SOP Incident Mitigation',
        severity: inc.severity,
      };

      return {
        ...state,
        sim: {
          ...state.sim,
          nodes: newNodes,
          incidents: remainingIncidents,
          incidentOrder: remainingOrder,
          incidentHistory: [...(state.sim.incidentHistory || []), historyEntry].slice(-30),
          economy: {
            ...state.sim.economy,
            cashUsd: state.sim.economy.cashUsd - cost,
            totalSpendUsd: state.sim.economy.totalSpendUsd + cost,
          },
        },
        revision: state.revision + 1,
      };
    }

    case 'toggleChaosMode': {
      const newMode = action.enabled !== undefined ? action.enabled : !state.sim.chaosMode;
      audio.playClick();
      return {
        ...state,
        sim: {
          ...state.sim,
          chaosMode: newMode,
          nextChaosSec: state.sim.chaosIntervalSec || 75,
        },
        revision: state.revision + 1,
      };
    }

    case 'setChaosInterval': {
      return {
        ...state,
        sim: {
          ...state.sim,
          chaosIntervalSec: Math.max(15, action.seconds),
        },
        revision: state.revision + 1,
      };
    }

    case 'payBill': {
      const bill = state.sim.economy.pendingBill;
      if (!bill || bill.id !== action.billId) return state;

      if (state.sim.economy.cashUsd < bill.totalUsd) {
        audio.playDenied();
        return state;
      }

      audio.playPaySuccess();
      audio.triggerVibrate([40, 60, 80]);

      return {
        ...state,
        sim: {
          ...state.sim,
          economy: {
            ...state.sim.economy,
            cashUsd: state.sim.economy.cashUsd - bill.totalUsd,
            billsPaid: state.sim.economy.billsPaid + 1,
            lastBill: { ...bill, unpaid: false },
            pendingBill: null,
          },
        },
        revision: state.revision + 1,
      };
    }

    case 'defaultBill': {
      const bill = state.sim.economy.pendingBill;
      if (!bill || bill.id !== action.billId) return state;

      audio.playMeltdown();
      audio.triggerVibrate([200, 100, 300]);

      return {
        ...state,
        sim: {
          ...state.sim,
          gameOver: true,
          gameOverReason: `AWS invoice #${bill.id} of $${bill.totalUsd.toFixed(2)} was left unpaid. The cloud provider suspended your cluster account and shut down every resource.`,
          economy: {
            ...state.sim.economy,
            lastBill: bill,
            pendingBill: null,
          },
        },
        screen: 'gameover',
        revision: state.revision + 1,
      };
    }

    case 'updateSettings': {
      const newSettings = { ...state.settings, ...action.patch };
      saveSettings(newSettings);
      audio.updateSettings(newSettings);
      return {
        ...state,
        settings: newSettings,
        revision: state.revision + 1,
      };
    }

    case 'resetData': {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem(SETTINGS_KEY);
        localStorage.removeItem(HIGHSCORE_KEY);
      }
      return {
        screen: 'menu',
        returnScreen: 'menu',
        sim: createInitialSimulation('normal'),
        settings: DEFAULT_SETTINGS,
        hasSave: false,
        revision: state.revision + 1,
      };
    }

    case 'resetSimulation':
      return {
        ...state,
        sim: createInitialSimulation(state.sim.difficulty),
        revision: state.revision + 1,
      };

    default:
      return state;
  }
}

function checkCycle(edges: Record<string, ClusterEdge>, startId: string, targetId: string): boolean {
  const visited = new Set<string>([startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const edge of Object.values(edges)) {
      if (edge.fromId === curr) {
        if (edge.toId === targetId) return true;
        if (!visited.has(edge.toId)) {
          visited.add(edge.toId);
          queue.push(edge.toId);
        }
      }
    }
  }
  return false;
}

// Save / Load system
export function saveCluster(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const payload = {
      version: 2,
      savedAtMs: Date.now(),
      idCounter: getIdCounter(),
      sim: appState.sim,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    appState = { ...appState, hasSave: true, revision: appState.revision + 1 };
    notify();
    return true;
  } catch (err) {
    console.warn('Save failed:', err);
    return false;
  }
}

export function loadCluster(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data.sim) return false;

    if (typeof data.idCounter === 'number') {
      setIdCounter(data.idCounter);
    }

    appState = {
      ...appState,
      screen: 'playing',
      sim: {
        ...data.sim,
        speed: 1,
        gameOver: false,
        gameOverReason: null,
      },
      hasSave: true,
      revision: appState.revision + 1,
    };
    notify();
    return true;
  } catch (err) {
    console.warn('Load failed:', err);
    return false;
  }
}

// Step runner loop hook
export function useSimulationRunner() {
  useEffect(() => {
    let lastTime = performance.now();
    let animId: number;

    const tick = () => {
      const now = performance.now();
      const dtMs = now - lastTime;
      lastTime = now;

      const state = appState;
      if (
        state.screen === 'playing' &&
        state.sim.speed > 0 &&
        !state.sim.gameOver &&
        state.sim.economy.pendingBill === null
      ) {
        // Clamp frame time to prevent huge delta leaps
        const dtSec = Math.min(dtMs / 1000, 0.1) * state.sim.speed;
        const newSim = stepSimulation(state.sim, dtSec);
        if (newSim !== state.sim) {
          appState = { ...state, sim: newSim, revision: state.revision + 1 };
          notify();

          // Update dynamic server rack audio
          const computeNodes = Object.values(newSim.nodes).filter(
            (n) => n.kind === 'server' || n.kind === 'database'
          );
          const avgCpu =
            computeNodes.length === 0
              ? 0
              : computeNodes.reduce((acc, n) => acc + n.cpuUtilization, 0) / computeNodes.length;
          audio.updateServerHum(avgCpu);

          // Check if game over triggered
          if (newSim.gameOver) {
            audio.stopServerHum();
            const score = calculateScore(newSim);
            saveHighScore(score);
            dispatch({ type: 'screen', screen: 'gameover' });
          }
        }
      } else {
        audio.stopServerHum();
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
      audio.stopServerHum();
    };
  }, []);
}

// React hook for observing app state
export function useAppStore<T>(selector: (state: AppState) => T): T {
  const getSnapshot = useCallback(() => selector(appState), [selector]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
