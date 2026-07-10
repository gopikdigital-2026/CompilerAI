import { useState } from 'react';
import { Trash2, Copy, MessageSquare, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import type { WorkflowNode } from '../../types/workflow';
import { NODE_TYPE_CONFIG, STATE_CONFIG } from '../../lib/workflowMocks';

interface NodePropertiesProps {
  node: WorkflowNode;
  onUpdate:    (id: string, updates: Partial<WorkflowNode>) => void;
  onDelete:    (id: string) => void;
  onDuplicate: (id: string) => void;
  onAddComment:(id: string, text: string) => void;
  onClose:     () => void;
}

const SECTION_LABELS = ['General', 'Config', 'Puertos', 'Métricas', 'Comentarios'] as const;
type Section = typeof SECTION_LABELS[number];

export function NodeProperties({ node, onUpdate, onDelete, onDuplicate, onAddComment, onClose }: NodePropertiesProps) {
  const [openSections, setOpenSections] = useState<Set<Section>>(new Set(['General', 'Config', 'Métricas']));
  const [newComment, setNewComment] = useState('');
  const cfg   = NODE_TYPE_CONFIG[node.type];
  const state = STATE_CONFIG[node.state];

  function toggle(s: Section) {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  function submitComment() {
    const text = newComment.trim();
    if (!text) return;
    onAddComment(node.id, text);
    setNewComment('');
  }

  return (
    <div className="w-64 flex-shrink-0 flex flex-col bg-surface-900 border-l border-surface-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-surface-800">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}
        >
          <span style={{ fontSize: 14 }}>{cfg.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: cfg.color }}>
            {cfg.label}
          </p>
          <p className="text-xs font-semibold text-neutral-200 truncate">{node.label}</p>
        </div>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-neutral-600 hover:text-neutral-300 rounded-md hover:bg-surface-700 transition-colors flex-shrink-0">
          <X size={13} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-surface-800">
        <button onClick={() => onDuplicate(node.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-medium text-neutral-400 hover:text-neutral-200 bg-surface-800 hover:bg-surface-700 rounded-lg transition-colors">
          <Copy size={11} /> Duplicar
        </button>
        <button onClick={() => onDelete(node.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-medium text-red-400 hover:text-red-300 bg-surface-800 hover:bg-red-900/30 rounded-lg transition-colors">
          <Trash2 size={11} /> Eliminar
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* GENERAL */}
        <SectionHeader label="General" open={openSections.has('General')} onToggle={() => toggle('General')} />
        {openSections.has('General') && (
          <div className="px-3 pb-3 space-y-2.5">
            <Field label="Nombre">
              <input
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500/50"
                value={node.label}
                onChange={e => onUpdate(node.id, { label: e.target.value })}
              />
            </Field>
            <Field label="Descripción">
              <textarea
                rows={2}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500/50 resize-none"
                value={node.description}
                onChange={e => onUpdate(node.id, { description: e.target.value })}
              />
            </Field>
            <Field label="Estado">
              <select
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500/50"
                style={{ color: state.color }}
                value={node.state}
                onChange={e => onUpdate(node.id, { state: e.target.value as WorkflowNode['state'] })}
              >
                {Object.entries(STATE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k} style={{ color: v.color }}>{v.label}</option>
                ))}
              </select>
            </Field>
            {node.model !== undefined && (
              <Field label="Modelo">
                <input
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500/50"
                  value={node.model ?? ''}
                  onChange={e => onUpdate(node.id, { model: e.target.value })}
                />
              </Field>
            )}
          </div>
        )}

        {/* CONFIG */}
        <SectionHeader label="Config" open={openSections.has('Config')} onToggle={() => toggle('Config')} />
        {openSections.has('Config') && (
          <div className="px-3 pb-3 space-y-2.5">
            {Object.entries(node.config).length === 0 && (
              <p className="text-[10px] text-neutral-600">Sin configuración</p>
            )}
            {Object.entries(node.config).map(([key, val]) => (
              <Field key={key} label={key}>
                <input
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500/50"
                  value={String(val)}
                  onChange={e => onUpdate(node.id, { config: { ...node.config, [key]: e.target.value } })}
                />
              </Field>
            ))}
          </div>
        )}

        {/* PORTS */}
        <SectionHeader label="Puertos" open={openSections.has('Puertos')} onToggle={() => toggle('Puertos')} />
        {openSections.has('Puertos') && (
          <div className="px-3 pb-3 space-y-1.5">
            {node.inputs.length > 0 && (
              <>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-neutral-600 mt-1">Entradas</p>
                {node.inputs.map(p => (
                  <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 bg-surface-800 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <span className="text-[10px] text-neutral-300">{p.label}</span>
                  </div>
                ))}
              </>
            )}
            {node.outputs.length > 0 && (
              <>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-neutral-600 mt-2">Salidas</p>
                {node.outputs.map(p => (
                  <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 bg-surface-800 rounded-lg">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                    <span className="text-[10px] text-neutral-300">{p.label}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* METRICS */}
        <SectionHeader label="Métricas" open={openSections.has('Métricas')} onToggle={() => toggle('Métricas')} />
        {openSections.has('Métricas') && (
          <div className="px-3 pb-3 grid grid-cols-2 gap-2">
            <MetricCard label="Costo est." value={node.estimatedCostUsd != null ? `$${node.estimatedCostUsd.toFixed(4)}` : '—'} />
            <MetricCard label="Tiempo est." value={node.estimatedTimeS != null ? `${node.estimatedTimeS}s` : '—'} />
          </div>
        )}

        {/* COMMENTS */}
        <SectionHeader label="Comentarios" open={openSections.has('Comentarios')} onToggle={() => toggle('Comentarios')} />
        {openSections.has('Comentarios') && (
          <div className="px-3 pb-3 space-y-2">
            {node.comments.length === 0 && (
              <p className="text-[10px] text-neutral-600">Sin comentarios</p>
            )}
            {node.comments.map(c => (
              <div key={c.id} className="bg-surface-800 rounded-lg px-2.5 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-semibold text-neutral-400">{c.author}</span>
                  <span className="text-[9px] text-neutral-600">{new Date(c.createdAt).toLocaleDateString('es')}</span>
                </div>
                <p className="text-[10px] text-neutral-300 leading-relaxed">{c.text}</p>
              </div>
            ))}
            <div className="flex gap-1.5 mt-1">
              <input
                className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1.5 text-[10px] text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-blue-500/50"
                placeholder="Agregar comentario..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
              />
              <button onClick={submitComment}
                className="w-7 h-7 flex items-center justify-center bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex-shrink-0">
                <Plus size={12} className="text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-300 hover:bg-surface-800/50 transition-colors border-t border-surface-800"
    >
      {label}
      {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-800 rounded-lg px-2.5 py-2 text-center">
      <p className="text-[9px] text-neutral-600 mb-0.5">{label}</p>
      <p className="text-xs font-semibold text-neutral-200">{value}</p>
    </div>
  );
}
