import React, { memo } from 'react';
import { ClusterNode, NodeStatus } from '../../types/game';
import {
  NODE_DIMENSIONS,
  NODE_TEMPLATES,
  formatPercent,
  formatGb,
  formatRps,
  CPU_TIER_CONFIG,
  RAM_TIER_CONFIG,
  STATUS_NON_COLOR_LABELS,
} from '../../constants/gameConfig';

interface NodeElementProps {
  node: ClusterNode;
  selected: boolean;
  tabbable: boolean;
  dragging: boolean;
}

const NODE_ICONS: Record<string, string[]> = {
  entry: ['M12 3v10', 'M7.5 9.5 12 14l4.5-4.5', 'M4 20h16'],
  loadbalancer: [
    'M12 3v4',
    'M12 7H7v3',
    'M12 7h5v3',
    'M7 10v4',
    'M17 10v4',
    'M5 20h4',
    'M15 20h4',
  ],
  server: [
    'M4 6h16',
    'M4 12h16',
    'M4 18h16',
    'M7 6h.01',
    'M7 12h.01',
    'M7 18h.01',
  ],
  cache: [
    'M12 3v3',
    'M18.4 5.6l-2.1 2.1',
    'M21 12h-3',
    'M18.4 18.4l-2.1-2.1',
    'M12 21v-3',
    'M5.6 18.4l2.1-2.1',
    'M3 12h3',
    'M5.6 5.6l2.1 2.1',
  ],
  database: [
    'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Z',
    'M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6',
    'M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  ],
  storage: [
    'M3 8h18l-2.2 11.2A2 2 0 0 1 16.8 21H7.2a2 2 0 0 1-2-1.8L3 8Z',
    'M3.6 8 5.5 4h13l1.9 4',
  ],
};

const STATUS_COLORS: Record<NodeStatus, string> = {
  nominal: 'var(--ct-green)',
  warning: 'var(--ct-amber)',
  critical: 'var(--ct-red)',
  offline: 'var(--ct-text-faint)',
  meltdown: 'var(--ct-red)',
};

export const NodeElement: React.FC<NodeElementProps> = memo(
  ({ node, selected, tabbable, dragging }) => {
    const dims = NODE_DIMENSIONS[node.kind];
    const tmpl = NODE_TEMPLATES[node.kind];
    const statusColor = STATUS_COLORS[node.status];
    const accentColor = tmpl.accentVar;

    const cpuTier = node.cpuTier ?? 0;
    const ramTier = node.ramTier ?? 0;
    const cpuTierConfig = CPU_TIER_CONFIG[cpuTier] || CPU_TIER_CONFIG[0];
    const ramTierConfig = RAM_TIER_CONFIG[ramTier] || RAM_TIER_CONFIG[0];

    const posX = node.pos.x - dims.w / 2;
    const posY = node.pos.y - dims.h / 2;

    const hasComputeMeters = node.kind !== 'entry' && node.kind !== 'storage';
    const cpuRatio = Math.max(0, Math.min(1, node.cpuUtilization));
    const ramRatio = node.ramGb > 0 ? Math.max(0, Math.min(1, node.ramUsedGb / node.ramGb)) : 0;
    const meterWidth = dims.w - 24;

    const cpuMeterColor =
      cpuRatio >= 0.92
        ? 'var(--ct-load-crit)'
        : cpuRatio >= 0.75
        ? 'var(--ct-load-warn)'
        : 'var(--ct-load-ok)';

    const ramMeterColor =
      ramRatio >= 0.9
        ? 'var(--ct-load-crit)'
        : ramRatio >= 0.75
        ? 'var(--ct-load-warn)'
        : 'var(--ct-load-ok)';

    const cornerMargin = 5;
    const cornerArm = 9;
    const bracketsPath = `
      M ${cornerMargin} ${cornerMargin + cornerArm} V ${cornerMargin} H ${cornerMargin + cornerArm}
      M ${dims.w - cornerMargin - cornerArm} ${cornerMargin} H ${dims.w - cornerMargin} V ${cornerMargin + cornerArm}
      M ${cornerMargin} ${dims.h - cornerMargin - cornerArm} V ${dims.h - cornerMargin} H ${cornerMargin + cornerArm}
      M ${dims.w - cornerMargin - cornerArm} ${dims.h - cornerMargin} H ${dims.w - cornerMargin} V ${dims.h - cornerMargin - cornerArm}
    `;

    const iconX = 14;
    const iconY = dims.h / 2 - 16;
    const iconPaths = NODE_ICONS[node.kind] || NODE_ICONS.server;

    const statusMeta = STATUS_NON_COLOR_LABELS[node.status] || { label: node.status.toUpperCase(), glyph: '•' };

    return (
      <g
        data-ct-node={node.id}
        className={`ct-node ${selected ? 'ct-node--selected' : ''}`}
        role="button"
        tabIndex={tabbable ? 0 : -1}
        aria-label={`${node.name} (${tmpl.label}) in [${node.availabilityZone ?? node.region ?? 'us-east-1'}], ${node.powerFluctuating ? '[⚡ POWER FLUCTUATING: INTERMITTENT BROWNOUT] ' : ''}Status: ${statusMeta.glyph} ${statusMeta.label}, CPU: ${formatPercent(node.cpuUtilization)}, RAM: ${node.ramGb > 0 ? `${node.ramUsedGb}/${node.ramGb} GB` : 'N/A'}, Throughput: ${formatRps(node.currentRps)}. Press Enter or Space to inspect.`}
      >
        {/* Selection Focus Ring */}
        {selected && (
          <rect
            className="ct-node__focus"
            x={posX - 4}
            y={posY - 4}
            width={dims.w + 8}
            height={dims.h + 8}
            rx={6}
            aria-hidden="true"
          />
        )}

        {/* Drag Ghost Shadow */}
        {dragging && (
          <rect
            className="ct-node__carry"
            x={posX - 6}
            y={posY - 6}
            width={dims.w + 12}
            height={dims.h + 12}
            rx={6}
            aria-hidden="true"
          />
        )}

        {/* Interactive Hit Area */}
        <rect
          className="ct-node__hit"
          x={posX}
          y={posY}
          width={dims.w}
          height={dims.h}
        />

        {/* Node Body */}
        <g className="ct-node__body" transform={`translate(${posX} ${posY})`} aria-hidden="true">
          {/* Ground drop shadow */}
          <ellipse
            className="ct-node__ground"
            cx={dims.w / 2}
            cy={dims.h + 6}
            rx={dims.w / 2 + 6}
            ry={6}
          />

          {/* Warning / Critical / Meltdown Pulsing Halo */}
          {node.status !== 'nominal' && (
            <rect
              className="ct-node__halo"
              width={dims.w}
              height={dims.h}
              rx={10}
              color={statusColor}
              data-status={node.status}
              style={{ stroke: statusColor }}
            />
          )}

          {/* 3D Chassis Side Plate */}
          <rect
            className="ct-node__side"
            x={0}
            y={5}
            width={dims.w}
            height={dims.h}
            rx={10}
          />

          {/* Main Chassis Front */}
          <rect
            className="ct-node__chassis"
            width={dims.w}
            height={dims.h}
            rx={10}
            data-status={node.status}
            style={{ stroke: statusColor }}
          />

          {/* Top highlight rim */}
          <path
            className="ct-node__rim"
            d={`M 10 0.75 H ${dims.w - 10}`}
          />

          {/* Cyber Corner Brackets */}
          <path
            className="ct-node__brackets"
            d={bracketsPath}
            stroke={cpuTier > 0 ? cpuTierConfig.color : accentColor}
          />

          {/* Region / AZ Rack Identifier */}
          <text
            x={12}
            y={14}
            className="ct-node__az-badge"
            fill="var(--ct-text-muted)"
            style={{ fontSize: '8px', fontFamily: 'monospace', letterSpacing: '0.04em', opacity: 0.75 }}
          >
            {(node.availabilityZone || node.region || 'us-east-1a').toUpperCase()}
          </text>

          {/* Tier-based Visual Core Indicators */}
          {/* Base Core Circle Backdrop */}
          <circle
            className={`ct-node__core ${cpuTier >= 3 ? 'ct-node__core--high-tier' : ''}`}
            cx={iconX + 12}
            cy={iconY + 12}
            r={13}
            color={cpuTier > 0 ? cpuTierConfig.color : accentColor}
            stroke={cpuTier > 0 ? cpuTierConfig.color : accentColor}
            strokeWidth={cpuTier >= 2 ? 1.5 : 1}
          />

          {/* CPU Tier 1+: Concentric Die Ring */}
          {cpuTier >= 1 && (
            <circle
              className="ct-node__core-ring-1"
              cx={iconX + 12}
              cy={iconY + 12}
              r={16.5}
              fill="none"
              stroke={cpuTierConfig.color}
              strokeWidth={1.2}
              strokeDasharray={cpuTier >= 2 ? '4 2' : undefined}
              opacity={0.85}
              style={{ filter: `drop-shadow(0 0 3px ${cpuTierConfig.color})` }}
            />
          )}

          {/* CPU Tier 2+: 4 Silicon Micro-Die Nodes */}
          {cpuTier >= 2 && (
            <g className="ct-node__core-quad" stroke={cpuTierConfig.color} strokeWidth={1.2}>
              <circle cx={iconX + 12 - 17} cy={iconY + 12} r={1.5} fill={cpuTierConfig.color} />
              <circle cx={iconX + 12 + 17} cy={iconY + 12} r={1.5} fill={cpuTierConfig.color} />
              <circle cx={iconX + 12} cy={iconY + 12 - 17} r={1.5} fill={cpuTierConfig.color} />
              <circle cx={iconX + 12} cy={iconY + 12 + 17} r={1.5} fill={cpuTierConfig.color} />
            </g>
          )}

          {/* CPU Tier 3+: Hexagonal Energy Mesh */}
          {cpuTier >= 3 && (
            <polygon
              className="ct-node__core-mesh"
              points={`
                ${iconX + 12},${iconY + 12 - 19}
                ${iconX + 12 + 16.5},${iconY + 12 - 9.5}
                ${iconX + 12 + 16.5},${iconY + 12 + 9.5}
                ${iconX + 12},${iconY + 12 + 19}
                ${iconX + 12 - 16.5},${iconY + 12 + 9.5}
                ${iconX + 12 - 16.5},${iconY + 12 - 9.5}
              `}
              fill="none"
              stroke={cpuTierConfig.color}
              strokeWidth={1}
              opacity={0.65}
            />
          )}

          {/* CPU Tier 4: Quantum Overdrive Reactor Ring */}
          {cpuTier >= 4 && (
            <circle
              className="ct-node__core-quantum"
              cx={iconX + 12}
              cy={iconY + 12}
              r={20.5}
              fill="none"
              stroke="var(--ct-gold-hot)"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              style={{ filter: 'drop-shadow(0 0 6px var(--ct-gold-glow))' }}
            />
          )}

          {/* Tech SVG Vector Icon */}
          <g
            className="ct-node__icon"
            color={cpuTier > 0 ? cpuTierConfig.color : accentColor}
            stroke={cpuTier > 0 ? cpuTierConfig.color : accentColor}
            transform={`translate(${iconX} ${iconY})`}
          >
            {iconPaths.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>

          {/* RAM Physical DIMM Bank Indicators (Upper right) */}
          {node.ramGb > 0 && (
            <g
              className="ct-node__ram-banks"
              transform={`translate(${dims.w - 54}, 18)`}
            >
              <title>{`RAM: ${ramTierConfig.name} (${formatGb(node.ramGb)})`}</title>
              {[0, 1, 2, 3].map((slotIdx) => {
                const isSlotActive = ramTier >= slotIdx;
                const slotColor = isSlotActive ? ramTierConfig.color : 'var(--ct-surface-3)';
                return (
                  <rect
                    key={slotIdx}
                    x={slotIdx * 6}
                    y={0}
                    width={3.5}
                    height={8}
                    rx={1}
                    fill={slotColor}
                    opacity={isSlotActive ? 0.95 : 0.3}
                    style={
                      isSlotActive
                        ? { filter: `drop-shadow(0 0 2.5px ${ramTierConfig.color})` }
                        : undefined
                    }
                  />
                );
              })}
            </g>
          )}

          {/* Upgraded Hardware Tier Badge */}
          {(cpuTier > 0 || ramTier > 0) && (
            <text
              x={dims.w - 24}
              y={12}
              textAnchor="end"
              className="ct-node__tier-badge"
              fill={cpuTierConfig.color}
            >
              T{Math.max(cpuTier, ramTier) + 1}
            </text>
          )}

          {/* Pulsing Status LED & Non-Color Accessible Glyph */}
          <g className="ct-node__status-group">
            <circle
              className="ct-node__led"
              cx={dims.w - 14}
              cy={14}
              r={4.5}
              data-status={node.status}
              fill={statusColor}
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={0.75}
            />
            {/* Explicit non-color symbol text so color blindness does not impede perception */}
            <text
              x={dims.w - 22}
              y={16}
              textAnchor="end"
              className="ct-node__status-symbol"
              fill={statusColor}
              style={{ fontSize: '9px', fontWeight: 'bold', fontFamily: 'monospace' }}
            >
              {statusMeta.glyph} {statusMeta.label}
            </text>
          </g>

          {/* DDoS Shield Badge */}
          {node.shielded && (
            <g transform={`translate(${dims.w - 28}, 24)`}>
              <path
                d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                fill="none"
                stroke="var(--ct-cyan)"
                strokeWidth="1.5"
                transform="scale(0.55)"
              />
            </g>
          )}

          {/* Power Fluctuation Spark Indicator */}
          {node.powerFluctuating && (
            <g transform={`translate(${dims.w - 46}, 24)`}>
              <rect
                x={0}
                y={0}
                width={15}
                height={12}
                rx={2}
                fill="rgba(255, 170, 0, 0.2)"
                stroke="var(--ct-amber)"
                strokeWidth={0.75}
              />
              <path
                d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"
                fill="var(--ct-amber)"
                transform="scale(0.42) translate(4, -1)"
              />
            </g>
          )}

          {/* CPU & RAM Telemetry Meters */}
          {hasComputeMeters ? (
            <>
              {/* CPU Meter */}
              <rect
                className="ct-node__meter"
                x={12}
                y={dims.h - 20}
                width={meterWidth}
                height={5}
                rx={2.5}
              />
              <rect
                className="ct-node__meter-fill"
                x={12}
                y={dims.h - 20}
                width={Math.max(0, meterWidth * cpuRatio)}
                height={5}
                rx={2.5}
                fill={cpuMeterColor}
              />
              {/* 75% Load Tick Mark */}
              <rect
                className="ct-node__meter-tick"
                x={12 + meterWidth * 0.75}
                y={dims.h - 21.5}
                width={1.5}
                height={8}
              />

              {/* RAM Meter */}
              <rect
                className="ct-node__meter"
                x={12}
                y={dims.h - 11}
                width={meterWidth}
                height={5}
                rx={2.5}
              />
              <rect
                className="ct-node__meter-fill"
                x={12}
                y={dims.h - 11}
                width={Math.max(0, meterWidth * ramRatio)}
                height={5}
                rx={2.5}
                fill={ramMeterColor}
              />
            </>
          ) : (
            <rect
              className="ct-node__meter"
              x={12}
              y={dims.h - 14}
              width={meterWidth}
              height={5}
              rx={2.5}
            />
          )}
        </g>
      </g>
    );
  }
);

NodeElement.displayName = 'NodeElement';
