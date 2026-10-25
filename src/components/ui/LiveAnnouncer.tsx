import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/gameStore';
import { audio } from '../../audio/proceduralAudio';
import {
  formatCurrency,
  formatPercent,
  formatRps,
  NODE_TEMPLATES,
  STATUS_NON_COLOR_LABELS,
} from '../../constants/gameConfig';

export const LiveAnnouncer: React.FC = () => {
  const sim = useAppStore((s) => s.sim);
  const settings = useAppStore((s) => s.settings);
  const screen = useAppStore((s) => s.screen);

  const [politeText, setPoliteText] = useState<string>('');
  const [assertiveText, setAssertiveText] = useState<string>('');

  // Tracking refs to detect transitions
  const prevSpeedRef = useRef<number>(sim.speed);
  const prevSelectedNodeIdRef = useRef<string | null>(sim.selectedNodeId);
  const prevActiveToolRef = useRef<string>(sim.activeTool.kind);
  const prevPendingBillIdRef = useRef<string | null>(sim.economy.pendingBill?.id ?? null);
  const prevMeltdownCountRef = useRef<number>(sim.meltdownCount);
  const prevIncidentCountRef = useRef<number>(sim.incidentOrder.length);
  const prevNodesStatusRef = useRef<Record<string, string>>({});

  const announcePolite = (msg: string) => {
    if (!settings.screenReaderAnnouncements) return;
    setPoliteText(msg);
    if (settings.speechSynthesisEnabled) {
      audio.speakText(msg, 'normal');
    }
  };

  const announceAssertive = (msg: string) => {
    if (!settings.screenReaderAnnouncements) return;
    setAssertiveText(msg);
    if (settings.speechSynthesisEnabled) {
      audio.speakText(msg, 'urgent');
    }
  };

  // Speed and Pause announcements
  useEffect(() => {
    if (screen !== 'playing') return;
    if (prevSpeedRef.current !== sim.speed) {
      if (sim.speed === 0) {
        announcePolite('Simulation paused.');
      } else {
        announcePolite(`Simulation speed set to ${sim.speed}X normal.`);
      }
      prevSpeedRef.current = sim.speed;
    }
  }, [sim.speed, screen, settings.screenReaderAnnouncements, settings.speechSynthesisEnabled]);

  // Tool change announcement
  useEffect(() => {
    if (screen !== 'playing') return;
    if (prevActiveToolRef.current !== sim.activeTool.kind) {
      const toolLabel =
        sim.activeTool.kind === 'select'
          ? 'Selection and inspection mode'
          : sim.activeTool.kind === 'connect'
          ? 'Link wiring cable mode'
          : `Deploy ${NODE_TEMPLATES[sim.activeTool.kind]?.label || sim.activeTool.kind}`;
      announcePolite(`Tool switched to: ${toolLabel}.`);
      prevActiveToolRef.current = sim.activeTool.kind;
    }
  }, [sim.activeTool.kind, screen, settings.screenReaderAnnouncements, settings.speechSynthesisEnabled]);

  // Node selection announcement
  useEffect(() => {
    if (screen !== 'playing') return;
    if (prevSelectedNodeIdRef.current !== sim.selectedNodeId) {
      if (sim.selectedNodeId && sim.nodes[sim.selectedNodeId]) {
        const node = sim.nodes[sim.selectedNodeId];
        const tmpl = NODE_TEMPLATES[node.kind];
        const statusMeta = STATUS_NON_COLOR_LABELS[node.status] || { label: node.status };
        const details = [
          `Selected ${node.name}`,
          `${tmpl.label}`,
          `${statusMeta.label}`,
          `CPU ${formatPercent(node.cpuUtilization)}`,
          node.ramGb > 0 ? `RAM ${node.ramUsedGb} of ${node.ramGb} GB` : null,
          `Throughput ${formatRps(node.currentRps)}`,
        ]
          .filter(Boolean)
          .join(', ');
        announcePolite(details);
      } else if (prevSelectedNodeIdRef.current) {
        announcePolite('Node deselected.');
      }
      prevSelectedNodeIdRef.current = sim.selectedNodeId;
    }
  }, [sim.selectedNodeId, sim.nodes, screen, settings.screenReaderAnnouncements, settings.speechSynthesisEnabled]);

  // Meltdowns detection
  useEffect(() => {
    if (screen !== 'playing') return;
    if (sim.meltdownCount > prevMeltdownCountRef.current) {
      // Find which node melted down
      const meltingNode = Object.values(sim.nodes).find((n) => n.status === 'meltdown');
      const nodeName = meltingNode ? meltingNode.name : 'A server node';
      announceAssertive(`Thermal Emergency! ${nodeName} exceeded 100% CPU capacity and suffered a thermal meltdown. Cooling down.`);
      prevMeltdownCountRef.current = sim.meltdownCount;
    }
  }, [sim.meltdownCount, sim.nodes, screen, settings.screenReaderAnnouncements, settings.speechSynthesisEnabled]);

  // Invoice due alert
  useEffect(() => {
    if (screen !== 'playing') return;
    const currentBillId = sim.economy.pendingBill?.id ?? null;
    if (currentBillId && currentBillId !== prevPendingBillIdRef.current) {
      const bill = sim.economy.pendingBill;
      if (bill) {
        announceAssertive(
          `Attention: Monthly AWS cloud invoice due for ${formatCurrency(
            bill.totalUsd
          )}. You have cash on hand of ${formatCurrency(
            sim.economy.cashUsd
          )}. Press Enter or click Pay Invoice before time runs out.`
        );
      }
    }
    prevPendingBillIdRef.current = currentBillId;
  }, [sim.economy.pendingBill, sim.economy.cashUsd, screen, settings.screenReaderAnnouncements, settings.speechSynthesisEnabled]);

  // Security Incident alert
  useEffect(() => {
    if (screen !== 'playing') return;
    if (sim.incidentOrder.length > prevIncidentCountRef.current) {
      const latestId = sim.incidentOrder[sim.incidentOrder.length - 1];
      const inc = sim.incidents[latestId];
      if (inc && !inc.acknowledged) {
        announceAssertive(`Security Incident Alert: ${inc.title}. ${inc.detail}`);
      }
      prevIncidentCountRef.current = sim.incidentOrder.length;
    }
  }, [sim.incidentOrder, sim.incidents, screen, settings.screenReaderAnnouncements, settings.speechSynthesisEnabled]);

  // Node status transitions (e.g. into warning or recovery)
  useEffect(() => {
    if (screen !== 'playing') return;
    const currentStatusMap: Record<string, string> = {};
    for (const node of Object.values(sim.nodes)) {
      currentStatusMap[node.id] = node.status;
      const prevStatus = prevNodesStatusRef.current[node.id];
      if (prevStatus && prevStatus !== node.status) {
        if (node.status === 'warning') {
          announcePolite(`Warning: ${node.name} CPU load high.`);
        } else if (node.status === 'critical') {
          announceAssertive(`Critical: ${node.name} approaching thermal cutoff!`);
        } else if (node.status === 'nominal' && prevStatus !== 'nominal') {
          announcePolite(`${node.name} returned to nominal state.`);
        }
      }
    }
    prevNodesStatusRef.current = currentStatusMap;
  }, [sim.nodes, screen, settings.screenReaderAnnouncements, settings.speechSynthesisEnabled]);

  if (!settings.screenReaderAnnouncements) {
    return null;
  }

  return (
    <div className="ct-a11y-live-region" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeText}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveText}
      </div>
    </div>
  );
};
