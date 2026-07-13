import type { WorkflowNode, WorkflowEdge } from '../../types/workflow';
import { NODE_TYPE_CONFIG, NODE_WIDTH, NODE_HEIGHT } from '../../lib/workflowMocks';

const MAP_W = 160;
const MAP_H = 100;
const PADDING = 20;

interface MiniMapProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export function MiniMap({ nodes, edges }: MiniMapProps) {
  if (nodes.length === 0) return null;

  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  const minX = Math.min(...xs) - PADDING;
  const minY = Math.min(...ys) - PADDING;
  const maxX = Math.max(...xs) + NODE_WIDTH + PADDING;
  const maxY = Math.max(...ys) + NODE_HEIGHT + PADDING;
  const sceneW = maxX - minX || 1;
  const sceneH = maxY - minY || 1;

  const sx = MAP_W / sceneW;
  const sy = MAP_H / sceneH;
  const s  = Math.min(sx, sy);

  function toMap(x: number, y: number) {
    return { x: (x - minX) * s, y: (y - minY) * s };
  }

  return (
    <div
      className="absolute bottom-4 right-4 bg-surface-900/90 border border-surface-700 rounded-xl overflow-hidden shadow-xl backdrop-blur-sm"
      style={{ width: MAP_W + 16, height: MAP_H + 16 }}
    >
      <svg width={MAP_W} height={MAP_H} style={{ margin: 8 }}>
        {/* Edges */}
        {edges.map(edge => {
          const src = nodes.find(n => n.id === edge.sourceNodeId);
          const tgt = nodes.find(n => n.id === edge.targetNodeId);
          if (!src || !tgt) return null;
          const p1 = toMap(src.x + NODE_WIDTH, src.y + NODE_HEIGHT / 2);
          const p2 = toMap(tgt.x, tgt.y + NODE_HEIGHT / 2);
          return (
            <line key={edge.id} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke="rgba(148,163,184,0.2)" strokeWidth="1" />
          );
        })}
        {/* Nodes */}
        {nodes.map(node => {
          const cfg = NODE_TYPE_CONFIG[node.type];
          const p = toMap(node.x, node.y);
          const w = NODE_WIDTH * s;
          const h = NODE_HEIGHT * s;
          return (
            <rect key={node.id}
              x={p.x} y={p.y}
              width={Math.max(w, 4)} height={Math.max(h, 3)}
              rx={2}
              fill={cfg.bg}
              stroke={cfg.color}
              strokeWidth="0.5"
              opacity={0.9}
            />
          );
        })}
      </svg>
    </div>
  );
}
