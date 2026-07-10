import React, { useRef, useState } from 'react';
import {
  Cpu, Sparkles, Loader2, RotateCcw, Clock, ChevronRight,
  BookOpen, Trash2, LayoutTemplate, X,
} from 'lucide-react';
import { BlueprintView } from '../../components/compiler/BlueprintView';
import { COMPILER_TEMPLATES } from '../../lib/blueprintMocks';
import { useCompiler } from '../../hooks/useCompiler';
import { useTranslation } from '../../hooks/useTranslation';
import type { CompilerTemplate } from '../../types/blueprint';

const CATEGORY_COLORS: Record<string, string> = {
  sales:      'bg-green-500/10 text-green-400 border-green-500/20',
  operations: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  support:    'bg-orange-500/10 text-orange-400 border-orange-500/20',
  data:       'bg-purple-500/10 text-purple-400 border-purple-500/20',
  marketing:  'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

const COMPLEXITY_DOTS: Record<string, string[]> = {
  simple:  ['bg-success-400', 'bg-surface-600', 'bg-surface-600'],
  medium:  ['bg-warning-400', 'bg-warning-400', 'bg-surface-600'],
  complex: ['bg-error-400',   'bg-error-400',   'bg-error-400'],
};

function TemplatesModal({
  lang,
  onSelect,
  onClose,
}: {
  lang: string;
  onSelect: (prompt: string) => void;
  onClose: () => void;
}) {
  const isEs = lang === 'es';
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-800 border border-surface-600 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto shadow-card-hover animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700 sticky top-0 bg-surface-800">
          <div>
            <h3 className="text-base font-semibold text-neutral-100">
              {isEs ? 'Plantillas de automatización' : 'Automation Templates'}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isEs ? 'Elige una plantilla para empezar con una petición pre-configurada' : 'Pick a template to start with a pre-configured request'}
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-200 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          {COMPILER_TEMPLATES.map((tpl: CompilerTemplate) => (
            <div
              key={tpl.id}
              className="bg-surface-750 border border-surface-600 rounded-xl p-4 hover:border-brand-500/40 hover:bg-surface-700 transition-all cursor-pointer group"
              onClick={() => { onSelect(isEs ? tpl.prompt : tpl.promptEn); onClose(); }}
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[tpl.category]}`}>
                  {tpl.category}
                </span>
                <div className="flex gap-0.5 items-center">
                  {COMPLEXITY_DOTS[tpl.complexity].map((cls, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${cls}`} />
                  ))}
                </div>
              </div>
              <h4 className="text-sm font-semibold text-neutral-100 mb-1 group-hover:text-brand-300 transition-colors">
                {isEs ? tpl.name : tpl.nameEn}
              </h4>
              <p className="text-xs text-neutral-500 leading-relaxed mb-3">
                {isEs ? tpl.description : tpl.descriptionEn}
              </p>
              <div className="flex flex-wrap gap-1">
                {tpl.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="text-[9px] bg-surface-700 border border-surface-600 text-neutral-500 px-1.5 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompileAnimation({ step }: { step: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-16 animate-fade-in">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-brand-gradient shadow-glow-brand flex items-center justify-center">
          <Cpu size={28} className="text-white" />
        </div>
        <div className="absolute -inset-3 rounded-3xl border border-brand-500/20 animate-ping opacity-30" />
      </div>
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Loader2 size={14} className="animate-spin text-brand-400" />
          <p className="text-sm font-medium text-neutral-300">{step}</p>
        </div>
        <div className="flex gap-1 justify-center mt-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-brand-500 opacity-40"
              style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ lang, onTemplates }: { lang: string; onTemplates: () => void }) {
  const isEs = lang === 'es';
  const EXAMPLES = isEs ? [
    'Cuando llegue un pedido por email, clasifícalo, crea el cliente en HubSpot y genera una factura PDF',
    'Monitoriza menciones de mi marca en Twitter, analiza el sentimiento y alerta en Slack ante crisis',
    'Cada lunes extrae datos de ventas de Shopify, valida con IA y genera un reporte semanal por email',
  ] : [
    'When an order arrives by email, classify it, create the customer in HubSpot and generate a PDF invoice',
    'Monitor brand mentions on Twitter, analyze sentiment and alert in Slack for potential crises',
    'Every Monday extract sales data from Shopify, validate with AI and generate a weekly email report',
  ];
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-surface-700 border border-surface-600 flex items-center justify-center mb-5">
        <Sparkles size={22} className="text-neutral-500" />
      </div>
      <h3 className="text-base font-semibold text-neutral-200 mb-2">
        {isEs ? 'Listo para compilar' : 'Ready to compile'}
      </h3>
      <p className="text-sm text-neutral-500 max-w-xs mb-6 leading-relaxed">
        {isEs
          ? 'Describe tu automatización y el Compiler generará un Blueprint detallado listo para implementar.'
          : 'Describe your automation and the Compiler will generate a detailed Blueprint ready to implement.'}
      </p>
      <button
        onClick={onTemplates}
        className="btn-secondary text-sm mb-8"
      >
        <LayoutTemplate size={14} /> {isEs ? 'Ver plantillas' : 'Browse templates'}
      </button>
      <div className="w-full max-w-md space-y-2 text-left">
        <p className="text-[11px] uppercase tracking-wider text-neutral-600 font-medium mb-2 text-center">
          {isEs ? 'Ejemplos de petición' : 'Example requests'}
        </p>
        {EXAMPLES.map((ex, i) => (
          <div key={i} className="text-xs text-neutral-500 bg-surface-750 border border-surface-700 rounded-lg px-3 py-2 leading-relaxed">
            "{ex.slice(0, 80)}..."
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function RealityCompiler() {
  const { t, lang } = useTranslation();
  const isEs = lang === 'es';
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const {
    prompt, setPrompt, status, blueprint, sessions, loadingHistory,
    compileStepLabel, compile, loadSession, deleteSession, reset,
  } = useCompiler(lang);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      compile();
    }
  };

  const handleExportJson = () => {
    if (!blueprint) return;
    const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blueprint-${blueprint.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canCompile = prompt.trim().length >= 10 && status !== 'compiling';

  return (
    <div className="flex flex-1 overflow-hidden">
      {showTemplates && (
        <TemplatesModal
          lang={lang}
          onSelect={(p) => { setPrompt(p); setTimeout(() => textareaRef.current?.focus(), 50); }}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* ── Left panel ── */}
      <div className="flex flex-col w-[380px] flex-shrink-0 border-r border-surface-700 bg-surface-900 overflow-y-auto">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-surface-700">
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center shadow-glow-brand">
              <Cpu size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-100">{t.compiler.title} Studio</h2>
              <span className="badge-accent text-[10px]">
                <Sparkles size={9} /> {isEs ? 'Beta' : 'Beta'}
              </span>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
            {isEs
              ? 'Describe cualquier automatización en lenguaje natural y genera un Blueprint estructurado.'
              : 'Describe any automation in natural language and generate a structured Blueprint.'}
          </p>
        </div>

        {/* Editor */}
        <div className="px-4 pt-4 pb-3 space-y-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isEs
                ? "Describe tu automatización... ej: 'Cuando llegue un pedido por email, clasifícalo, crea el cliente en el CRM, genera una factura y avisa por Slack.'"
                : "Describe your automation... e.g. 'When an order arrives by email, classify it, create the customer in the CRM, generate an invoice and notify via Slack.'"
              }
              className="w-full bg-surface-750 border border-surface-600 hover:border-surface-500 focus:border-brand-500 rounded-xl text-sm text-neutral-200 placeholder-neutral-600 resize-none px-4 py-3 focus:outline-none transition-colors min-h-[150px] leading-relaxed"
              disabled={status === 'compiling'}
            />
            <div className="absolute bottom-2.5 right-3 text-[10px] text-neutral-600">
              {prompt.length} {isEs ? 'chars' : 'chars'}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={compile}
              disabled={!canCompile}
              className="btn-primary flex-1 justify-center py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {status === 'compiling'
                ? <><Loader2 size={14} className="animate-spin" /> {isEs ? 'Compilando...' : 'Compiling...'}</>
                : <><Cpu size={14} /> {isEs ? 'Compilar' : 'Compile'}</>
              }
            </button>
            <button
              onClick={() => setShowTemplates(true)}
              className="btn-secondary px-3 py-2.5"
              title={isEs ? 'Plantillas' : 'Templates'}
            >
              <LayoutTemplate size={15} />
            </button>
            {(prompt || blueprint) && (
              <button
                onClick={reset}
                className="btn-ghost px-3 py-2.5 text-neutral-500"
                title={isEs ? 'Limpiar' : 'Clear'}
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <kbd className="text-[10px] text-neutral-600 bg-surface-700 px-1.5 py-0.5 rounded border border-surface-600">
              {navigator.platform.startsWith('Mac') ? '⌘' : 'Ctrl'}+Enter
            </kbd>
            <span className="text-[10px] text-neutral-600">{isEs ? 'para compilar' : 'to compile'}</span>
          </div>
        </div>

        {/* History */}
        <div className="flex-1 px-4 pb-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <BookOpen size={12} className="text-neutral-500" />
              <span className="text-xs font-medium text-neutral-400">{isEs ? 'Historial' : 'History'}</span>
            </div>
            {sessions.length > 0 && (
              <span className="text-[10px] text-neutral-600">{sessions.length}</span>
            )}
          </div>

          {loadingHistory ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-surface-750 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-neutral-600 text-center py-6">
              {isEs ? 'Sin compilaciones anteriores' : 'No previous compilations'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="group flex items-center gap-2 bg-surface-750 hover:bg-surface-700 border border-surface-600 hover:border-surface-500 rounded-lg px-3 py-2.5 transition-all cursor-pointer"
                  onClick={() => loadSession(session)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-300 truncate leading-snug">
                      {session.prompt.slice(0, 55)}{session.prompt.length > 55 ? '…' : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock size={9} className="text-neutral-600" />
                      <span className="text-[10px] text-neutral-600">
                        {new Date(session.created_at).toLocaleDateString(isEs ? 'es-ES' : 'en-US')}
                      </span>
                      {session.blueprint && (
                        <span className="text-[10px] text-success-400 font-medium">
                          {session.blueprint.confidence}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={12} className="text-neutral-500" />
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                      className="text-neutral-600 hover:text-error-400 transition-colors p-0.5"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 overflow-y-auto bg-surface-900">
        {status === 'idle' && !blueprint && (
          <EmptyState lang={lang} onTemplates={() => setShowTemplates(true)} />
        )}

        {status === 'compiling' && (
          <CompileAnimation step={compileStepLabel} />
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8 animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-error-500/10 border border-error-500/20 flex items-center justify-center mb-4">
              <Cpu size={20} className="text-error-400" />
            </div>
            <p className="text-sm text-neutral-300 mb-1">{isEs ? 'Error al compilar' : 'Compilation error'}</p>
            <p className="text-xs text-neutral-500 mb-5">{isEs ? 'Inténtalo de nuevo o simplifica la petición.' : 'Try again or simplify your request.'}</p>
            <button onClick={compile} className="btn-primary text-sm">
              {isEs ? 'Reintentar' : 'Retry'}
            </button>
          </div>
        )}

        {status === 'complete' && blueprint && (
          <div className="p-5">
            <BlueprintView blueprint={blueprint} lang={lang} onExportJson={handleExportJson} />
          </div>
        )}
      </div>
    </div>
  );
}
