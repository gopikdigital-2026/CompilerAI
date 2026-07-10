import React, { useState, useCallback } from 'react';
import { GRAPH_NODES, GRAPH_EDGES } from '../../lib/memoryMocks';
import type { GraphNode, GraphNodeType } from '../../types/memory';

// ─── Node visual config ───────────────────────────────────────────────────────

const NODE_COLORS: Record<GraphNodeType, { fill: string; stroke: string; text: string; glow: string }> = {
  hub:      { fill: '#4f46e5', stroke: '#818cf8', text: '#e0e7ff', glow: '#4f46e5' },
  agent:    { fill: '#0369a1', stroke: '#38bdf8', text: '#bae6fd', glow: '#0369a1' },
  client:   { fill: '#065f46', stroke: '#34d399', text: '#a7f3d0', glow: '#065f46' },
  workflow: { fill: '#92400e', stroke: '#fbbf24', text: '#fef3c7', glow: '#92400e' },
  document: { fill: '#155e75', stroke: '#22d3ee', text: '#cffafe', glow: '#155e75' },
  process:  { fill: '#7c2d12', stroke: '#fb923c', text: '#fed7aa', glow: '#7c2d12' },
};

const TYPE_LABELS: Record<GraphNodeType, string> = {
  hub:      'Hub',
  agent:    'Agente',
  client:   'Cliente',
  workflow: 'Workflow',
  document: 'Documento',
  process:  'Proceso',
};

// ─── Edge path (smooth cubic bezier) ─────────────────────────────────────────

function edgePath(sx: number, sy: number, tx: number, ty: number): string {
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const nx = -dy * 0.2;
  const ny =  dx * 0.2;
  return `M ${sx} ${sy} Q ${mx + nx} ${my + ny} ${tx} ${ty}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SemanticGraph() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<GraphNodeType>>(
    new Set(['hub', 'agent', 'client', 'workflow', 'document', 'process'])
  );
  const [tooltip, setTooltip] = useState<{ node: GraphNode; x: number; y: number } | null>(null);

  // Nodes connected to hovered node
  const connectedIds = hoveredNode
    ? new Set(GRAPH_EDGES
        .filter(e => e.source === hoveredNode || e.target === hoveredNode)
        .flatMap(e => [e.source, e.target]))
    : null;

  const toggleType = useCallback((type: GraphNodeType) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) { if (next.size > 1) next.delete(type); }
      else next.add(type);
      return next;
    });
  }, []);

  const visibleNodeIds = new Set(GRAPH_NODES.filter(n => activeTypes.has(n.type)).map(n => n.id));

  return (
    <div className="relative flex flex-col h-full bg-surface-950 overflow-hidden">
      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
        {(Object.keys(TYPE_LABELS) as GraphNodeType[]).map(type => {
          const cfg = NODE_COLORS[type];
          const active = activeTypes.has(type);
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-medium transition-all duration-200
                ${active ? '' : 'opacity-40'}`}
              style={{ borderColor: active ? cfg.stroke : '#334155', color: active ? cfg.text : '#475569' }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: cfg.stroke }} />
              {TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="absolute top-3 right-3 z-10 text-[10px] text-neutral-600 text-right">
        <p>{GRAPH_NODES.length} nodos · {GRAPH_EDGES.length} relaciones</p>
        <p className="text-neutral-700 mt-0.5">Hover sobre un nodo para explorar</p>
      </div>

      {/* SVG Canvas */}
      <svg
        viewBox="0 0 800 500"
        className="flex-1 w-full h-full"
        style={{ cursor: 'default' }}
      >
        <defs>
          {/* Glow filters per type */}
          {(Object.entries(NODE_COLORS) as [GraphNodeType, typeof NODE_COLORS[GraphNodeType]][]).map(([type, cfg]) => (
            <filter key={type} id={`glow-${type}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
          {/* Subtle grid */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" />
          </pattern>
          {/* Edge gradients */}
          <linearGradient id="edge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="800" height="500" fill="url(#grid)" />

        {/* Edges */}
        {GRAPH_EDGES.map(edge => {
          const src = GRAPH_NODES.find(n => n.id === edge.source);
          const tgt = GRAPH_NODES.find(n => n.id === edge.target);
          if (!src || !tgt) return null;
          if (!visibleNodeIds.has(src.id) || !visibleNodeIds.has(tgt.id)) return null;

          const isHighlighted = hoveredNode !== null &&
            (edge.source === hoveredNode || edge.target === hoveredNode);
          const isDimmed = hoveredNode !== null && !isHighlighted;

          return (
            <path
              key={edge.id}
              d={edgePath(src.x, src.y, tgt.x, tgt.y)}
              fill="none"
              stroke={isHighlighted ? '#818cf8' : 'rgba(148,163,184,0.15)'}
              strokeWidth={isHighlighted ? 1.5 * edge.weight + 0.5 : 0.8}
              opacity={isDimmed ? 0.05 : isHighlighted ? 0.9 : 0.35}
              style={{ transition: 'opacity 0.2s, stroke 0.2s' }}
            />
          );
        })}

        {/* Nodes */}
        {GRAPH_NODES.map(node => {
          if (!visibleNodeIds.has(node.id)) return null;
          const cfg = NODE_COLORS[node.type];
          const isHovered  = hoveredNode === node.id;
          const isConnected = connectedIds?.has(node.id) ?? false;
          const isDimmed   = hoveredNode !== null && !isHovered && !isConnected;
          const scale = isHovered ? 1.25 : isConnected ? 1.1 : 1;
          const r = node.size * scale;

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
              opacity={isDimmed ? 0.15 : 1}
              onMouseEnter={() => { setHoveredNode(node.id); setTooltip({ node, x: node.x, y: node.y }); }}
              onMouseLeave={() => { setHoveredNode(null); setTooltip(null); }}
            >
              {/* Outer glow ring when hovered */}
              {(isHovered || isConnected) && (
                <circle
                  r={r + 6}
                  fill="none"
                  stroke={cfg.stroke}
                  strokeWidth="1"
                  opacity={isHovered ? 0.5 : 0.25}
                  style={{ animation: 'ping 1.5s ease-out infinite' }}
                />
              )}
              {/* Main circle */}
              <circle
                r={r}
                fill={cfg.fill}
                stroke={cfg.stroke}
                strokeWidth={isHovered ? 2 : 1}
                filter={`url(#glow-${node.type})`}
                style={{ transition: 'r 0.15s, stroke-width 0.15s' }}
              />
              {/* Label */}
              <text
                textAnchor="middle"
                dy={r + 12}
                fontSize={node.type === 'hub' ? '11' : '9'}
                fill={cfg.text}
                opacity={isDimmed ? 0 : 1}
                fontWeight={node.type === 'hub' ? '700' : '500'}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {node.label}
              </text>
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g transform={`translate(${Math.min(tooltip.x + 14, 680)}, ${Math.max(tooltip.node.y - 30, 10)})`}>
            <rect rx="6" ry="6" width="160" height="54" fill="#1e293b" stroke="#334155" strokeWidth="1" opacity="0.95" />
            <text x="10" y="18" fontSize="11" fontWeight="700" fill={NODE_COLORS[tooltip.node.type].text}>{tooltip.node.label}</text>
            <text x="10" y="32" fontSize="9" fill="#94a3b8">{TYPE_LABELS[tooltip.node.type]}</text>
            <text x="10" y="46" fontSize="9" fill="#64748b">
              Uso: {Math.round(tooltip.node.weight * 100)}%
              {tooltip.node.model ? ` · ${tooltip.node.model}` : ''}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
