import { Point2D, CameraState, ClusterNode, NodeKind } from '../types/game';
import { NODE_DIMENSIONS, SNAP_STEP } from '../constants/gameConfig';

export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 2.5;

export function clamp(val: number, min: number, max: number): number {
  if (Number.isNaN(val)) return min;
  return Math.max(min, Math.min(max, val));
}

export function snapCoord(coord: number, step: number = SNAP_STEP): number {
  return Math.round(coord / step) * step;
}

export function snapPoint(p: Point2D, step: number = SNAP_STEP): Point2D {
  return {
    x: snapCoord(p.x, step),
    y: snapCoord(p.y, step),
  };
}

export function screenToWorld(
  screenPoint: Point2D,
  camera: CameraState,
  viewport: { w: number; h: number }
): Point2D {
  return {
    x: (screenPoint.x - viewport.w / 2) / camera.zoom + camera.x,
    y: (screenPoint.y - viewport.h / 2) / camera.zoom + camera.y,
  };
}

export function worldToScreen(
  worldPoint: Point2D,
  camera: CameraState,
  viewport: { w: number; h: number }
): Point2D {
  return {
    x: (worldPoint.x - camera.x) * camera.zoom + viewport.w / 2,
    y: (worldPoint.y - camera.y) * camera.zoom + viewport.h / 2,
  };
}

export function zoomAtScreenPoint(
  camera: CameraState,
  viewport: { w: number; h: number },
  screenFocus: Point2D,
  zoomFactor: number
): CameraState {
  const newZoom = clamp(camera.zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);
  if (newZoom === camera.zoom) return camera;

  const worldBefore = screenToWorld(screenFocus, camera, viewport);
  const worldAfter = screenToWorld(screenFocus, { ...camera, zoom: newZoom }, viewport);

  return {
    x: camera.x + (worldBefore.x - worldAfter.x),
    y: camera.y + (worldBefore.y - worldAfter.y),
    zoom: newZoom,
  };
}

export function getNodePort(node: ClusterNode, direction: 'in' | 'out'): Point2D {
  const dims = NODE_DIMENSIONS[node.kind];
  return {
    x: node.pos.x + (direction === 'in' ? -dims.w / 2 : dims.w / 2),
    y: node.pos.y,
  };
}

export interface BezierCurveResult {
  d: string;
  from: Point2D;
  to: Point2D;
  length: number;
}

export function computeCubicBezier(from: Point2D, to: Point2D): BezierCurveResult {
  const isRightward = to.x >= from.x;
  const dirMultiplier = isRightward ? 1 : -1;
  const curvature = Math.max(48, Math.abs(to.x - from.x) * 0.52);

  const cp1 = { x: from.x + curvature * dirMultiplier, y: from.y };
  const cp2 = { x: to.x - curvature * dirMultiplier, y: to.y };

  const d = `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} C ${cp1.x.toFixed(1)} ${cp1.y.toFixed(1)}, ${cp2.x.toFixed(1)} ${cp2.y.toFixed(1)}, ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
  const length = Math.hypot(to.x - from.x, to.y - from.y);

  return { d, from, to, length };
}

export function getEdgePath(fromNode: ClusterNode, toNode: ClusterNode): BezierCurveResult {
  const isRightward = toNode.pos.x >= fromNode.pos.x;
  const fromPort = getNodePort(fromNode, isRightward ? 'out' : 'in');
  const toPort = getNodePort(toNode, isRightward ? 'in' : 'out');
  return computeCubicBezier(fromPort, toPort);
}

export function fitCameraToNodes(
  nodes: ClusterNode[],
  viewport: { w: number; h: number },
  padding: number = 100
): CameraState {
  if (nodes.length === 0 || viewport.w === 0 || viewport.h === 0) {
    return { x: 0, y: 0, zoom: 1 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const dim = NODE_DIMENSIONS[node.kind];
    minX = Math.min(minX, node.pos.x - dim.w / 2);
    minY = Math.min(minY, node.pos.y - dim.h / 2);
    maxX = Math.max(maxX, node.pos.x + dim.w / 2);
    maxY = Math.max(maxY, node.pos.y + dim.h / 2);
  }

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  const zoomX = (viewport.w - padding * 2) / width;
  const zoomY = (viewport.h - padding * 2) / height;
  const targetZoom = clamp(Math.min(zoomX, zoomY, 1.25), MIN_ZOOM, MAX_ZOOM);

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    zoom: targetZoom,
  };
}

export function findNextNodeDirectionally(
  currentNode: ClusterNode | null,
  allNodes: ClusterNode[],
  dirX: number,
  dirY: number
): ClusterNode | null {
  if (!currentNode) return allNodes[0] || null;

  let bestNode: ClusterNode | null = null;
  let bestScore = Infinity;

  for (const node of allNodes) {
    if (node.id === currentNode.id) continue;
    const dx = node.pos.x - currentNode.pos.x;
    const dy = node.pos.y - currentNode.pos.y;

    // Dot product in target direction
    const forwardDistance = dx * dirX + dy * dirY;
    if (forwardDistance <= 4) continue; // Not in target direction

    // Cross product / lateral deviation
    const lateralDistance = Math.abs(dx * dirY - dy * dirX);
    const score = forwardDistance + lateralDistance * 2.5;

    if (score < bestScore) {
      bestScore = score;
      bestNode = node;
    }
  }

  return bestNode;
}
