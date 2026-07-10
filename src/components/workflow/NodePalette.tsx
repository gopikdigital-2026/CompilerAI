import { PALETTE_ITEMS, NODE_TYPE_CONFIG } from '../../lib/workflowMocks';
import type { PaletteItem } from '../../types/workflow';

const CATEGORY_LABELS: Record<PaletteItem['category'], string> = {
  trigger: 'Disparadores',
  action:  'Acciones',
  control: 'Control',
  data:    'Datos',
  ai:      'Inteligencia',
  util:    'Utilidades',
};

const CATEGORY_ORDER: PaletteItem['category'][] = ['trigger', 'action', 'control', 'data', 'ai', 'util'];

interface NodePaletteProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function NodePalette({ searchQuery, onSearchChange }: NodePaletteProps) {
  const filtered = searchQuery.trim()
    ? PALETTE_ITEMS.filter(p =>
        p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : PALETTE_ITEMS;

  const grouped = CATEGORY_ORDER.reduce<Record<string, PaletteItem[]>>((acc, cat) => {
    const items = filtered.filter(p => p.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  function handleDragStart(e: React.DragEvent, type: string) {
    e.dataTransfer.setData('nodeType', type);
    e.dataTransfer.effectAllowed = 'copy';
  }

  return (
    <div className="w-56 flex-shrink-0 flex flex-col bg-surface-900 border-r border-surface-800 overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-surface-800">
        <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Nodos</p>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Buscar nodo..."
            className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-1.5 text-xs text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto py-2 space-y-3 px-2">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-neutral-600 px-1 mb-1">
              {CATEGORY_LABELS[cat as PaletteItem['category']]}
            </p>
            <div className="space-y-0.5">
              {items.map(item => {
                const cfg = NODE_TYPE_CONFIG[item.type];
                return (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={e => handleDragStart(e, item.type)}
                    className="group flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-surface-800 transition-colors"
                    style={{ borderLeft: `2px solid transparent` }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderLeftColor = cfg.color;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderLeftColor = 'transparent';
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}
                    >
                      <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-neutral-300 group-hover:text-neutral-100 leading-none mb-0.5 transition-colors">
                        {item.label}
                      </p>
                      <p className="text-[9px] text-neutral-600 group-hover:text-neutral-500 leading-tight transition-colors truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-8">
            <p className="text-[11px] text-neutral-600">Sin resultados</p>
          </div>
        )}
      </div>

      {/* Drag hint */}
      <div className="px-3 py-2 border-t border-surface-800">
        <p className="text-[9px] text-neutral-700 text-center">Arrastra al canvas para agregar</p>
      </div>
    </div>
  );
}
