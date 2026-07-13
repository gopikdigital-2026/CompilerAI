import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { WorkflowNode, WorkflowEdge } from '../../types/workflow';
import { NODE_TYPE_CONFIG, STATE_CONFIG, NODE_WIDTH, NODE_HEIGHT, snapToGrid } from '../../lib/workflowMocks';

// ─── Port circles ─────────────────────────────────────────────────────────────

const PORT_R = 6;
const PORT_HIT = 16; // larger hit area

interface PortProps {
  x: number; y: number; color: string; label: string;
  portId: string; nodeId: string; portType: 'input' | 'output';
  isHighlighted?: boolean;
  onStartConnect?: (nodeId: string, portId: string, x: number, y: number) => void;
  onEndConnect?:   (nodeId: string, portId: string) => void;
}

function PortCircle({ x, y, color, portId, nodeId, portType, isHighlighted, onStartConnect, onEndConnect }: PortProps) {
  return (
    <g>
      {/* Hit area */}
      <circle cx={x} cy={y} r={PORT_HIT / 2} fill="transparent" style={{ cursor: 'crosshair' }}
        onMouseDown={portType === 'output' ? e => {
          e.stopPropagation();
          onStartConnect?.(nodeId, portId, x, y);
        } : undefined}
        onMouseUp={portType === 'input' ? e => {
          e.stopPropagation();
          onEndConnect?.(nodeId, portId);
        } : undefined}
      />
      {/* Visual */}
      <circle cx={x} cy={y} r={PORT_R}
        fill={isHighlighted ? color : '#1e293b'}
        stroke={color} strokeWidth="2"
        style={{ cursor: 'crosshair', transition: 'fill 0.15s' }}
      />
    </g>
  );
}

// ─── Node component ───────────────────────────────────────────────────────────

interface NodeProps {
  node: WorkflowNode;
  isSelected: boolean;
  isConnecting: boolean;
  zoom: number;
  onClick: (id: string, e: React.MouseEvent) => void;
  onMouseDown: (id: string, e: React.MouseEvent) => void;
  onStartConnect: (nodeId: string, portId: string, x: number, y: number) => void;
  onEndConnect:   (nodeId: string, portId: string) => void;
}

function NodeCard({ node, isSelected, isConnecting: _isConnecting, zoom: _zoom, onClick, onMouseDown, onStartConnect, onEndConnect }: NodeProps) {
  const cfg   = NODE_TYPE_CONFIG[node.type];
  const state = STATE_CONFIG[node.state];
  const hasComments = node.comments.length > 0;

  const inputY  = node.y + NODE_HEIGHT / 2;
  const inputX  = node.x;

  return (
    <g>
      {/* Node body — use foreignObject for HTML rendering */}
      <foreignObject
        x={node.x} y={node.y}
        width={NODE_WIDTH} height={NODE_HEIGHT}
        style={{ overflow: 'visible' }}
      >
        <div
          style={{
            width: NODE_WIDTH, height: NODE_HEIGHT,
            background: cfg.bg,
            border: `1.5px solid ${isSelected ? cfg.color : 'rgba(255,255,255,0.1)'}`,
            borderLeft: `3px solid ${cfg.color}`,
            borderRadius: 10,
            boxShadow: isSelected
              ? `0 0 0 2px ${cfg.color}40, 0 4px 20px rgba(0,0,0,0.4)`
              : '0 2px 8px rgba(0,0,0,0.3)',
            cursor: 'move',
            userSelect: 'none',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '8px 12px 8px 14px',
            transition: 'box-shadow 0.15s',
          }}
          onClick={e => { e.stopPropagation(); onClick(node.id, e); }}
          onMouseDown={e => { e.stopPropagation(); onMouseDown(node.id, e); }}
        >
          {/* State dot */}
          <div style={{
            position: 'absolute', top: 8, right: 8,
            width: 7, height: 7, borderRadius: '50%',
            background: state.dot,
            boxShadow: node.state === 'running' ? `0 0 8px ${state.dot}` : undefined,
          }} />

          {/* Comment badge */}
          {hasComments && (
            <div style={{
              position: 'absolute', top: 6, right: 20,
              background: '#fbbf24', borderRadius: '50%',
              width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 7, color: '#000', fontWeight: 700 }}>{node.comments.length}</span>
            </div>
          )}

          {/* Type label */}
          <div style={{ fontSize: 9, color: cfg.color, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>
            {NODE_TYPE_CONFIG[node.type].label}
          </div>

          {/* Node name */}
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {node.label}
          </div>

          {/* Description */}
          <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {node.description}
          </div>

          {/* Model badge */}
          {node.model && (
            <div style={{ marginTop: 3, display: 'inline-block', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 4, padding: '1px 6px', fontSize: 8, color: '#38bdf8' }}>
              {node.model}
            </div>
          )}
        </div>
      </foreignObject>

      {/* Input ports */}
      {node.inputs.map((port, i) => (
        <PortCircle
          key={port.id}
          x={inputX} y={node.inputs.length === 1 ? inputY : node.y + NODE_HEIGHT * (i + 1) / (node.inputs.length + 1)}
          color={cfg.color} label={port.label}
          portId={port.id} nodeId={node.id} portType="input"
          onStartConnect={onStartConnect} onEndConnect={onEndConnect}
        />
      ))}

      {/* Output ports */}
      {node.outputs.map((port, i) => {
        const py = node.outputs.length === 1
          ? node.y + NODE_HEIGHT / 2
          : node.y + NODE_HEIGHT * (i + 1) / (node.outputs.length + 1);
        return (
          <PortCircle
            key={port.id}
            x={node.x + NODE_WIDTH} y={py}
            color={cfg.color} label={port.label}
            portId={port.id} nodeId={node.id} portType="output"
            onStartConnect={onStartConnect} onEndConnect={onEndConnect}
          />
        );
      })}

      {/* Port labels */}
      {node.outputs.length > 1 && node.outputs.map((port, i) => {
        const py = node.y + NODE_HEIGHT * (i + 1) / (node.outputs.length + 1);
        return (
          <text key={`lbl-${port.id}`} x={node.x + NODE_WIDTH + 12} y={py + 4}
            fontSize={9} fill="#64748b" style={{ pointerEvents: 'none' }}>
            {port.label}
          </text>
        );
      })}
    </g>
  );
}

// ─── Edge component ───────────────────────────────────────────────────────────

function EdgePath({ edge, nodes, isSelected, onClick }: {
  edge: WorkflowEdge; nodes: WorkflowNode[]; isSelected: boolean;
  onClick: (id: string) => void;
}) {
  const src  = nodes.find(n => n.id === edge.sourceNodeId);
  const tgt  = nodes.find(n => n.id === edge.targetNodeId);
  if (!src || !tgt) return null;

  const srcPort = src.outputs.find(p => p.id === edge.sourcePortId);
  const tgtPort = tgt.inputs.find(p => p.id === edge.targetPortId);
  if (!srcPort && !tgtPort) return null;

  const srcPortIdx = src.outputs.length === 1 ? 0 : src.outputs.findIndex(p => p.id === edge.sourcePortId);
  const tgtPortIdx = tgt.inputs.length === 1 ? 0 : tgt.inputs.findIndex(p => p.id === edge.targetPortId);

  const x1 = src.x + NODE_WIDTH;
  const y1 = src.outputs.length === 1 ? src.y + NODE_HEIGHT / 2 : src.y + NODE_HEIGHT * (srcPortIdx + 1) / (src.outputs.length + 1);
  const x2 = tgt.x;
  const y2 = tgt.inputs.length === 1 ? tgt.y + NODE_HEIGHT / 2 : tgt.y + NODE_HEIGHT * (tgtPortIdx + 1) / (tgt.inputs.length + 1);

  const dx = Math.max(60, Math.abs(x2 - x1) * 0.5);
  const d  = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

  return (
    <g onClick={e => { e.stopPropagation(); onClick(edge.id); }} style={{ cursor: 'pointer' }}>
      {/* Hit area */}
      <path d={d} fill="none" stroke="transparent" strokeWidth="12" />
      {/* Visual */}
      <path d={d} fill="none"
        stroke={isSelected ? '#38bdf8' : 'rgba(148,163,184,0.4)'}
        strokeWidth={isSelected ? 2 : 1.5}
        strokeDasharray={isSelected ? undefined : undefined}
        markerEnd={`url(#arrowhead-${src.type})`}
      />
      {/* Edge label */}
      {edge.label && (
        <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6}
          fontSize={9} fill="#475569" textAnchor="middle" style={{ pointerEvents: 'none' }}>
          {edge.label}
        </text>
      )}
    </g>
  );
}

// ─── Ghost edge (while connecting) ───────────────────────────────────────────

function GhostEdge({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const dx = Math.max(60, Math.abs(x2 - x1) * 0.5);
  const d  = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  return (
    <path d={d} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="6 3"
      style={{ pointerEvents: 'none' }} />
  );
}

// ─── Canvas grid ──────────────────────────────────────────────────────────────

function GridPattern({ zoom: _zoom }: { zoom: number }) {
  const g = 20;
  return (
    <defs>
      <pattern id="canvas-grid" x="0" y="0" width={g} height={g} patternUnits="userSpaceOnUse">
        <circle cx={g} cy={g} r="0.5" fill="rgba(148,163,184,0.15)" />
      </pattern>
      <pattern id="canvas-grid-major" x="0" y="0" width={g * 5} height={g * 5} patternUnits="userSpaceOnUse">
        <rect width={g * 5} height={g * 5} fill="url(#canvas-grid)" />
        <circle cx={g * 5} cy={g * 5} r="1" fill="rgba(148,163,184,0.2)" />
      </pattern>
    </defs>
  );
}

// ─── Arrowhead markers ────────────────────────────────────────────────────────

function ArrowMarkers() {
  return (
    <defs>
      {Object.keys(NODE_TYPE_CONFIG).map(type => {
        return (
          <marker key={type} id={`arrowhead-${type}`} markerWidth="8" markerHeight="8"
            refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="rgba(148,163,184,0.5)" />
          </marker>
        );
      })}
      <marker id="arrowhead-selected" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="#38bdf8" />
      </marker>
    </defs>
  );
}

// ─── Main WorkflowCanvas ──────────────────────────────────────────────────────

const CANVAS_SIZE = 5000;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;

interface WorkflowCanvasProps {
  nodes:          WorkflowNode[];
  edges:          WorkflowEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode:   (id: string | null) => void;
  onSelectEdge:   (id: string | null) => void;
  onMoveNode:     (id: string, x: number, y: number) => void;
  onAddNode:      (type: WorkflowNode['type'], x: number, y: number) => void;
  onAddEdge:      (srcNodeId: string, srcPortId: string, tgtNodeId: string, tgtPortId: string) => void;
  onDeleteNode:   (id: string) => void;
  onDeleteEdge:   (id: string) => void;
  children?:      React.ReactNode; // for MiniMap overlay
}

export function WorkflowCanvas({
  nodes, edges, selectedNodeId, selectedEdgeId,
  onSelectNode, onSelectEdge, onMoveNode, onAddNode, onAddEdge,
  onDeleteNode, onDeleteEdge, children,
}: WorkflowCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan,  setPan]  = useState({ x: 80, y: 60 });
  const [zoom, setZoom] = useState(0.85);

  // Connecting state (needs to cause re-render for ghost edge)
  const [connecting, setConnecting] = useState<{
    nodeId: string; portId: string; x1: number; y1: number; x2: number; y2: number;
  } | null>(null);

  // Interaction refs (no re-render needed during drag)
  const panRef  = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
  const dragRef = useRef<{ nodeId: string; startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);
  const connectRef = useRef<{ nodeId: string; portId: string; x1: number; y1: number } | null>(null);

  // Expose pan/zoom to minimap via ref
  const transformRef = useRef({ pan, zoom });
  transformRef.current = { pan, zoom };

  // ── Coordinate helpers ───────────────────────────────────────────────────────

  const screenToCanvas = useCallback((sx: number, sy: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: (sx - rect.left - transformRef.current.pan.x) / transformRef.current.zoom,
      y: (sy - rect.top  - transformRef.current.pan.y) / transformRef.current.zoom,
    };
  }, []);

  // ── Zoom ─────────────────────────────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect   = containerRef.current!.getBoundingClientRect();
    const mx     = e.clientX - rect.left;
    const my     = e.clientY - rect.top;
    const { pan: p, zoom: z } = transformRef.current;
    const delta  = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * delta));
    // Keep the point under mouse fixed
    const cx = (mx - p.x) / z;
    const cy = (my - p.y) / z;
    setPan({ x: mx - cx * newZoom, y: my - cy * newZoom });
    setZoom(newZoom);
  }, []);

  const zoomIn  = () => setZoom(z => Math.min(MAX_ZOOM, parseFloat((z + 0.1).toFixed(2))));
  const zoomOut = () => setZoom(z => Math.max(MIN_ZOOM, parseFloat((z - 0.1).toFixed(2))));
  const zoomReset = () => { setZoom(0.85); setPan({ x: 80, y: 60 }); };

  // ── Mouse handlers ────────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Background pan
    if (e.button === 1 || e.altKey) {
      e.preventDefault();
      panRef.current = { startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y };
      return;
    }
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      panRef.current = { startX: e.clientX, startY: e.clientY, startPanX: transformRef.current.pan.x, startPanY: transformRef.current.pan.y };
      onSelectNode(null);
      onSelectEdge(null);
    }
  }, [pan, onSelectNode, onSelectEdge]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (panRef.current) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      setPan({ x: panRef.current.startPanX + dx, y: panRef.current.startPanY + dy });
    }
    if (dragRef.current) {
      const { nodeId, startX, startY, nodeX, nodeY } = dragRef.current;
      const dx = (e.clientX - startX) / transformRef.current.zoom;
      const dy = (e.clientY - startY) / transformRef.current.zoom;
      const nx = snapToGrid(nodeX + dx);
      const ny = snapToGrid(nodeY + dy);
      onMoveNode(nodeId, nx, ny);
    }
    if (connectRef.current) {
      const c = screenToCanvas(e.clientX, e.clientY);
      setConnecting({
        ...connectRef.current,
        x2: c.x, y2: c.y,
      });
    }
  }, [onMoveNode, screenToCanvas]);

  const handleMouseUp = useCallback((_e: React.MouseEvent) => {
    panRef.current  = null;
    dragRef.current = null;
    if (connectRef.current) {
      connectRef.current = null;
      setConnecting(null);
    }
  }, []);

  // ── Node interaction callbacks ────────────────────────────────────────────────

  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    dragRef.current = {
      nodeId,
      startX: e.clientX, startY: e.clientY,
      nodeX: node.x, nodeY: node.y,
    };
  }, [nodes]);

  const handleNodeClick = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectNode(nodeId);
  }, [onSelectNode]);

  // ── Connection callbacks ──────────────────────────────────────────────────────

  const handleStartConnect = useCallback((nodeId: string, portId: string, cx: number, cy: number) => {
    connectRef.current = { nodeId, portId, x1: cx, y1: cy };
    setConnecting({ nodeId, portId, x1: cx, y1: cy, x2: cx, y2: cy });
  }, []);

  const handleEndConnect = useCallback((targetNodeId: string, targetPortId: string) => {
    if (connectRef.current && connectRef.current.nodeId !== targetNodeId) {
      onAddEdge(connectRef.current.nodeId, connectRef.current.portId, targetNodeId, targetPortId);
    }
    connectRef.current = null;
    setConnecting(null);
  }, [onAddEdge]);

  // ── Drag from palette ────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('nodeType') as WorkflowNode['type'];
    if (!type) return;
    const c = screenToCanvas(e.clientX, e.clientY);
    onAddNode(type, c.x - NODE_WIDTH / 2, c.y - NODE_HEIGHT / 2);
  }, [screenToCanvas, onAddNode]);

  // ── Keyboard delete ───────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && (e.target as HTMLElement).tagName !== 'INPUT') {
        if (selectedNodeId) onDeleteNode(selectedNodeId);
        if (selectedEdgeId) onDeleteEdge(selectedEdgeId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeId, selectedEdgeId, onDeleteNode, onDeleteEdge]);

  return (
    <div className="relative flex-1 overflow-hidden bg-surface-950 select-none"
      ref={containerRef}
      style={{ cursor: panRef.current ? 'grabbing' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Canvas SVG — transformed */}
      <svg
        style={{
          position: 'absolute', left: 0, top: 0,
          width: CANVAS_SIZE, height: CANVAS_SIZE,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          overflow: 'visible',
        }}
      >
        <GridPattern zoom={zoom} />
        <ArrowMarkers />

        {/* Grid background */}
        <rect x="0" y="0" width={CANVAS_SIZE} height={CANVAS_SIZE}
          fill="url(#canvas-grid-major)" className="canvas-bg" />

        {/* Edges */}
        <g>
          {edges.map(edge => (
            <EdgePath
              key={edge.id}
              edge={edge}
              nodes={nodes}
              isSelected={edge.id === selectedEdgeId}
              onClick={onSelectEdge}
            />
          ))}
        </g>

        {/* Ghost edge */}
        {connecting && (
          <GhostEdge x1={connecting.x1} y1={connecting.y1} x2={connecting.x2} y2={connecting.y2} />
        )}

        {/* Nodes */}
        <g>
          {nodes.map(node => (
            <NodeCard
              key={node.id}
              node={node}
              isSelected={node.id === selectedNodeId}
              isConnecting={!!connecting}
              zoom={zoom}
              onClick={handleNodeClick}
              onMouseDown={handleNodeMouseDown}
              onStartConnect={handleStartConnect}
              onEndConnect={handleEndConnect}
            />
          ))}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-surface-800 border border-surface-700 rounded-xl p-1 shadow-lg">
        <button onClick={zoomOut} className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-neutral-200 hover:bg-surface-700 rounded-lg transition-colors text-sm font-bold">−</button>
        <button onClick={zoomReset} className="px-2 h-7 text-[11px] font-mono text-neutral-400 hover:text-neutral-200 hover:bg-surface-700 rounded-lg transition-colors min-w-12 text-center">
          {Math.round(zoom * 100)}%
        </button>
        <button onClick={zoomIn} className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-neutral-200 hover:bg-surface-700 rounded-lg transition-colors text-sm font-bold">+</button>
      </div>

      {/* Selection hint */}
      {selectedNodeId && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-neutral-600 bg-surface-900/80 px-3 py-1 rounded-full border border-surface-700">
          Delete / Backspace para eliminar
        </div>
      )}

      {/* Pass-through children (MiniMap) */}
      {children}
    </div>
  );
}

