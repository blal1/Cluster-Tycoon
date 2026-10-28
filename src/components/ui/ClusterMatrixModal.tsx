import React, { useState, useEffect, useRef } from 'react';
import { useAppStore, dispatch } from '../../store/gameStore';
import { audio } from '../../audio/proceduralAudio';
import {
  NODE_TEMPLATES,
  CPU_TIER_CONFIG,
  RAM_TIER_CONFIG,
  MAX_HARDWARE_TIER,
  getCpuUpgradeCost,
  getRamUpgradeCost,
  getStorageUpgradeCost,
  formatCurrency,
  formatPercent,
  formatRps,
  formatGb,
  formatLatencyMs,
  STATUS_NON_COLOR_LABELS,
} from '../../constants/gameConfig';
import { NodeKind, ClusterNode, CloudRegionId } from '../../types/game';
import {
  X,
  Server,
  Cpu,
  Layers,
  HardDrive,
  Shield,
  RotateCw,
  Plus,
  Trash2,
  Unlink,
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
  Flame,
  PowerOff,
  Activity,
  Globe,
} from 'lucide-react';

interface ClusterMatrixModalProps {
  open: boolean;
  onClose: () => void;
}

export const ClusterMatrixModal: React.FC<ClusterMatrixModalProps> = ({ open, onClose }) => {
  const sim = useAppStore((s) => s.sim);
  const settings = useAppStore((s) => s.settings);

  const [deployKind, setDeployKind] = useState<NodeKind>('server');
  const [selectedRegion, setSelectedRegion] = useState<CloudRegionId | 'all'>('all');
  const [connectTargetMap, setConnectTargetMap] = useState<Record<string, string>>({});
  const [disconnectTargetMap, setDisconnectTargetMap] = useState<Record<string, string>>({});

  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Focus trap on open
  useEffect(() => {
    if (open) {
      audio.playSelect();
      setTimeout(() => closeBtnRef.current?.focus(), 50);
    }
  }, [open]);

  // Handle escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (open && e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const nodes = sim.nodeOrder.map((id) => sim.nodes[id]).filter((n): n is ClusterNode => !!n);
  const edges = Object.values(sim.edges);

  const handleDeploy = () => {
    const tmpl = NODE_TEMPLATES[deployKind];
    if (sim.economy.cashUsd < tmpl.costUsd) {
      audio.playDenied();
      return;
    }

    // Auto-calculate non-overlapping position
    const nodeCount = nodes.length;
    const posX = 160 + (nodeCount % 5) * 180;
    const posY = 140 + Math.floor(nodeCount / 5) * 140;

    dispatch({ type: 'placeNode', kind: deployKind, pos: { x: posX, y: posY } });
  };

  const handleConnect = (fromId: string) => {
    const toId = connectTargetMap[fromId];
    if (!toId || toId === fromId) {
      audio.playDenied();
      return;
    }
    dispatch({ type: 'connectNodes', fromId, toId });
  };

  const handleDisconnect = (edgeId: string) => {
    if (!edgeId) return;
    dispatch({ type: 'deleteEdge', edgeId });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'nominal':
        return <CheckCircle2 size={14} className="inline mr-1 text-green-400" aria-hidden="true" />;
      case 'warning':
        return <AlertTriangle size={14} className="inline mr-1 text-yellow-400" aria-hidden="true" />;
      case 'critical':
        return <AlertTriangle size={14} className="inline mr-1 text-red-400" aria-hidden="true" />;
      case 'meltdown':
        return <Flame size={14} className="inline mr-1 text-red-500 animate-pulse" aria-hidden="true" />;
      default:
        return <PowerOff size={14} className="inline mr-1 text-gray-400" aria-hidden="true" />;
    }
  };

  return (
    <div
      className="ct-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="ct-matrix-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="matrix-title"
        aria-describedby="matrix-desc"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="ct-matrix-modal__head">
          <div>
            <div className="flex items-center gap-2">
              <Server size={18} className="text-cyan-400" aria-hidden="true" />
              <h2 id="matrix-title" className="ct-matrix-modal__title">
                Cluster Topology & Hardware Matrix
              </h2>
            </div>
            <p id="matrix-desc" className="ct-matrix-modal__subtitle">
              Tabular inventory of active cluster nodes, resource utilization, hardware tiers, and network topology.
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="ct-btn ct-btn--ghost"
            onClick={onClose}
            aria-label="Close Cluster Topology Matrix (Escape)"
          >
            <X size={16} />
            <span>Close [Esc]</span>
          </button>
        </div>

        {/* Global Cluster Summary Banner */}
        <div className="ct-matrix-modal__summary" role="region" aria-label="Cluster Quick Stats">
          <div className="ct-matrix-stat">
            <span className="ct-matrix-stat__label">Cash on Hand</span>
            <strong className="ct-matrix-stat__value text-yellow-300">
              {formatCurrency(sim.economy.cashUsd)}
            </strong>
          </div>
          <div className="ct-matrix-stat">
            <span className="ct-matrix-stat__label">Total Nodes</span>
            <strong className="ct-matrix-stat__value text-cyan-400">
              {nodes.length}
            </strong>
          </div>
          <div className="ct-matrix-stat">
            <span className="ct-matrix-stat__label">Served RPS</span>
            <strong className="ct-matrix-stat__value text-green-400">
              {formatRps(sim.servedRps)}
            </strong>
          </div>
          <div className="ct-matrix-stat">
            <span className="ct-matrix-stat__label">Network Latency</span>
            <strong
              className={`ct-matrix-stat__value ${
                (sim.networkLatencyMs ?? 6.8) >= 50
                  ? 'text-red-400'
                  : (sim.networkLatencyMs ?? 6.8) >= 25
                  ? 'text-yellow-400'
                  : 'text-cyan-400'
              }`}
            >
              {formatLatencyMs(sim.networkLatencyMs ?? 6.8)} ({sim.clusterHops ?? 2} hops)
            </strong>
          </div>
          <div className="ct-matrix-stat">
            <span className="ct-matrix-stat__label">Dropped RPS</span>
            <strong className={`ct-matrix-stat__value ${sim.droppedRps > 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {formatRps(sim.droppedRps)}
            </strong>
          </div>
          <div className="ct-matrix-stat">
            <span className="ct-matrix-stat__label">Cross-Region WAN</span>
            <strong className="ct-matrix-stat__value text-amber-300">
              {formatRps(sim.crossRegionRps ?? 0)}
            </strong>
          </div>
          <div className="ct-matrix-stat">
            <span className="ct-matrix-stat__label">Geo-DNS Ingress</span>
            <strong className="ct-matrix-stat__value text-cyan-400 font-mono text-xs uppercase">
              {sim.geoDnsMode ?? 'failover'}
            </strong>
          </div>
          <div className="ct-matrix-stat">
            <span className="ct-matrix-stat__label">Active Meltdowns</span>
            <strong className={`ct-matrix-stat__value ${sim.meltdownCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {nodes.filter((n) => n.status === 'meltdown').length}
            </strong>
          </div>
        </div>

        {/* Deploy New Node Accessible Bar */}
        <div className="ct-matrix-modal__deploy-bar" role="region" aria-label="Deploy Infrastructure Node">
          <label htmlFor="matrix-deploy-select" className="font-bold text-sm text-cyan-300">
            Deploy New Node:
          </label>
          <select
            id="matrix-deploy-select"
            className="ct-select"
            value={deployKind}
            onChange={(e) => setDeployKind(e.target.value as NodeKind)}
            aria-label="Select node kind to deploy"
          >
            {(['loadbalancer', 'server', 'cache', 'database', 'storage'] as NodeKind[]).map((kind) => {
              const tmpl = NODE_TEMPLATES[kind];
              return (
                <option key={kind} value={kind}>
                  {tmpl.label} ({tmpl.short}) - {formatCurrency(tmpl.costUsd)} (${tmpl.hourlyUsd.toFixed(2)}/hr)
                </option>
              );
            })}
          </select>
          <button
            type="button"
            className="ct-btn ct-btn--primary"
            onClick={handleDeploy}
            disabled={sim.economy.cashUsd < NODE_TEMPLATES[deployKind].costUsd}
          >
            <Plus size={15} />
            <span>Deploy {NODE_TEMPLATES[deployKind].label} ({formatCurrency(NODE_TEMPLATES[deployKind].costUsd)})</span>
          </button>
        </div>

        {/* Region Filter Bar */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-[#0b0e17] border-b border-[var(--ct-border)] text-xs">
          <span className="font-semibold text-gray-400">Filter Region:</span>
          {(['all', 'us-east-1', 'eu-west-1', 'ap-southeast-1'] as const).map((r) => {
            const count = r === 'all' ? nodes.length : nodes.filter((n) => n.region === r).length;
            const active = selectedRegion === r;
            return (
              <button
                key={r}
                type="button"
                className={`px-2.5 py-1 rounded font-mono text-xs transition-colors border ${
                  active
                    ? 'bg-[var(--ct-cyan)]/15 border-[var(--ct-cyan)] text-white font-bold'
                    : 'bg-[var(--ct-surface-2)] border-[var(--ct-border)] text-[var(--ct-text-muted)] hover:border-gray-500'
                }`}
                onClick={() => {
                  audio.playClick();
                  setSelectedRegion(r);
                }}
              >
                {r === 'all' ? 'All Regions' : r} ({count})
              </button>
            );
          })}
        </div>

        {/* Semantic Node Table */}
        <div className="ct-matrix-modal__table-container">
          {nodes.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No cluster nodes deployed yet. Use the deploy bar above to create your first server!
            </div>
          ) : (
            <table className="ct-matrix-table" aria-label="Cluster Infrastructure Nodes">
              <thead>
                <tr>
                  <th scope="col">Node Identifier</th>
                  <th scope="col">Region / AZ</th>
                  <th scope="col">Status & Health</th>
                  <th scope="col">Hardware Tier</th>
                  <th scope="col">CPU Utilization</th>
                  <th scope="col">RAM / Storage</th>
                  <th scope="col">Throughput</th>
                  <th scope="col">Wiring Connections</th>
                  <th scope="col">Management Actions</th>
                </tr>
              </thead>
              <tbody>
                {(selectedRegion === 'all' ? nodes : nodes.filter((n) => n.region === selectedRegion)).map((node) => {
                  const tmpl = NODE_TEMPLATES[node.kind];
                  const statusInfo = STATUS_NON_COLOR_LABELS[node.status] || {
                    label: node.status.toUpperCase(),
                    glyph: '•',
                    ariaText: `Status: ${node.status}`,
                  };

                  const cpuTier = node.cpuTier ?? 0;
                  const ramTier = node.ramTier ?? 0;
                  const cpuTierConfig = CPU_TIER_CONFIG[cpuTier] || CPU_TIER_CONFIG[0];
                  const ramTierConfig = RAM_TIER_CONFIG[ramTier] || RAM_TIER_CONFIG[0];

                  const cpuCost = getCpuUpgradeCost(node);
                  const ramCost = getRamUpgradeCost(node);
                  const storageCost = getStorageUpgradeCost(node);

                  // Outgoing and Incoming links
                  const outEdges = edges.filter((e) => e.fromId === node.id);
                  const inEdges = edges.filter((e) => e.toId === node.id);

                  // Connectable candidates: all nodes except self and already connected
                  const connectedToIds = new Set(outEdges.map((e) => e.toId));
                  const candidateTargets = nodes.filter((n) => n.id !== node.id && !connectedToIds.has(n.id));

                  const isSelected = sim.selectedNodeId === node.id;

                  return (
                    <tr
                      key={node.id}
                      className={isSelected ? 'ct-matrix-row--selected' : ''}
                      aria-current={isSelected ? 'true' : undefined}
                    >
                      {/* Identifier */}
                      <td>
                        <div className="flex flex-col">
                          <strong className="font-mono text-cyan-300 text-sm">{node.name}</strong>
                          <span className="text-xs text-gray-400">{tmpl.label} ({tmpl.short})</span>
                        </div>
                      </td>

                      {/* Region / AZ */}
                      <td>
                        <div className="flex flex-col font-mono text-xs">
                          <span className="font-semibold text-[var(--ct-text-strong)]">{node.region ?? 'us-east-1'}</span>
                          <span className="text-[10px] text-[var(--ct-cyan)]">{node.availabilityZone ?? 'us-east-1a'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`ct-status-badge ct-status-badge--${node.status}`}
                          role="status"
                          aria-label={statusInfo.ariaText}
                        >
                          {getStatusIcon(node.status)}
                          <span className="font-bold">{statusInfo.glyph} {statusInfo.label}</span>
                        </span>
                      </td>

                      {/* Hardware Tier */}
                      <td>
                        <div className="text-xs space-y-0.5">
                          <div className="text-cyan-400 font-mono">
                            CPU: {cpuTierConfig.name} ({node.cpuCores} cores)
                          </div>
                          {node.ramGb > 0 && (
                            <div className="text-purple-300 font-mono">
                              RAM: {ramTierConfig.name} ({node.ramGb} GB)
                            </div>
                          )}
                          {node.storageGb > 0 && (
                            <div className="text-yellow-400 font-mono">
                              Storage: {formatGb(node.storageGb)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* CPU Utilization */}
                      <td>
                        <div className="flex flex-col gap-1">
                          <span className="font-mono font-bold text-xs">
                            {formatPercent(node.cpuUtilization)}
                          </span>
                          <div
                            className="ct-meter-track"
                            role="progressbar"
                            aria-valuenow={Math.round(node.cpuUtilization * 100)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`CPU load for ${node.name}`}
                          >
                            <div
                              className="ct-meter-fill"
                              style={{
                                width: `${Math.min(100, Math.round(node.cpuUtilization * 100))}%`,
                                backgroundColor:
                                  node.cpuUtilization >= 0.92
                                    ? 'var(--ct-red)'
                                    : node.cpuUtilization >= 0.75
                                    ? 'var(--ct-amber)'
                                    : 'var(--ct-green)',
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* RAM / Storage */}
                      <td>
                        <div className="text-xs font-mono">
                          {node.ramGb > 0 ? (
                            <div>
                              RAM: {node.ramUsedGb} / {node.ramGb} GB (
                              {formatPercent(node.ramUsedGb / node.ramGb)})
                            </div>
                          ) : (
                            <div className="text-gray-500">No RAM meter</div>
                          )}
                          {node.storageGb > 0 && (
                            <div>Storage: {formatGb(node.storageGb)}</div>
                          )}
                        </div>
                      </td>

                      {/* Throughput */}
                      <td>
                        <div className="font-mono text-xs font-bold text-green-300">
                          {formatRps(node.currentRps)} / {formatRps(node.capacityRps)}
                        </div>
                      </td>

                      {/* Wiring Connections */}
                      <td>
                        <div className="space-y-2 text-xs">
                          {/* List incoming and outgoing */}
                          <div className="text-gray-400">
                            <strong>In:</strong> {inEdges.length} link{inEdges.length === 1 ? '' : 's'} |{' '}
                            <strong>Out:</strong> {outEdges.length} link{outEdges.length === 1 ? '' : 's'}
                          </div>

                          {/* Connect To Dropdown */}
                          {candidateTargets.length > 0 && (
                            <div className="flex items-center gap-1">
                              <select
                                className="ct-select ct-select--xs"
                                value={connectTargetMap[node.id] || candidateTargets[0].id}
                                onChange={(e) =>
                                  setConnectTargetMap({ ...connectTargetMap, [node.id]: e.target.value })
                                }
                                aria-label={`Select target node to connect wire from ${node.name}`}
                              >
                                {candidateTargets.map((cand) => (
                                  <option key={cand.id} value={cand.id}>
                                    → {cand.name} ({NODE_TEMPLATES[cand.kind].short})
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="ct-btn ct-btn--xs ct-btn--secondary"
                                onClick={() => {
                                  const targetId = connectTargetMap[node.id] || candidateTargets[0].id;
                                  dispatch({ type: 'connectNodes', fromId: node.id, toId: targetId });
                                }}
                                aria-label={`Connect wire from ${node.name}`}
                              >
                                <LinkIcon size={11} /> Link
                              </button>
                            </div>
                          )}

                          {/* Disconnect Existing Outgoing Link */}
                          {outEdges.length > 0 && (
                            <div className="flex items-center gap-1">
                              <select
                                className="ct-select ct-select--xs"
                                value={disconnectTargetMap[node.id] || outEdges[0].id}
                                onChange={(e) =>
                                  setDisconnectTargetMap({ ...disconnectTargetMap, [node.id]: e.target.value })
                                }
                                aria-label={`Select wire to sever from ${node.name}`}
                              >
                                {outEdges.map((e) => {
                                  const toNode = sim.nodes[e.toId];
                                  return (
                                    <option key={e.id} value={e.id}>
                                      Disconnect from {toNode ? toNode.name : e.toId}
                                    </option>
                                  );
                                })}
                              </select>
                              <button
                                type="button"
                                className="ct-btn ct-btn--xs ct-btn--danger"
                                onClick={() => {
                                  const edgeId = disconnectTargetMap[node.id] || outEdges[0].id;
                                  handleDisconnect(edgeId);
                                }}
                                aria-label={`Cut wire from ${node.name}`}
                              >
                                <Unlink size={11} /> Sever
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Management Actions */}
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          {/* Select / Focus Node */}
                          <button
                            type="button"
                            className="ct-btn ct-btn--xs"
                            onClick={() => {
                              dispatch({ type: 'selectNode', nodeId: node.id });
                            }}
                            aria-label={`Select and highlight ${node.name}`}
                          >
                            <Server size={11} />
                            <span>{isSelected ? 'Selected' : 'Inspect'}</span>
                          </button>

                          {/* Upgrade CPU */}
                          {tmpl.maxUpgrades > 0 && cpuTier < MAX_HARDWARE_TIER && (
                            <button
                              type="button"
                              className="ct-btn ct-btn--xs ct-btn--secondary"
                              onClick={() => {
                                dispatch({ type: 'upgradeCpu', nodeId: node.id });
                              }}
                              disabled={sim.economy.cashUsd < cpuCost}
                              aria-label={`Upgrade CPU for ${node.name} to Gen ${cpuTier + 2} for ${formatCurrency(cpuCost)}`}
                            >
                              <Cpu size={11} />
                              <span>Upgrade CPU ({formatCurrency(cpuCost)})</span>
                            </button>
                          )}

                          {/* Upgrade RAM */}
                          {node.ramGb > 0 && ramTier < MAX_HARDWARE_TIER && (
                            <button
                              type="button"
                              className="ct-btn ct-btn--xs ct-btn--secondary"
                              onClick={() => {
                                dispatch({ type: 'upgradeRam', nodeId: node.id });
                              }}
                              disabled={sim.economy.cashUsd < ramCost}
                              aria-label={`Upgrade RAM for ${node.name} for ${formatCurrency(ramCost)}`}
                            >
                              <Layers size={11} />
                              <span>Expand RAM ({formatCurrency(ramCost)})</span>
                            </button>
                          )}

                          {/* Expand Storage */}
                          {(node.kind === 'storage' || node.kind === 'database') && (
                            <button
                              type="button"
                              className="ct-btn ct-btn--xs ct-btn--secondary"
                              onClick={() => {
                                dispatch({ type: 'upgradeStorage', nodeId: node.id });
                              }}
                              disabled={sim.economy.cashUsd < storageCost}
                              aria-label={`Expand storage for ${node.name} for ${formatCurrency(storageCost)}`}
                            >
                              <HardDrive size={11} />
                              <span>Expand Storage ({formatCurrency(storageCost)})</span>
                            </button>
                          )}

                          {/* DDoS Shield */}
                          {(node.kind === 'entry' || node.kind === 'loadbalancer') && (
                            <button
                              type="button"
                              className={`ct-btn ct-btn--xs ${node.shielded ? 'ct-btn--primary' : ''}`}
                              onClick={() => {
                                dispatch({ type: 'toggleShield', nodeId: node.id });
                              }}
                              aria-label={`Toggle DDoS Shield for ${node.name}, currently ${node.shielded ? 'active' : 'inactive'}`}
                            >
                              <Shield size={11} />
                              <span>Shield: {node.shielded ? 'ON' : 'OFF'}</span>
                            </button>
                          )}

                          {/* Auto Reboot */}
                          {node.kind === 'server' && (
                            <button
                              type="button"
                              className={`ct-btn ct-btn--xs ${node.autoReboot ? 'ct-btn--primary' : ''}`}
                              onClick={() => {
                                dispatch({ type: 'toggleAutoReboot', nodeId: node.id });
                              }}
                              aria-label={`Toggle auto-reboot for ${node.name}, currently ${node.autoReboot ? 'enabled' : 'disabled'}`}
                            >
                              <RotateCw size={11} />
                              <span>Reboot: {node.autoReboot ? 'AUTO' : 'MANUAL'}</span>
                            </button>
                          )}

                          {/* Delete Node (Cannot delete entry) */}
                          {node.kind !== 'entry' && (
                            <button
                              type="button"
                              className="ct-btn ct-btn--xs ct-btn--danger"
                              onClick={() => {
                                dispatch({ type: 'deleteNode', nodeId: node.id });
                              }}
                              aria-label={`Decommission and delete ${node.name}`}
                            >
                              <Trash2 size={11} />
                              <span>Decommission</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="ct-matrix-modal__foot">
          <span className="text-xs text-gray-400">
            Keyboard navigation tips: Use <kbd>Tab</kbd> / <kbd>Shift + Tab</kbd> to move between fields, <kbd>Enter</kbd> or <kbd>Space</kbd> to trigger actions, and <kbd>Escape</kbd> to return to canvas. Press <kbd>Alt + A</kbd> anywhere to reopen.
          </span>
          <button type="button" className="ct-btn ct-btn--primary" onClick={onClose}>
            Back to Cluster
          </button>
        </div>
      </div>
    </div>
  );
};
