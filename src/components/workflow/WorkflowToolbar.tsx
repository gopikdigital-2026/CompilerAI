import { Save, GitBranch, Play, Download, Upload, Share2, AlertTriangle, CheckCircle, Loader2, Sparkles } from 'lucide-react';

interface WorkflowToolbarProps {
  workflowName:  string;
  savedStatus:   'saved' | 'unsaved' | 'saving';
  errorCount:    number;
  warningCount:  number;
  totalCost:     number;
  totalTime:     number;
  onNameChange:  (v: string) => void;
  onSave:        () => void;
  onShowVersions:() => void;
  onShowValidation:() => void;
  onOptimize:    () => void;
  isOptimizing:  boolean;
}

export function WorkflowToolbar({
  workflowName, savedStatus, errorCount, warningCount, totalCost, totalTime,
  onNameChange, onSave, onShowVersions, onShowValidation, onOptimize, isOptimizing,
}: WorkflowToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-900 border-b border-surface-800 min-h-[48px]">
      {/* Workflow name */}
      <input
        className="bg-transparent border-b border-transparent hover:border-surface-600 focus:border-blue-500/60 focus:outline-none text-sm font-semibold text-neutral-200 placeholder-neutral-600 w-52 transition-colors py-0.5"
        value={workflowName}
        onChange={e => onNameChange(e.target.value)}
        placeholder="Nombre del workflow..."
      />

      {/* Save status */}
      <div className="flex items-center gap-1.5 mr-1">
        {savedStatus === 'saving' && (
          <Loader2 size={12} className="text-blue-400 animate-spin" />
        )}
        {savedStatus === 'saved' && (
          <CheckCircle size={12} className="text-green-500" />
        )}
        {savedStatus === 'unsaved' && (
          <div className="w-2 h-2 rounded-full bg-amber-500" />
        )}
        <span className={`text-[10px] font-medium ${
          savedStatus === 'saved' ? 'text-green-500' :
          savedStatus === 'saving' ? 'text-blue-400' : 'text-amber-500'
        }`}>
          {savedStatus === 'saved' ? 'Guardado' : savedStatus === 'saving' ? 'Guardando...' : 'Sin guardar'}
        </span>
      </div>

      <div className="h-4 w-px bg-surface-700" />

      {/* Primary actions */}
      <ToolbarBtn onClick={onSave} icon={<Save size={13} />} label="Guardar" />
      <ToolbarBtn onClick={onShowVersions} icon={<GitBranch size={13} />} label="Versiones" />
      <ToolbarBtn onClick={() => {}} icon={<Play size={13} />} label="Simular" accent="green" />

      <div className="h-4 w-px bg-surface-700" />

      {/* Validation badge */}
      <button
        onClick={onShowValidation}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
          errorCount > 0
            ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-900/50'
            : warningCount > 0
            ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50 border border-amber-900/50'
            : 'bg-green-900/30 text-green-400 hover:bg-green-900/50 border border-green-900/50'
        }`}
      >
        {errorCount > 0 || warningCount > 0
          ? <AlertTriangle size={12} />
          : <CheckCircle size={12} />
        }
        {errorCount > 0 ? `${errorCount} error${errorCount > 1 ? 'es' : ''}` :
         warningCount > 0 ? `${warningCount} aviso${warningCount > 1 ? 's' : ''}` :
         'Válido'}
      </button>

      {/* Stats */}
      <div className="hidden lg:flex items-center gap-3 ml-1">
        <Stat label="Costo est." value={`$${totalCost.toFixed(4)}`} />
        <Stat label="Tiempo est." value={`${totalTime}s`} />
      </div>

      <div className="flex-1" />

      {/* IO buttons */}
      <div className="hidden lg:flex items-center gap-1">
        <ToolbarBtn onClick={() => {}} icon={<Upload size={13} />} label="Importar" />
        <ToolbarBtn onClick={() => {}} icon={<Download size={13} />} label="Exportar" />
        <ToolbarBtn onClick={() => {}} icon={<Share2 size={13} />} label="Compartir" />
      </div>

      <div className="h-4 w-px bg-surface-700 hidden lg:block" />

      {/* Optimize */}
      <button
        onClick={onOptimize}
        disabled={isOptimizing}
        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-[11px] font-semibold rounded-lg shadow transition-all disabled:opacity-60"
      >
        {isOptimizing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        Optimizar
      </button>
    </div>
  );
}

function ToolbarBtn({
  onClick, icon, label, accent,
}: {
  onClick: () => void; icon: React.ReactNode; label: string; accent?: 'green';
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
        accent === 'green'
          ? 'text-green-400 hover:text-green-300 hover:bg-green-900/30'
          : 'text-neutral-400 hover:text-neutral-200 hover:bg-surface-800'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] text-neutral-600">{label}</p>
      <p className="text-[11px] font-semibold text-neutral-300">{value}</p>
    </div>
  );
}
