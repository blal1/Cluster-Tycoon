import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore, dispatch } from '../../store/gameStore';
import { NodeElement } from './NodeElement';
import { EdgeElement } from './EdgeElement';
import {
  screenToWorld,
  worldToScreen,
  zoomAtScreenPoint,
  snapPoint,
  computeCubicBezier,
  fitCameraToNodes,
  findNextNodeDirectionally,
  getNodePort,
} from '../../sim/graphGeometry';
import {
  GRID_CELL,
  GRID_MAJOR,
  NODE_DIMENSIONS,
  NODE_TEMPLATES,
  CLOUD_REGIONS,
  formatCurrency,
  formatRps,
} from '../../constants/gameConfig';
import { audio } from '../../audio/proceduralAudio';
import { ClusterNode, Point2D, CloudRegionId } from '../../types/game';

interface DragState {
  nodeId: string;
  grabWorld: Point2D;
  startPos: Point2D;
  latestPos: Point2D;
  moved: boolean;
}

interface PanState {
  startScreen: Point2D;
  startCamera: { x: number; y: number };
}

export const ClusterCanvas: React.FC = () => {
  const sim = useAppStore((s) => s.sim);
  const containerRef = useRef<SVGSVGElement | null>(null);

  const [viewport, setViewport] = useState({ w: 1000, h: 600 });
  const [hoverWorldPos, setHoverWorldPos] = useState<Point2D | null>(null);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const dragRef = useRef<DragState | null>(null);
  const panRef = useRef<PanState | null>(null);
  const animFrameRef = useRef<number>(0);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setViewport({ w: width, h: height });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const nodesList = useMemo(() => {
    return sim.nodeOrder.map((id) => sim.nodes[id]).filter((n): n is ClusterNode => !!n);
  }, [sim.nodeOrder, sim.nodes]);

  const edgesList = useMemo(() => {
    return Object.values(sim.edges);
  }, [sim.edges]);

  const selectedNode = sim.selectedNodeId ? sim.nodes[sim.selectedNodeId] ?? null : null;
  const isLinkTool = sim.activeTool.kind === 'connect';
  const isPlaceTool = sim.activeTool.kind !== 'select' && sim.activeTool.kind !== 'connect';
  const placeKind = isPlaceTool ? (sim.activeTool.kind as ClusterNode['kind']) : null;

  // Clear link source if invalid
  useEffect(() => {
    if (linkSourceId && !sim.nodes[linkSourceId]) {
      setLinkSourceId(null);
    }
  }, [linkSourceId, sim.nodes]);

  // Pointer Down
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      audio.init();

      const svg = containerRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const screenPos: Point2D = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const worldPos = screenToWorld(screenPos, sim.camera, viewport);

      const targetEl = e.target as Element;
      const nodeEl = targetEl.closest('[data-ct-node]');
      const edgeEl = targetEl.closest('[data-ct-edge]');

      // Alt+Click or Shift+Click wire cutting
      if (edgeEl && (e.altKey || e.shiftKey)) {
        const edgeId = edgeEl.getAttribute('data-ct-edge');
        if (edgeId) {
          dispatch({ type: 'deleteEdge', edgeId });
          return;
        }
      }

      // Click on a node
      if (nodeEl) {
        const clickedNodeId = nodeEl.getAttribute('data-ct-node');
        const clickedNode = clickedNodeId ? sim.nodes[clickedNodeId] : null;
        if (!clickedNodeId || !clickedNode) return;

        // In link tool mode: connect source -> target
        if (isLinkTool) {
          if (!linkSourceId) {
            setLinkSourceId(clickedNodeId);
            audio.playClick();
          } else {
            if (linkSourceId !== clickedNodeId) {
              dispatch({ type: 'connectNodes', fromId: linkSourceId, toId: clickedNodeId });
            }
            setLinkSourceId(null);
          }
          return;
        }

        // Selection & drag start
        if (clickedNodeId !== sim.selectedNodeId) {
          dispatch({ type: 'selectNode', nodeId: clickedNodeId });
          audio.playSelect();
        }

        svg.setPointerCapture(e.pointerId);
        dragRef.current = {
          nodeId: clickedNodeId,
          grabWorld: worldPos,
          startPos: clickedNode.pos,
          latestPos: clickedNode.pos,
          moved: false,
        };
        setDraggingNodeId(clickedNodeId);
        audio.playClick();
        return;
      }

      // Click on canvas background in place mode
      if (isPlaceTool && placeKind) {
        const snapped = snapPoint(worldPos);
        dispatch({ type: 'placeNode', kind: placeKind, pos: snapped });
        return;
      }

      // Reset link mode on background click
      if (isLinkTool) {
        setLinkSourceId(null);
        return;
      }

      // Background pan start
      dispatch({ type: 'selectNode', nodeId: null });
      svg.setPointerCapture(e.pointerId);
      panRef.current = {
        startScreen: screenPos,
        startCamera: { x: sim.camera.x, y: sim.camera.y },
      };
    },
    [isLinkTool, isPlaceTool, placeKind, linkSourceId, sim.camera, sim.nodes, sim.selectedNodeId, viewport]
  );

  // Pointer Move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svg = containerRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const screenPos: Point2D = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const worldPos = screenToWorld(screenPos, sim.camera, viewport);

      if (dragRef.current) {
        const drag = dragRef.current;
        const newWorldX = worldPos.x - drag.grabWorld.x + drag.startPos.x;
        const newWorldY = worldPos.y - drag.grabWorld.y + drag.startPos.y;
        const snapped = snapPoint({ x: newWorldX, y: newWorldY });

        if (snapped.x !== drag.latestPos.x || snapped.y !== drag.latestPos.y) {
          drag.moved = true;
          drag.latestPos = snapped;

          if (animFrameRef.current === 0) {
            animFrameRef.current = requestAnimationFrame(() => {
              animFrameRef.current = 0;
              if (dragRef.current) {
                dispatch({
                  type: 'moveNode',
                  nodeId: dragRef.current.nodeId,
                  pos: dragRef.current.latestPos,
                });
              }
            });
          }
        }
        return;
      }

      if (panRef.current) {
        const pan = panRef.current;
        const dx = (screenPos.x - pan.startScreen.x) / sim.camera.zoom;
        const dy = (screenPos.y - pan.startScreen.y) / sim.camera.zoom;
        dispatch({
          type: 'setCamera',
          camera: {
            x: pan.startCamera.x - dx,
            y: pan.startCamera.y - dy,
          },
        });
        return;
      }

      if (isPlaceTool || isLinkTool) {
        setHoverWorldPos(worldPos);
      }
    },
    [isLinkTool, isPlaceTool, sim.camera, viewport]
  );

  // Pointer Up
  const handlePointerUp = useCallback(() => {
    if (dragRef.current) {
      if (animFrameRef.current !== 0) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
      if (dragRef.current.moved) {
        dispatch({
          type: 'moveNode',
          nodeId: dragRef.current.nodeId,
          pos: dragRef.current.latestPos,
        });
        audio.playClick();
      }
      dragRef.current = null;
      setDraggingNodeId(null);
    }
    panRef.current = null;
  }, []);

  // Wheel Zoom
  useEffect(() => {
    const svg = containerRef.current;
    if (!svg) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const screenFocus: Point2D = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const zoomFactor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const nextCamera = zoomAtScreenPoint(sim.camera, viewport, screenFocus, zoomFactor);
      dispatch({ type: 'setCamera', camera: nextCamera });
    };

    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [sim.camera, viewport]);

  // Keyboard Shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGSVGElement>) => {
      audio.init();

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        const framed = fitCameraToNodes(nodesList, viewport);
        dispatch({ type: 'setCamera', camera: framed });
        audio.playClick();
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        const center: Point2D = { x: viewport.w / 2, y: viewport.h / 2 };
        const nextCamera = zoomAtScreenPoint(sim.camera, viewport, center, 1.15);
        dispatch({ type: 'setCamera', camera: nextCamera });
        return;
      }

      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        const center: Point2D = { x: viewport.w / 2, y: viewport.h / 2 };
        const nextCamera = zoomAtScreenPoint(sim.camera, viewport, center, 1 / 1.15);
        dispatch({ type: 'setCamera', camera: nextCamera });
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNode) {
          e.preventDefault();
          dispatch({ type: 'deleteNode', nodeId: selectedNode.id });
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (linkSourceId) {
          setLinkSourceId(null);
        } else if (selectedNode) {
          dispatch({ type: 'selectNode', nodeId: null });
        }
        return;
      }

      // Arrow navigation
      const dirMap: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };

      const dir = dirMap[e.key];
      if (dir) {
        e.preventDefault();
        if (e.shiftKey && selectedNode) {
          // Nudge selected node
          const step = 40;
          dispatch({
            type: 'moveNode',
            nodeId: selectedNode.id,
            pos: snapPoint({
              x: selectedNode.pos.x + dir[0] * step,
              y: selectedNode.pos.y + dir[1] * step,
            }),
          });
          audio.playClick();
          return;
        }

        const next = findNextNodeDirectionally(selectedNode, nodesList, dir[0], dir[1]);
        if (next) {
          dispatch({ type: 'selectNode', nodeId: next.id });
          audio.playSelect();
        }
      }
    },
    [nodesList, selectedNode, linkSourceId, sim.camera, viewport]
  );

  // Calculate grid dimensions
  const topLeftWorld = screenToWorld({ x: 0, y: 0 }, sim.camera, viewport);
  const botRightWorld = screenToWorld({ x: viewport.w, y: viewport.h }, sim.camera, viewport);

  const gridLeft = Math.floor(topLeftWorld.x / GRID_CELL) * GRID_CELL - GRID_CELL;
  const gridTop = Math.floor(topLeftWorld.y / GRID_CELL) * GRID_CELL - GRID_CELL;
  const gridWidth = botRightWorld.x - topLeftWorld.x + GRID_CELL * 2;
  const gridHeight = botRightWorld.y - topLeftWorld.y + GRID_CELL * 2;

  // Transform matrix for SVG camera
  const cameraTransform = `translate(${viewport.w / 2 - sim.camera.x * sim.camera.zoom} ${
    viewport.h / 2 - sim.camera.y * sim.camera.zoom
  }) scale(${sim.camera.zoom})`;

  // Link ghost curve
  const linkSourceNode = linkSourceId ? sim.nodes[linkSourceId] ?? null : null;
  const linkGhostPath = useMemo(() => {
    if (!linkSourceNode || !hoverWorldPos) return null;
    const isRightward = hoverWorldPos.x >= linkSourceNode.pos.x;
    const port = getNodePort(linkSourceNode, isRightward ? 'out' : 'in');
    return computeCubicBezier(port, hoverWorldPos).d;
  }, [linkSourceNode, hoverWorldPos]);

  return (
    <div className="ct-canvas">
      <svg
        ref={containerRef}
        className="ct-graph"
        role="region"
        aria-label="Interactive Cloud Infrastructure Canvas"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        <defs>
          {/* Minor 40px grid pattern */}
          <pattern
            id="ct-grid-minor"
            width={GRID_CELL}
            height={GRID_CELL}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${GRID_CELL} 0 L 0 0 0 ${GRID_CELL}`}
              className="ct-grid__minor"
              fill="none"
            />
          </pattern>

          {/* Major 200px grid pattern */}
          <pattern
            id="ct-grid-major"
            width={GRID_MAJOR}
            height={GRID_MAJOR}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${GRID_MAJOR} 0 L 0 0 0 ${GRID_MAJOR}`}
              className="ct-grid__major"
              fill="none"
            />
          </pattern>
        </defs>

        {/* Camera Root Group */}
        <g transform={cameraTransform}>
          {/* Render background grid */}
          <rect
            x={gridLeft}
            y={gridTop}
            width={gridWidth}
            height={gridHeight}
            fill="url(#ct-grid-minor)"
          />
          <rect
            x={gridLeft}
            y={gridTop}
            width={gridWidth}
            height={gridHeight}
            fill="url(#ct-grid-major)"
          />

          {/* Cloud Region Partitions & Availability Zones */}
          <g className="ct-regions-layer" pointerEvents="none">
            {Object.values(CLOUD_REGIONS).map((reg) => {
              const regNodes = nodesList.filter((n) => n.region === reg.id);
              const regHealth = sim.regionalHealth?.[reg.id] ?? 'nominal';
              const regRps = sim.regionalRps?.[reg.id] ?? 0;
              const width = reg.bounds.maxX - reg.bounds.minX;
              const height = 1800;
              const topY = -900;

              return (
                <g key={reg.id} className="ct-region-zone">
                  {/* Regional boundary background */}
                  <rect
                    x={reg.bounds.minX}
                    y={topY}
                    width={width}
                    height={height}
                    fill={reg.accentColor}
                    fillOpacity={0.015}
                    stroke={reg.accentColor}
                    strokeOpacity={0.16}
                    strokeWidth={1.5}
                    strokeDasharray="10 8"
                  />

                  {/* Horizontal Availability Zone divider at Y=0 */}
                  <line
                    x1={reg.bounds.minX}
                    y1={0}
                    x2={reg.bounds.maxX}
                    y2={0}
                    stroke={reg.accentColor}
                    strokeOpacity={0.12}
                    strokeDasharray="4 4"
                    strokeWidth={1}
                  />

                  {/* AZ Labels */}
                  <text
                    x={reg.bounds.minX + 20}
                    y={-14}
                    fill={reg.accentColor}
                    fillOpacity={0.45}
                    fontSize={11}
                    fontFamily="monospace"
                    fontWeight={600}
                  >
                    AZ-A :: {reg.primaryAzs[0]}
                  </text>
                  <text
                    x={reg.bounds.minX + 20}
                    y={22}
                    fill={reg.accentColor}
                    fillOpacity={0.45}
                    fontSize={11}
                    fontFamily="monospace"
                    fontWeight={600}
                  >
                    AZ-B :: {reg.primaryAzs[1]}
                  </text>

                  {/* Region Header Panel at Top */}
                  <g transform={`translate(${reg.bounds.minX + 20}, ${topY + 30})`}>
                    <rect
                      x={0}
                      y={0}
                      width={280}
                      height={58}
                      rx={6}
                      fill="#080c14"
                      stroke={reg.accentColor}
                      strokeOpacity={0.35}
                      strokeWidth={1.2}
                      style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
                    />
                    <text
                      x={14}
                      y={22}
                      fill="#f3f4f6"
                      fontSize={13}
                      fontFamily="monospace"
                      fontWeight={700}
                      letterSpacing="0.05em"
                    >
                      [{reg.flag}] {reg.name.toUpperCase()} · {reg.id}
                    </text>
                    <text
                      x={14}
                      y={42}
                      fill={
                        regHealth === 'blackout'
                          ? 'var(--ct-red)'
                          : regHealth === 'degraded'
                          ? 'var(--ct-amber)'
                          : 'var(--ct-green)'
                      }
                      fontSize={11}
                      fontFamily="monospace"
                      fontWeight={600}
                    >
                      {regHealth === 'blackout'
                        ? '✕ REGIONAL BLACKOUT'
                        : regHealth === 'degraded'
                        ? '▲ DEGRADED LOAD'
                        : '● REGION OPERATIONAL'}
                      {' · '}
                      <tspan fill="#9ca3af">{regNodes.length} nodes · {formatRps(regRps)}</tspan>
                    </text>
                  </g>
                </g>
              );
            })}
          </g>

          {/* Render edges */}
          <g className="ct-edges">
            {edgesList.map((edge) => {
              const fromNode = sim.nodes[edge.fromId];
              const toNode = sim.nodes[edge.toId];
              if (!fromNode || !toNode) return null;
              return (
                <EdgeElement
                  key={edge.id}
                  edge={edge}
                  fromNode={fromNode}
                  toNode={toNode}
                />
              );
            })}
          </g>

          {/* Render ghost connection line */}
          {linkGhostPath && <path className="ct-link-ghost" d={linkGhostPath} />}

          {/* Render placement preview ghost */}
          {isPlaceTool && placeKind && hoverWorldPos && (
            <rect
              className="ct-place-ghost"
              x={snapPoint(hoverWorldPos).x - NODE_DIMENSIONS[placeKind].w / 2}
              y={snapPoint(hoverWorldPos).y - NODE_DIMENSIONS[placeKind].h / 2}
              width={NODE_DIMENSIONS[placeKind].w}
              height={NODE_DIMENSIONS[placeKind].h}
              rx={8}
              stroke={NODE_TEMPLATES[placeKind].accentVar}
            />
          )}

          {/* Render nodes */}
          <g className="ct-nodes">
            {nodesList.map((node) => (
              <NodeElement
                key={node.id}
                node={node}
                selected={node.id === sim.selectedNodeId}
                tabbable={node.id === (sim.selectedNodeId || nodesList[0]?.id)}
                dragging={node.id === draggingNodeId}
              />
            ))}
          </g>
        </g>

        {/* World Labels Overlaid in Screen Space */}
        <g className="ct-graph__labels" aria-hidden="true">
          {nodesList.map((node) => {
            const dims = NODE_DIMENSIONS[node.kind];
            const screen = worldToScreen(
              { x: node.pos.x - dims.w / 2, y: node.pos.y - dims.h / 2 },
              sim.camera,
              viewport
            );
            return (
              <g key={node.id} className="ct-graph__label">
                <text className="ct-graph__name" x={screen.x} y={screen.y - 7} textAnchor="start">
                  {node.name}
                </text>
                <text
                  className="ct-graph__status"
                  x={screen.x + dims.w * sim.camera.zoom}
                  y={screen.y - 7}
                  textAnchor="end"
                  data-status={node.status}
                >
                  {node.status.toUpperCase()}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Multi-Region Camera Navigation Bar */}
      <div className="ct-canvas__regions-bar" role="toolbar" aria-label="Cloud Regions Jump Navigation">
        <span className="ct-canvas__regions-title">REGIONS:</span>
        <button
          type="button"
          className="ct-canvas__region-btn"
          onClick={() => {
            audio.playClick();
            dispatch({ type: 'setCamera', camera: { x: 300, y: 0, zoom: 0.6 } });
          }}
          title="Zoom out to view all global regions"
        >
          All Regions
        </button>
        {Object.values(CLOUD_REGIONS).map((reg) => {
          const centerX = (reg.bounds.minX + reg.bounds.maxX) / 2;
          const regHealth = sim.regionalHealth?.[reg.id] ?? 'nominal';
          const regNodes = nodesList.filter((n) => n.region === reg.id);
          return (
            <button
              key={reg.id}
              type="button"
              className={`ct-canvas__region-btn ${regHealth === 'blackout' ? 'ct-canvas__region-btn--blackout' : ''}`}
              onClick={() => {
                audio.playClick();
                dispatch({ type: 'setCamera', camera: { x: centerX, y: 0, zoom: 0.95 } });
              }}
              title={`Center camera on ${reg.name} (${reg.id})`}
            >
              <span className={`ct-region-dot ct-region-dot--${regHealth}`} />
              <span>{reg.id}</span>
              <span className="opacity-60 text-[10px]">({regNodes.length})</span>
            </button>
          );
        })}
      </div>

      {/* Mode hint legend at bottom */}
      <div className="ct-canvas__legend">
        {isPlaceTool && placeKind ? (
          <span>
            DEPLOY MODE: Click to place {NODE_TEMPLATES[placeKind].label} (
            {formatCurrency(NODE_TEMPLATES[placeKind].costUsd)}). Esc to cancel.
          </span>
        ) : isLinkTool ? (
          <span>
            LINK MODE:{' '}
            {linkSourceNode ? `Connecting from ${linkSourceNode.name}. Click destination node.` : 'Click source node, then destination node.'}{' '}
            Esc to cancel.
          </span>
        ) : (
          <span>
            CLICK & DRAG to pan/move. WHEEL to zoom. [F] to frame. ALT+CLICK wire to cut. [SPACE] command menu.
          </span>
        )}
      </div>
    </div>
  );
};
