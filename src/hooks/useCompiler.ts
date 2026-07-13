import { useCallback, useEffect, useRef, useState } from 'react';
import { useOrganization } from './useOrganization';
import {
  compilePrompt,
  getCompilerSessions,
  saveCompilerSession,
  deleteCompilerSession,
} from '../services/compiler.service';
import type { Blueprint, CompilerSession } from '../types/blueprint';

export type CompileStatus = 'idle' | 'compiling' | 'complete' | 'error';

const COMPILE_STEPS_ES = [
  'Analizando petición...',
  'Diseñando arquitectura...',
  'Generando agentes...',
  'Calculando costes...',
  'Validando Blueprint...',
];

const COMPILE_STEPS_EN = [
  'Analyzing request...',
  'Designing architecture...',
  'Generating agents...',
  'Estimating costs...',
  'Validating Blueprint...',
];

export function useCompiler(lang: string) {
  const { activeOrg } = useOrganization();
  const activeOrgId = activeOrg?.id ?? null;
  const activeOrgRef = useRef(activeOrg);
  activeOrgRef.current = activeOrg;
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<CompileStatus>('idle');
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [sessions, setSessions] = useState<CompilerSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compileStep, setCompileStep] = useState(0);

  const STEPS = lang === 'es' ? COMPILE_STEPS_ES : COMPILE_STEPS_EN;

  // Load history when org is available
  useEffect(() => {
    if (!activeOrgId) { setLoadingHistory(false); return; }
    setLoadingHistory(true);
    getCompilerSessions(activeOrgId)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoadingHistory(false));
  }, [activeOrgId]);

  const compile = useCallback(async () => {
    const org = activeOrgRef.current;
    if (!prompt.trim() || !org) return;
    setStatus('compiling');
    setBlueprint(null);
    setError(null);
    setCompileStep(0);

    // Cycle through compile steps for UX feedback
    let step = 0;
    const stepInterval = setInterval(() => {
      step = Math.min(step + 1, STEPS.length - 1);
      setCompileStep(step);
    }, 400);

    try {
      const result = await compilePrompt(prompt);
      clearInterval(stepInterval);
      setBlueprint(result);
      setStatus('complete');

      // Persist to DB in background
      saveCompilerSession(org.id, prompt, result)
        .then((session) => setSessions((prev) => [session, ...prev]))
        .catch(() => { /* non-fatal */ });
    } catch (err) {
      clearInterval(stepInterval);
      setError(err instanceof Error ? err.message : 'Compilation failed');
      setStatus('error');
    }
  }, [prompt, STEPS.length]);

  const loadSession = useCallback((session: CompilerSession) => {
    setPrompt(session.prompt);
    setBlueprint(session.blueprint);
    setStatus(session.blueprint ? 'complete' : 'idle');
    setError(null);
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    await deleteCompilerSession(sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    // If we're showing that session's blueprint, reset
    setSessions((prev) => {
      if (!prev.find((s) => s.id === sessionId)) {
        setBlueprint(null);
        setStatus('idle');
      }
      return prev;
    });
  }, []);

  const reset = useCallback(() => {
    setPrompt('');
    setBlueprint(null);
    setStatus('idle');
    setError(null);
  }, []);

  return {
    prompt,
    setPrompt,
    status,
    blueprint,
    sessions,
    loadingHistory,
    error,
    compileStep,
    compileStepLabel: STEPS[compileStep],
    compile,
    loadSession,
    deleteSession,
    reset,
  };
}
