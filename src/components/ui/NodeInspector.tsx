import React from 'react';
import { ClusterNode } from '../../types/game';
import { useAppStore, dispatch } from '../../store/gameStore';
import {
  NODE_TEMPLATES,
  formatCurrency,
  formatRps,
  formatGb,
  formatPercent,
  CPU_TIER_CONFIG,
  RAM_TIER_CONFIG,
  MAX_HARDWARE_TIER,
  getCpuUpgradeCost,
  getRamUpgradeCost,
  getStorageUpgradeCost,
  getReplicationCost,
  getShardingCost,
} from '../../constants/gameConfig';
import { audio } from '../../audio/proceduralAudio';
import {
  ArrowUpCircle,
  PlusCircle,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Activity,
  Cpu,
  Layers,
  HardDrive,
  Database,
  Clock,
  Sparkles,
  Globe,
} from 'lucide-react';

interface NodeInspectorProps {
  node: ClusterNode;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({ node }) => {
  const cashUsd = useAppStore((s) => s.sim.economy.cashUsd);
  const geoDnsMode = useAppStore((s) => s.sim.geoDnsMode ?? 'failover');
  const activeFailover = useAppStore((s) => s.sim.activeFailover ?? false);
  const tmpl = NODE_TEMPLATES[node.kind];

  const cpuTier = node.cpuTier ?? 0;
  const ramTier = node.ramTier ?? 0;
  const cpuConfig = CPU_TIER_CONFIG[cpuTier] || CPU_TIER_CONFIG[0];
  const ramConfig = RAM_TIER_CONFIG[ramTier] || RAM_TIER_CONFIG[0];

  const cpuCost = getCpuUpgradeCost(node);
  const ramCost = getRamUpgradeCost(node);
  const storageCost = getStorageUpgradeCost(node);
  const replicationCost = getReplicationCost(node);
  const shardingCost = getShardingCost(node);

  const canUpgradeCpu = cpuCost > 0 && cashUsd >= cpuCost && cpuTier < MAX_HARDWARE_TIER;
  const canUpgradeRam = ramCost > 0 && cashUsd >= ramCost && ramTier < MAX_HARDWARE_TIER;
  const canUpgradeStorage = storageCost > 0 && cashUsd >= storageCost;
  const canAddReplica = replicationCost > 0 && cashUsd >= replicationCost && node.replication < 5;
  const canEnableSharding = shardingCost > 0 && cashUsd >= shardingCost && !node.sharding;
  const canAddBehind = node.kind === 'loadbalancer' || node.kind === 'server';

  const cpuRatio = Math.max(0, Math.min(1, node.cpuUtilization));
  const ramRatio = node.ramGb > 0 ? Math.max(0, Math.min(1, node.ramUsedGb / node.ramGb)) : 0;
  const storageRatio = node.storageGb > 0 ? Math.max(0, Math.min(1, node.storageUsedGb / node.storageGb)) : 0;
  const throughputRatio = node.capacityRps > 0 ? Math.max(0, Math.min(1, node.currentRps / node.capacityRps)) : 0;

  const handleUpgradeCpu = () => {
    dispatch({ type: 'upgradeCpu', nodeId: node.id });
  };

  const handleUpgradeRam = () => {
    dispatch({ type: 'upgradeRam', nodeId: node.id });
  };

  const handleUpgradeStorage = () => {
    dispatch({ type: 'upgradeStorage', nodeId: node.id });
  };

  const handleAddReplica = () => {
    dispatch({ type: 'addReplication', nodeId: node.id });
  };

  const handleToggleSharding = () => {
    dispatch({ type: 'toggleSharding', nodeId: node.id });
  };

  const handleAddServerBehind = () => {
    audio.playClick();
    dispatch({ type: 'addServerBehind', nodeId: node.id });
  };

  const handleToggleShield = () => {
    dispatch({ type: 'toggleShield', nodeId: node.id });
  };

  const handleDelete = () => {
    dispatch({ type: 'deleteNode', nodeId: node.id });
  };

  return (
    <div className="ct-inspector">
      <div className="ct-inspector__head">
        <div>
          <span className="ct-inspector__kind" style={{ color: tmpl.accentVar }}>
            {tmpl.label}
          </span>
          <h3 className="ct-inspector__title">{node.name}</h3>
          <div className="flex items-center gap-2 mt-1 font-mono text-[11px] text-[var(--ct-text-muted)]">
            <span className="px-1.5 py-0.5 rounded bg-[var(--ct-surface-3)] text-[var(--ct-text-strong)] font-semibold border border-[var(--ct-border)]">
              {node.region ?? 'us-east-1'}
            </span>
            <span className="text-[var(--ct-text-faint)]">/</span>
            <span className="text-[var(--ct-cyan)]">{node.availabilityZone ?? 'us-east-1a'}</span>
          </div>
        </div>
        <span className={`ct-node-row__status ct-status--${node.status}`}>
          {node.status.toUpperCase()}
        </span>
      </div>

      <p className="ct-inspector__desc">{tmpl.description}</p>

      {/* Real-time Telemetry Metrics */}
      <div className="ct-inspector__metrics">
        {/* CPU */}
        {node.kind !== 'entry' && node.kind !== 'storage' && (
          <div className="ct-metric">
            <div className="ct-metric__head">
              <span className="ct-metric__name">
                <Cpu size={12} className="inline mr-1" />
                CPU ({node.cpuCores} Cores)
              </span>
              <span className="ct-metric__value">{formatPercent(node.cpuUtilization)}</span>
            </div>
            <div className="ct-meter" role="meter" aria-label="CPU Utilization">
              <span
                className="ct-meter__fill"
                style={{
                  width: `${cpuRatio * 100}%`,
                  background:
                    cpuRatio >= 0.92
                      ? 'var(--ct-load-crit)'
                      : cpuRatio >= 0.75
                      ? 'var(--ct-load-warn)'
                      : 'var(--ct-load-ok)',
                }}
              />
            </div>
          </div>
        )}

        {/* RAM */}
        {node.ramGb > 0 && (
          <div className="ct-metric">
            <div className="ct-metric__head">
              <span className="ct-metric__name">
                <Layers size={12} className="inline mr-1" />
                Memory ({formatGb(node.ramGb)})
              </span>
              <span className="ct-metric__value">
                {formatGb(node.ramUsedGb)} ({formatPercent(ramRatio)})
              </span>
            </div>
            <div className="ct-meter" role="meter" aria-label="Memory Utilization">
              <span
                className="ct-meter__fill"
                style={{
                  width: `${ramRatio * 100}%`,
                  background:
                    ramRatio >= 0.9
                      ? 'var(--ct-load-crit)'
                      : ramRatio >= 0.75
                      ? 'var(--ct-load-warn)'
                      : 'var(--ct-load-ok)',
                }}
              />
            </div>
          </div>
        )}

        {/* Storage */}
        {node.storageGb > 0 && (
          <div className="ct-metric">
            <div className="ct-metric__head">
              <span className="ct-metric__name">
                <HardDrive size={12} className="inline mr-1" />
                Storage ({formatGb(node.storageGb)})
              </span>
              <span className="ct-metric__value">
                {formatGb(node.storageUsedGb)} ({formatPercent(storageRatio)})
              </span>
            </div>
            <div className="ct-meter" role="meter" aria-label="Storage Usage">
              <span
                className="ct-meter__fill"
                style={{
                  width: `${storageRatio * 100}%`,
                  background:
                    storageRatio >= 0.9
                      ? 'var(--ct-load-crit)'
                      : storageRatio >= 0.75
                      ? 'var(--ct-load-warn)'
                      : 'var(--ct-load-ok)',
                }}
              />
            </div>
          </div>
        )}

        {/* Throughput */}
        <div className="ct-metric">
          <div className="ct-metric__head">
            <span className="ct-metric__name">
              <Activity size={12} className="inline mr-1" />
              Throughput
            </span>
            <span className="ct-metric__value">
              {formatRps(node.currentRps)}{' '}
              {node.capacityRps > 0 && `/ max ${formatRps(node.capacityRps)}`}
            </span>
          </div>
          {node.capacityRps > 0 && (
            <div className="ct-meter" role="meter" aria-label="Capacity Usage">
              <span
                className="ct-meter__fill"
                style={{
                  width: `${throughputRatio * 100}%`,
                  background:
                    throughputRatio >= 0.9
                      ? 'var(--ct-load-crit)'
                      : throughputRatio >= 0.75
                      ? 'var(--ct-load-warn)'
                      : 'var(--ct-load-ok)',
                }}
              />
            </div>
          )}
        </div>

        {/* Latency */}
        <div className="ct-metric">
          <div className="ct-metric__head">
            <span className="ct-metric__name">
              <Clock size={12} className="inline mr-1" />
              Latency
            </span>
            <span className="ct-metric__value">
              {Number.isFinite(node.latencyMs) ? `${node.latencyMs.toFixed(1)} ms` : '∞ (TIMEOUT)'}
            </span>
          </div>
        </div>

        {/* Meltdown Countdown Warning */}
        {node.meltdownSeconds > 0 && (
          <div className="ct-alert ct-alert--danger">
            <strong>THERMAL THROTTLING ACTIVE</strong>
            <p>CPU cores exceeded safe temperature threshold. Recovery in {node.meltdownSeconds.toFixed(1)}s.</p>
          </div>
        )}

        {/* Hardware Repair Countdown */}
        {node.repairSeconds > 0 && (
          <div className="ct-alert ct-alert--warning">
            <strong>MAINTENANCE IN PROGRESS</strong>
            <p>Node undergoing automated hardware recovery. Online in {node.repairSeconds.toFixed(1)}s.</p>
          </div>
        )}
      </div>

      {/* Hardware Component Upgrade Bay */}
      {tmpl.maxUpgrades > 0 && (
        <div className="ct-upgrade-bay">
          <div className="ct-upgrade-bay__header">
            <span className="ct-upgrade-bay__tag">HARDWARE CONFIGURATION</span>
            <span className="ct-upgrade-bay__tier-dots">
              {Array.from({ length: MAX_HARDWARE_TIER }, (_, i) => (
                <span
                  key={i}
                  className={`ct-tier-dot ${i < Math.max(cpuTier, ramTier) ? 'ct-tier-dot--active' : ''}`}
                />
              ))}
            </span>
          </div>

          {/* CPU Hardware Upgrade Card */}
          <div className="ct-upgrade-card">
            <div className="ct-upgrade-card__info">
              <div className="flex items-center justify-between">
                <span className="ct-upgrade-card__title">
                  <Cpu size={14} className="inline mr-1.5 text-cyan-400" />
                  Compute Unit (CPU)
                </span>
                <span className="ct-badge ct-badge--cpu" style={{ color: cpuConfig.color }}>
                  {cpuConfig.badge}
                </span>
              </div>
              <p className="ct-upgrade-card__model">{cpuConfig.name}</p>
              <div className="ct-upgrade-card__benefit">
                {cpuTier < MAX_HARDWARE_TIER
                  ? `Next Tier: +4 Cores, +35% RPS Capacity`
                  : `Maximum Tier Reached (${node.cpuCores} Cores)`}
              </div>
            </div>

            {cpuTier < MAX_HARDWARE_TIER ? (
              <button
                type="button"
                className="ct-btn ct-btn--primary ct-btn--block"
                disabled={!canUpgradeCpu}
                onClick={handleUpgradeCpu}
                title={cashUsd < cpuCost ? 'Insufficient funds' : 'Upgrade processor tier'}
              >
                <ArrowUpCircle size={15} />
                <span>Upgrade CPU ({formatCurrency(cpuCost)})</span>
              </button>
            ) : (
              <div className="ct-upgrade-card__max">MAX CPU TIER REACHED</div>
            )}
          </div>

          {/* RAM Memory Expansion Card */}
          {node.ramGb > 0 && (
            <div className="ct-upgrade-card">
              <div className="ct-upgrade-card__info">
                <div className="flex items-center justify-between">
                  <span className="ct-upgrade-card__title">
                    <Layers size={14} className="inline mr-1.5 text-green-400" />
                    Memory Allocation (RAM)
                  </span>
                  <span className="ct-badge ct-badge--ram" style={{ color: ramConfig.color }}>
                    {ramConfig.slots}x SLOTS
                  </span>
                </div>
                <p className="ct-upgrade-card__model">{ramConfig.name} ({formatGb(node.ramGb)})</p>
                <div className="ct-upgrade-card__benefit">
                  {ramTier < MAX_HARDWARE_TIER
                    ? `Next Expansion: +${formatGb(node.ramGb)} RAM (Doubles capacity)`
                    : `Maximum Memory Reached (${formatGb(node.ramGb)})`}
                </div>
              </div>

              {ramTier < MAX_HARDWARE_TIER ? (
                <button
                  type="button"
                  className="ct-btn ct-btn--primary ct-btn--block"
                  disabled={!canUpgradeRam}
                  onClick={handleUpgradeRam}
                  title={cashUsd < ramCost ? 'Insufficient funds' : 'Upgrade system memory'}
                >
                  <ArrowUpCircle size={15} />
                  <span>Expand RAM ({formatCurrency(ramCost)})</span>
                </button>
              ) : (
                <div className="ct-upgrade-card__max">MAX RAM TIER REACHED</div>
              )}
            </div>
          )}

          {/* Storage Quota Expansion Card (S3 & DB) */}
          {node.storageGb > 0 && (
            <div className="ct-upgrade-card">
              <div className="ct-upgrade-card__info">
                <div className="flex items-center justify-between">
                  <span className="ct-upgrade-card__title">
                    <HardDrive size={14} className="inline mr-1.5 text-purple-400" />
                    Storage Volume Quota
                  </span>
                  <span className="ct-badge" style={{ color: 'var(--ct-violet)' }}>
                    {formatGb(node.storageGb)}
                  </span>
                </div>
                <p className="ct-upgrade-card__model">Persistent Block & Object Storage</p>
                <div className="ct-upgrade-card__benefit">
                  Next Expansion: +{formatGb(node.storageGb)} (Doubles quota to prevent threshold warnings)
                </div>
              </div>

              <button
                type="button"
                className="ct-btn ct-btn--primary ct-btn--block"
                disabled={!canUpgradeStorage}
                onClick={handleUpgradeStorage}
                title={cashUsd < storageCost ? 'Insufficient funds' : 'Expand storage capacity'}
              >
                <ArrowUpCircle size={15} />
                <span>Expand Quota ({formatCurrency(storageCost)})</span>
              </button>
            </div>
          )}

          {/* Database Specific: Read Replication */}
          {node.kind === 'database' && (
            <div className="ct-upgrade-card">
              <div className="ct-upgrade-card__info">
                <div className="flex items-center justify-between">
                  <span className="ct-upgrade-card__title">
                    <Database size={14} className="inline mr-1.5 text-amber-400" />
                    Read Replicas
                  </span>
                  <span className="ct-badge" style={{ color: 'var(--ct-amber)' }}>
                    {node.replication}x NODES
                  </span>
                </div>
                <p className="ct-upgrade-card__model">Asynchronous Read-Only Standby</p>
                <div className="ct-upgrade-card__benefit">
                  {node.replication < 5
                    ? `Add Replica: +40% Query Capacity & Redundancy`
                    : `Maximum Cluster Replication Reached`}
                </div>
              </div>

              {node.replication < 5 ? (
                <button
                  type="button"
                  className="ct-btn ct-btn--block"
                  disabled={!canAddReplica}
                  onClick={handleAddReplica}
                  title={cashUsd < replicationCost ? 'Insufficient funds' : 'Add read replica instance'}
                >
                  <PlusCircle size={15} />
                  <span>Provision Replica ({formatCurrency(replicationCost)})</span>
                </button>
              ) : (
                <div className="ct-upgrade-card__max">MAX REPLICAS REACHED</div>
              )}
            </div>
          )}

          {/* Database Specific: Horizontal Sharding */}
          {node.kind === 'database' && !node.sharding && (
            <div className="ct-upgrade-card">
              <div className="ct-upgrade-card__info">
                <div className="flex items-center justify-between">
                  <span className="ct-upgrade-card__title">
                    <Sparkles size={14} className="inline mr-1.5 text-cyan-400" />
                    Horizontal Sharding
                  </span>
                  <span className="ct-badge" style={{ color: 'var(--ct-cyan)' }}>
                    UNSHARDED
                  </span>
                </div>
                <p className="ct-upgrade-card__model">Distributed Partitioning Architecture</p>
                <div className="ct-upgrade-card__benefit">
                  Partitions write transactions to eliminate disk write bottlenecks.
                </div>
              </div>

              <button
                type="button"
                className="ct-btn ct-btn--block"
                disabled={!canEnableSharding}
                onClick={handleToggleSharding}
                title={cashUsd < shardingCost ? 'Insufficient funds' : 'Enable distributed database sharding'}
              >
                <Sparkles size={15} />
                <span>Enable Sharding ({formatCurrency(shardingCost)})</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Controls */}
      <div className="ct-inspector__actions">
        {canAddBehind && (
          <button
            type="button"
            className="ct-btn ct-btn--block"
            onClick={handleAddServerBehind}
          >
            <PlusCircle size={15} />
            <span>Attach Downstream Server (${NODE_TEMPLATES.server.costUsd})</span>
          </button>
        )}

        {node.kind === 'entry' && (
          <>
            <button
              type="button"
              className={`ct-btn ct-btn--block ${node.shielded ? 'ct-btn--shield-on' : ''}`}
              onClick={handleToggleShield}
            >
              {node.shielded ? <ShieldCheck size={15} /> : <ShieldAlert size={15} />}
              <span>DDoS Shield: {node.shielded ? 'ENABLED' : 'DISABLED'}</span>
            </button>

            {/* Global Anycast Geo-DNS Ingress Routing Selector */}
            <div className="p-3 rounded border border-[var(--ct-border)] bg-[var(--ct-surface-2)] mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ct-cyan)] flex items-center gap-1.5">
                  <Globe size={13} />
                  Geo-DNS Ingress Policy
                </span>
                {activeFailover && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500/60 text-red-400 animate-pulse">
                    FAILOVER ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--ct-text-muted)] mb-2.5 leading-snug">
                Distributes ingress traffic across cloud regions with automated resilience.
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  {
                    id: 'failover',
                    label: 'Automated Failover (HA/DR)',
                    desc: 'Instantly redirects traffic to alternate regions when an outage or blackout strikes.',
                  },
                  {
                    id: 'proximity',
                    label: 'Proximity Latency Routing',
                    desc: 'Routes users to lowest-latency datacenters to minimize round-trip physical delay.',
                  },
                  {
                    id: 'roundrobin',
                    label: 'Round-Robin Ingress',
                    desc: 'Distributes incoming load evenly across all online cloud regions.',
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`text-left px-2.5 py-2 rounded text-xs border transition-colors ${
                      geoDnsMode === opt.id
                        ? 'border-[var(--ct-cyan)] bg-[var(--ct-cyan)]/15 text-white font-medium'
                        : 'border-[var(--ct-border)] bg-[var(--ct-surface-1)] text-[var(--ct-text-muted)] hover:border-[var(--ct-text-muted)]'
                    }`}
                    onClick={() => {
                      audio.playClick();
                      dispatch({ type: 'setGeoDnsMode', mode: opt.id as any });
                    }}
                  >
                    <div className="font-semibold text-[var(--ct-text-strong)] flex items-center justify-between">
                      <span>{opt.label}</span>
                      {geoDnsMode === opt.id && <span className="text-[var(--ct-cyan)] text-[10px]">● ACTIVE</span>}
                    </div>
                    <div className="text-[10px] text-[var(--ct-text-muted)] mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {node.kind !== 'entry' && (
          <button
            type="button"
            className="ct-btn ct-btn--danger ct-btn--block"
            onClick={handleDelete}
          >
            <Trash2 size={15} />
            <span>Decommission Node</span>
          </button>
        )}
      </div>
    </div>
  );
};
