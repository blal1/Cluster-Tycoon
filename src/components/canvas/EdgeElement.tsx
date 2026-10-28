import React, { memo } from 'react';
import { ClusterEdge, ClusterNode } from '../../types/game';
import { getEdgePath } from '../../sim/graphGeometry';

interface EdgeElementProps {
  edge: ClusterEdge;
  fromNode: ClusterNode;
  toNode: ClusterNode;
}

export const EdgeElement: React.FC<EdgeElementProps> = memo(({ edge, fromNode, toNode }) => {
  const curve = getEdgePath(fromNode, toNode);

  // Compute color based on edge load
  const loadRatio = Math.max(0, Math.min(1, edge.load));
  const isSaturated = loadRatio >= 0.75;
  const isCritical = loadRatio >= 0.92;

  const edgeColor = isCritical
    ? 'var(--ct-load-crit)'
    : isSaturated
    ? 'var(--ct-load-warn)'
    : 'var(--ct-load-ok)';

  // Packet animation speed: faster for higher throughput and lower latency
  const clampedLatency = Math.max(1, Math.min(600, edge.latencyMs));
  const animDuration = Math.max(0.4, Math.min(2.2, 0.55 + clampedLatency / 400));

  const isCrossRegion = edge.isCrossRegion || (fromNode.region && toNode.region && fromNode.region !== toNode.region);
  const midX = (curve.from.x + curve.to.x) / 2;
  const midY = (curve.from.y + curve.to.y) / 2;

  // Determine number of particle comets traveling the wire (none if severed)
  const packetCount = edge.severed ? 0 : Math.max(2, Math.min(8, Math.round(2 + edge.throughputRps / 80)));
  const packetRadius = 3 + loadRatio * 2;

  return (
    <g
      data-ct-edge={edge.id}
      className={`ct-edge ${isSaturated ? 'ct-edge--saturated' : ''} ${isCrossRegion ? 'ct-edge--wan' : ''}`}
      style={{ color: edge.severed ? 'var(--ct-red)' : edgeColor }}
    >
      {/* Invisible thicker path for hit testing / Alt+Click cutting */}
      <path className="ct-edge__cut" d={curve.d}>
        <title>{isCrossRegion ? `Cross-Region WAN Link (+${Math.round(edge.crossRegionLatencyMs || 72)}ms). Alt+Click to sever.` : 'Alt+Click to sever link'}</title>
      </path>

      {/* Dark background casing */}
      <path className="ct-edge__casing" d={curve.d} />

      {/* Main wire glow line */}
      <path
        className="ct-edge__line"
        d={curve.d}
        stroke={edge.severed ? 'var(--ct-red)' : edgeColor}
        strokeDasharray={edge.severed ? '4 4' : isCrossRegion ? '8 4' : isSaturated ? '7 5' : undefined}
      />

      {/* Animated dashed electricity flow */}
      {!edge.severed && (
        <path
          className="ct-edge__flow"
          d={curve.d}
          stroke={edgeColor}
          style={{ animationDuration: `${animDuration}s` }}
        />
      )}

      {/* Cross-Region WAN Fiber Telemetry Badge */}
      {isCrossRegion && (
        <g transform={`translate(${midX}, ${midY})`} className="ct-edge__wan-badge" pointerEvents="none">
          {edge.severed ? (
            <g>
              <rect
                x={-44}
                y={-10}
                width={88}
                height={20}
                rx={4}
                fill="#1f0909"
                stroke="var(--ct-red)"
                strokeWidth={1.5}
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fill="var(--ct-red)"
                fontSize={9.5}
                fontFamily="var(--ct-mono)"
                fontWeight="700"
              >
                ✕ FIBER CUT
              </text>
            </g>
          ) : (
            <g>
              <rect
                x={-46}
                y={-10}
                width={92}
                height={20}
                rx={4}
                fill="#050a12"
                stroke="var(--ct-deck)"
                strokeWidth={1.2}
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fill="#67e8f9"
                fontSize={9}
                fontFamily="var(--ct-mono)"
                fontWeight="700"
              >
                ⚡ WAN +{Math.round(edge.crossRegionLatencyMs || 72)}ms
              </text>
            </g>
          )}
        </g>
      )}

      {/* Glowing request data packets traveling along the wire */}
      {Array.from({ length: packetCount }, (_, idx) => {
        const offsetDelay = -animDuration * (idx / packetCount);
        const cometStyle: React.CSSProperties = {
          offsetPath: `path("${curve.d}")`,
          animationDuration: `${animDuration}s`,
        };

        return (
          <g className="ct-comet" key={idx}>
            {/* Comet tail */}
            <circle
              className="ct-packet ct-packet--tail"
              r={packetRadius * 0.55}
              fill={edgeColor}
              style={{
                ...cometStyle,
                animationDelay: `${offsetDelay - 0.08}s`,
              }}
            />
            {/* Comet glowing head */}
            <circle
              className="ct-packet ct-packet--head"
              r={packetRadius}
              fill={edgeColor}
              style={{
                ...cometStyle,
                animationDelay: `${offsetDelay}s`,
              }}
            />
          </g>
        );
      })}
    </g>
  );
});

EdgeElement.displayName = 'EdgeElement';
