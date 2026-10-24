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

  // Determine number of particle comets traveling the wire
  const packetCount = Math.max(2, Math.min(8, Math.round(2 + edge.throughputRps / 80)));
  const packetRadius = 3 + loadRatio * 2;

  return (
    <g
      data-ct-edge={edge.id}
      className={`ct-edge ${isSaturated ? 'ct-edge--saturated' : ''}`}
      style={{ color: edgeColor }}
    >
      {/* Invisible thicker path for hit testing / Alt+Click cutting */}
      <path className="ct-edge__cut" d={curve.d}>
        <title>Alt+Click to sever link</title>
      </path>

      {/* Dark background casing */}
      <path className="ct-edge__casing" d={curve.d} />

      {/* Main wire glow line */}
      <path
        className="ct-edge__line"
        d={curve.d}
        stroke={edgeColor}
        strokeDasharray={isSaturated ? '7 5' : undefined}
      />

      {/* Animated dashed electricity flow */}
      <path
        className="ct-edge__flow"
        d={curve.d}
        stroke={edgeColor}
        style={{ animationDuration: `${animDuration}s` }}
      />

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
