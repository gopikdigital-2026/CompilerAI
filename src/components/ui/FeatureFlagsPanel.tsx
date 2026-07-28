import { useState, useEffect, useCallback } from 'react';
import { ToggleLeft, ToggleRight, RefreshCw, Flag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useToast } from './Toast';
import { DemoBadge } from './DemoBadge';

interface FlagRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
}

export function FeatureFlagsPanel() {
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const toast = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('feature_flags').select('*').order('name');
    if (error) {
      logger.supabaseError('fetchFlags', error);
      toast.showError('Error al cargar feature flags');
    } else {
      setFlags((data ?? []) as FlagRow[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async (flag: FlagRow) => {
    setUpdating(flag.key);
    const { error } = await supabase
      .from('feature_flags')
      .update({ enabled: !flag.enabled, updated_at: new Date().toISOString() })
      .eq('id', flag.id);
    if (error) {
      logger.supabaseError('toggleFlag', error);
      toast.showError(`Error al ${flag.enabled ? 'desactivar' : 'activar'} ${flag.name}`);
    } else {
      toast.showSuccess(`${flag.name} ${flag.enabled ? 'desactivado' : 'activado'}`);
      setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, enabled: !f.enabled } : f)));
    }
    setUpdating(null);
  };

  return (
    <div data-testid="feature-flags-panel" className="card p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <Flag size={14} className="text-brand-400" />
            Feature Flags
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">Activa o desactiva módulos sin desplegar</p>
        </div>
        <button onClick={refresh} disabled={loading} className="btn-ghost text-xs flex items-center gap-1.5 disabled:opacity-50">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5,6].map((i) => <div key={i} className="h-10 rounded bg-surface-700 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-1">
          {flags.map((flag) => (
            <div
              key={flag.id}
              data-testid={`feature-flag-${flag.key}`}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-surface-750 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-200 font-medium">{flag.name}</span>
                  <code className="text-[10px] text-neutral-600 font-mono">{flag.key}</code>
                </div>
                {flag.description && <p className="text-xs text-neutral-500 mt-0.5 truncate">{flag.description}</p>}
              </div>
              <button
                onClick={() => toggle(flag)}
                disabled={updating === flag.key}
                data-testid={`flag-toggle-${flag.key}`}
                className="flex-shrink-0 ml-3 transition-transform hover:scale-110 disabled:opacity-50"
              >
                {flag.enabled ? (
                  <ToggleRight size={32} className="text-success-400" />
                ) : (
                  <ToggleLeft size={32} className="text-neutral-600" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
