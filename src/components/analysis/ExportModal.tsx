import { useState } from 'react';
import { X, FileText, FileType2, FileCode, Download, Loader2 } from 'lucide-react';
import { useAnalysis } from '../../hooks/useAnalysis';
import { useOrganization } from '../../hooks/useOrganization';
import { track } from '../../lib/telemetry';
import { exportReport, type ExportFormat } from '../../lib/exportEngine';
import { generateRoadmap } from '../../lib/roadmapEngine';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

const formatInfo: { id: ExportFormat; label: string; icon: typeof FileText; desc: string }[] = [
  { id: 'pdf', label: 'PDF', icon: FileText, desc: 'Documento imprimible' },
  { id: 'word', label: 'Word', icon: FileType2, desc: 'Documento editable' },
  { id: 'markdown', label: 'Markdown', icon: FileCode, desc: 'Texto plano' },
];

export function ExportModal({ open, onClose }: ExportModalProps) {
  const analysis = useAnalysis();
  const { activeOrg } = useOrganization();
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [exporting, setExporting] = useState(false);
  const [sections, setSections] = useState({
    execSummary: true,
    healthScore: true,
    evidence: true,
    risks: true,
    opportunities: true,
    roadmap: true,
    actionPlan: true,
  });

  if (!open || !analysis.result) return null;

  function handleExport() {
    if (!analysis.result) return;
    setExporting(true);
    track('report_exported', { format, sections });

    const roadmap = sections.roadmap ? generateRoadmap(analysis.result) : null;

    setTimeout(() => {
      exportReport(
        analysis.result!,
        analysis.executiveReport,
        roadmap,
        {
          format,
          orgName: activeOrg?.name ?? 'Organización',
          date: new Date().toISOString(),
          includeExecSummary: sections.execSummary,
          includeHealthScore: sections.healthScore,
          includeEvidence: sections.evidence,
          includeRisks: sections.risks,
          includeOpportunities: sections.opportunities,
          includeRoadmap: sections.roadmap,
          includeActionPlan: sections.actionPlan,
        },
      );
      setExporting(false);
      onClose();
    }, 500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in" data-testid="export-modal">
      <div className="card p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-neutral-100">Exportar informe</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300"><X size={18} /></button>
        </div>

        {/* Format selection */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {formatInfo.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                data-testid={`export-format-${f.id}`}
                onClick={() => setFormat(f.id)}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  format === f.id
                    ? 'border-brand-500/30 bg-brand-500/10 text-brand-400'
                    : 'border-surface-700 bg-surface-800 text-neutral-400 hover:border-surface-600'
                }`}
              >
                <Icon size={20} className="mx-auto mb-1" />
                <p className="text-xs font-medium">{f.label}</p>
                <p className="text-[10px] text-neutral-600">{f.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Section selection */}
        <div className="space-y-2 mb-4">
          <p className="text-xs text-neutral-500 font-medium">Secciones a incluir:</p>
          {[
            { key: 'execSummary', label: 'Resumen Ejecutivo' },
            { key: 'healthScore', label: 'Health Score' },
            { key: 'evidence', label: 'Evidencias' },
            { key: 'risks', label: 'Riesgos' },
            { key: 'opportunities', label: 'Oportunidades' },
            { key: 'roadmap', label: 'Roadmap' },
            { key: 'actionPlan', label: 'Plan de acción' },
          ].map((s) => (
            <label key={s.key} className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={sections[s.key as keyof typeof sections]}
                onChange={(e) => setSections({ ...sections, [s.key]: e.target.checked })}
                className="rounded border-surface-600 bg-surface-800 text-brand-500"
              />
              {s.label}
            </label>
          ))}
        </div>

        {/* Export button */}
        <button
          data-testid="export-execute"
          onClick={handleExport}
          disabled={exporting}
          className="btn-primary w-full text-sm flex items-center justify-center gap-2"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {exporting ? 'Exportando...' : `Exportar como ${format.toUpperCase()}`}
        </button>

        <p className="text-[10px] text-neutral-600 text-center mt-3">
          La exportación incluye solo datos de {activeOrg?.name ?? 'tu organización'}.
        </p>
      </div>
    </div>
  );
}
