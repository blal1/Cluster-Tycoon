import React from 'react';
import { useAppStore, dispatch } from '../../store/gameStore';
import { NodeInspector } from './NodeInspector';
import {
  formatRps,
  formatCurrency,
  formatSecondsTime,
  formatLatencyMs,
  NODE_TEMPLATES,
  STATUS_NON_COLOR_LABELS,
  CLOUD_REGIONS,
} from '../../constants/gameConfig';
import { audio } from '../../audio/proceduralAudio';
import {
  Activity,
  DollarSign,
  AlertTriangle,
  Server,
  XCircle,
  Network,
  Globe,
} from 'lucide-react';

export const SideRail: React.FC = () => {
  const sim = useAppStore((s) => s.sim);

  const selectedNode = sim.selectedNodeId ? sim.nodes[sim.selectedNodeId] ?? null : null;
  const nodesList = sim.nodeOrder.map((id) => sim.nodes[id]).filter((n) => !!n);
  const activeIncidents = sim.incidentOrder
    .map((id) => sim.incidents[id])
    .filter((inc) => inc && !inc.acknowledged);

  const netProfit = sim.economy.totalRevenueUsd - sim.economy.totalSpendUsd;

  const activeNodesCount = nodesList.filter(
    (n) => n.status !== 'offline' && n.status !== 'meltdown' && n.repairSeconds <= 0 && n.meltdownSeconds <= 0
  ).length;
  const latency = sim.networkLatencyMs ?? 6.8;
  const hops = sim.clusterHops ?? 2;
  const latencyColor =
    latency >= 50
      ? 'var(--ct-red)'
      : latency >= 25
      ? 'var(--ct-amber)'
      : 'var(--ct-green)';

  const handleSelectNode = (id: string) => {
    if (sim.selectedNodeId === id) {
      dispatch({ type: 'selectNode', nodeId: null });
    } else {
      audio.playSelect();
      dispatch({ type: 'selectNode', nodeId: id });
    }
  };

  const handleDismissIncident = (id: string) => {
    dispatch({ type: 'dismissIncident', incidentId: id });
  };

  return (
    <aside className="ct-game__rail" aria-label="System telemetry and node inventory">
      {/* Throughput Telemetry */}
      <section className="ct-rail__section">
        <h2 className="ct-rail__title">
          <Activity size={13} className="inline mr-1" />
          Traffic & Throughput
        </h2>
        <div className="ct-metric">
          <div className="ct-metric__head">
            <span className="ct-metric__name">Inbound Demand</span>
            <span className="ct-metric__value">{formatRps(sim.inboundRps)}</span>
          </div>
        </div>
        <div className="ct-metric">
          <div className="ct-metric__head">
            <span className="ct-metric__name" style={{ color: 'var(--ct-green)' }}>
              Served Successfully
            </span>
            <span className="ct-metric__value" style={{ color: 'var(--ct-green)' }}>
              {formatRps(sim.servedRps)}
            </span>
          </div>
        </div>
        <div className="ct-metric">
          <div className="ct-metric__head">
            <span
              className="ct-metric__name"
              style={{ color: sim.droppedRps > 0 ? 'var(--ct-red)' : 'var(--ct-text-muted)' }}
            >
              Dropped Requests
            </span>
            <span
              className="ct-metric__value"
              style={{ color: sim.droppedRps > 0 ? 'var(--ct-red)' : 'var(--ct-text-muted)' }}
            >
              {formatRps(sim.droppedRps)}
            </span>
          </div>
        </div>
        {/* Network Latency */}
        <div
          className="ct-metric"
          aria-label={`Network Latency: ${formatLatencyMs(latency)}, ${hops} connection hops, ${activeNodesCount} active nodes`}
        >
          <div className="ct-metric__head">
            <span className="ct-metric__name flex items-center gap-1">
              <Network size={11} className="inline text-cyan-400" />
              Network Latency
            </span>
            <span
              className="ct-metric__value"
              style={{ color: latencyColor }}
            >
              {formatLatencyMs(latency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
            <span>{hops} connection hop{hops === 1 ? '' : 's'}</span>
            <span>{activeNodesCount} active node{activeNodesCount === 1 ? '' : 's'}</span>
          </div>
        </div>
      </section>

      {/* Multi-Region & HA Telemetry */}
      <section className="ct-rail__section">
        <h2 className="ct-rail__title">
          <Globe size={13} className="inline mr-1 text-cyan-400" />
          Multi-Region & HA
        </h2>

        {/* Geo-DNS & Failover Status */}
        <div className="ct-metric">
          <div className="ct-metric__head">
            <span className="ct-metric__name">Geo-DNS Routing</span>
            <span className="ct-metric__value font-mono text-[11px] uppercase text-[var(--ct-cyan)]">
              {sim.geoDnsMode ?? 'failover'}
            </span>
          </div>
          {sim.activeFailover && (
            <div className="text-[11px] font-bold text-red-400 bg-red-950/60 border border-red-500/50 rounded px-2 py-1 mt-1 animate-pulse">
              ⚡ FAILOVER: {sim.failoverSourceRegion ?? 'us-east-1'} → {sim.failoverTargetRegion ?? 'eu-west-1'}
            </div>
          )}
        </div>

        {/* Cross-Region WAN Traffic */}
        <div className="ct-metric">
          <div className="ct-metric__head">
            <span className="ct-metric__name">Cross-Region WAN</span>
            <span className="ct-metric__value text-amber-300">
              {formatRps(sim.crossRegionRps ?? 0)}
            </span>
          </div>
        </div>

        {/* Regional Breakdown */}
        <div className="mt-2 space-y-1.5">
          {Object.values(CLOUD_REGIONS).map((reg) => {
            const rps = sim.regionalRps?.[reg.id] ?? 0;
            const health = sim.regionalHealth?.[reg.id] ?? 'nominal';
            const healthColor =
              health === 'nominal'
                ? 'var(--ct-green)'
                : health === 'degraded'
                ? 'var(--ct-amber)'
                : 'var(--ct-red)';

            return (
              <div
                key={reg.id}
                className="flex items-center justify-between text-xs p-1.5 rounded bg-[var(--ct-surface-1)] border border-[var(--ct-border)]"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: healthColor }}
                  />
                  <span className="font-mono text-[11px] font-semibold text-[var(--ct-text-strong)]">
                    {reg.id}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--ct-text-muted)]">{formatRps(rps)}</span>
                  <span
                    className="text-[10px] uppercase font-mono font-bold"
                    style={{ color: healthColor }}
                  >
                    {health}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Empire Financials */}
      <section className="ct-rail__section">
        <h2 className="ct-rail__title">
          <DollarSign size={13} className="inline mr-1" />
          Financial Health
        </h2>
        <div className="ct-metric">
          <div className="ct-metric__head">
            <span className="ct-metric__name">Lifetime Revenue</span>
            <span className="ct-metric__value">{formatCurrency(sim.economy.totalRevenueUsd)}</span>
          </div>
        </div>
        <div className="ct-metric">
          <div className="ct-metric__head">
            <span className="ct-metric__name">Infrastructure Spend</span>
            <span className="ct-metric__value">{formatCurrency(sim.economy.totalSpendUsd)}</span>
          </div>
        </div>
        <div className="ct-metric">
          <div className="ct-metric__head">
            <span className="ct-metric__name">Net Operating Margin</span>
            <span
              className="ct-metric__value"
              style={{ color: netProfit >= 0 ? 'var(--ct-green)' : 'var(--ct-red)' }}
            >
              {formatCurrency(netProfit)}
            </span>
          </div>
        </div>
        <div className="ct-metric">
          <div className="ct-metric__head">
            <span className="ct-metric__name">Next Cloud Invoice</span>
            <span className="ct-metric__value ct-text--gold">
              {formatSecondsTime(sim.economy.secondsToBill)}
            </span>
          </div>
        </div>
      </section>

      {/* Active Incidents Banner */}
      {activeIncidents.length > 0 && (
        <section className="ct-rail__section ct-rail__section--incidents" aria-label="Active incidents">
          <h2 className="ct-rail__title ct-text--red">
            <AlertTriangle size={13} className="inline mr-1" />
            Active Incidents ({activeIncidents.length})
          </h2>
          <div className="ct-incidents-list">
            {activeIncidents.map((inc) => {
              const canAfford = sim.economy.cashUsd >= (inc.mitigationCostUsd ?? 100);
              return (
                <div key={inc.id} className="ct-incident-card" data-severity={inc.severity}>
                  <div className="ct-incident-card__head">
                    <span className="ct-incident-card__badge">{inc.severity.toUpperCase()}</span>
                    <span className="ct-incident-card__time">
                      {formatSecondsTime(inc.secondsRemaining)}
                    </span>
                  </div>
                  <strong className="ct-incident-card__title">{inc.title}</strong>
                  <p className="ct-incident-card__detail">{inc.detail}</p>

                  {inc.kind === 'power_fluctuation' && (
                    <div style={{ fontSize: '11px', color: 'var(--ct-amber)', margin: '4px 0 6px 0', fontWeight: 600 }}>
                      ⚡ Status: {inc.flappingState?.toUpperCase()} (cycling brownout)
                    </div>
                  )}

                  {inc.kind === 'ddos_spike' && (
                    <div style={{ fontSize: '11px', color: 'var(--ct-red)', margin: '4px 0 6px 0', fontWeight: 600 }}>
                      🌊 Traffic Surge: +{Math.round(((inc.trafficMultiplier ?? 4.5) - 1) * 100)}%
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    {inc.mitigationAction && (
                      <button
                        type="button"
                        className="ct-btn ct-btn--green ct-btn--sm"
                        disabled={!canAfford}
                        onClick={() => dispatch({ type: 'mitigateIncident', incidentId: inc.id })}
                        title={`Execute ${inc.mitigationAction} (${formatCurrency(inc.mitigationCostUsd ?? 100)})`}
                        style={{ flex: 1, padding: '4px 8px', fontSize: '11px' }}
                      >
                        <span>Fix (${inc.mitigationCostUsd ?? 100})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="ct-btn ct-btn--ghost ct-btn--sm"
                      onClick={() => handleDismissIncident(inc.id)}
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                      <XCircle size={11} />
                      <span>Ack</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Selected Node Inspector */}
      {selectedNode ? (
        <section className="ct-rail__section" aria-label={`Inspector for ${selectedNode.name}`}>
          <NodeInspector node={selectedNode} />
        </section>
      ) : (
        /* Cluster Node Inventory List */
        <section className="ct-rail__section">
          <h2 className="ct-rail__title">
            <Server size={13} className="inline mr-1" />
            Cluster Nodes ({nodesList.length})
          </h2>
          {nodesList.length === 0 ? (
            <p className="ct-empty">
              No nodes deployed. Select a tool from the top toolbar to deploy server infrastructure.
            </p>
          ) : (
            <ul className="ct-node-list">
              {nodesList.map((node) => {
                const tmpl = NODE_TEMPLATES[node.kind];
                const isSelected = node.id === sim.selectedNodeId;
                const statusMeta = STATUS_NON_COLOR_LABELS[node.status] || {
                  label: node.status.toUpperCase(),
                  glyph: '•',
                };
                return (
                  <li key={node.id}>
                    <button
                      type="button"
                      className="ct-node-row"
                      aria-current={isSelected}
                      onClick={() => handleSelectNode(node.id)}
                      aria-label={`${node.name}, ${tmpl.label}, ${statusMeta.glyph} ${statusMeta.label}`}
                    >
                      <span className="ct-node-row__glyph" style={{ color: tmpl.accentVar }}>
                        {tmpl.glyph}
                      </span>
                      <span className="ct-node-row__name">{node.name}</span>
                      <span className={`ct-node-row__status ct-status--${node.status}`}>
                        {statusMeta.glyph} {statusMeta.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </aside>
  );
};
