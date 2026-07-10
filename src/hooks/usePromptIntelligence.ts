import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  PromptVersion, PromptAnalysis, PromptVariant, IntentResult,
  AISuggestion, PromptScoreMetrics, AnalysisStatus, OptimizationStatus, VariantType,
} from '../types/prompt';
import { DEFAULT_PROMPT, makeVersion, countTokens } from '../lib/promptMocks';
import { getPromptProvider } from '../services/prompt.service';
import { supabase } from '../lib/supabase';
import { useOrganization } from './useOrganization';

export function usePromptIntelligence() {
  const { activeOrg } = useOrganization();

  // ── Editor state ────────────────────────────────────────────────────────────
  const [content, setContent]           = useState(DEFAULT_PROMPT);
  const [history, setHistory]           = useState<PromptVersion[]>([
    makeVersion(DEFAULT_PROMPT, 'v1.0 Borrador inicial'),
  ]);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Analysis state ──────────────────────────────────────────────────────────
  const [analysisStatus, setAnalysisStatus]   = useState<AnalysisStatus>('idle');
  const [analysis, setAnalysis]               = useState<PromptAnalysis | null>(null);

  // ── Optimization state ──────────────────────────────────────────────────────
  const [optimizationStatus, setOptimizationStatus] = useState<OptimizationStatus>('idle');
  const [variants, setVariants]                     = useState<PromptVariant[]>([]);
  const [selectedVariant, setSelectedVariant]       = useState<VariantType>('original');

  // ── Intent & suggestions & score ────────────────────────────────────────────
  const [intents, setIntents]         = useState<IntentResult[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [score, setScore]             = useState<PromptScoreMetrics | null>(null);

  // ── Active panel tab ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'analyzer' | 'optimizer' | 'intent' | 'suggestions'>('analyzer');

  // ── Derived ─────────────────────────────────────────────────────────────────
  const tokens = countTokens(content);
  const chars  = content.length;
  const isOptimizing = optimizationStatus === 'optimizing' || analysisStatus === 'analyzing';

  // ── Auto-save (debounced, saves version after 3s of inactivity) ─────────────
  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      setHistory(prev => {
        const last = prev[prev.length - 1];
        if (last?.content === newContent) return prev;
        const label = `v${(prev.length + 1).toFixed(1)} Autoguardado`;
        return [...prev.slice(-9), makeVersion(newContent, label)];
      });
    }, 3000);
  }, []);

  useEffect(() => () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); }, []);

  const saveVersion = useCallback((label?: string) => {
    setHistory(prev => {
      const n = prev.length + 1;
      return [...prev.slice(-9), makeVersion(content, label ?? `v${n}.0 Manual`)];
    });
  }, [content]);

  const restoreVersion = useCallback((v: PromptVersion) => {
    setContent(v.content);
  }, []);

  // ── Core: run full optimization pipeline ────────────────────────────────────
  const runOptimize = useCallback(async () => {
    if (!content.trim() || isOptimizing) return;
    const provider = getPromptProvider();

    setAnalysisStatus('analyzing');
    setOptimizationStatus('optimizing');
    setActiveTab('analyzer');

    try {
      // Step 1: Analysis (show results as soon as ready)
      const newAnalysis = await provider.analyze(content, { provider: 'openai', model: 'gpt-4o-mini' });
      setAnalysis(newAnalysis);
      setAnalysisStatus('ready');
      setActiveTab('analyzer');

      // Step 2: Intents
      const newIntents = await provider.detectIntents(content, { provider: 'openai', model: 'gpt-4o-mini' });
      setIntents(newIntents);

      // Step 3: Suggestions
      const newSuggestions = await provider.suggest(content, newAnalysis, { provider: 'openai', model: 'gpt-4o-mini' });
      setSuggestions(newSuggestions);

      // Step 4: Variants
      const newVariants = await provider.optimize(content, { provider: 'openai', model: 'gpt-4o' });
      setVariants(newVariants);
      setSelectedVariant('optimized');
      setOptimizationStatus('ready');
      setActiveTab('optimizer');

      // Step 5: Score
      const newScore = await provider.score(content, newAnalysis, { provider: 'openai', model: 'gpt-4o-mini' });
      setScore(newScore);

      // Persist to Supabase
      if (activeOrg?.id) {
        const primaryIntent = newIntents.find(i => i.detected)?.label ?? null;
        await supabase.from('prompt_sessions').insert({
          organization_id:   activeOrg.id,
          title:             content.slice(0, 60) + (content.length > 60 ? '…' : ''),
          content,
          quality_score:     newAnalysis.qualityScore,
          primary_intent:    primaryIntent,
          optimized_content: newVariants.find(v => v.type === 'optimized')?.content ?? null,
          metadata:          { analysis: newAnalysis, intents: newIntents, suggestions: newSuggestions, score: newScore },
        });
      }
    } catch {
      setAnalysisStatus('ready');
      setOptimizationStatus('ready');
    }
  }, [content, isOptimizing, activeOrg]);

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, implemented: true } : s));
  }, []);

  const applyVariant = useCallback((type: VariantType) => {
    const variant = variants.find(v => v.type === type);
    if (!variant) return;
    setContent(variant.content);
    saveVersion(`Aplicado: ${variant.label}`);
    setAnalysisStatus('idle');
    setOptimizationStatus('idle');
  }, [variants, saveVersion]);

  const reset = useCallback(() => {
    setContent(DEFAULT_PROMPT);
    setAnalysis(null);
    setVariants([]);
    setIntents([]);
    setSuggestions([]);
    setScore(null);
    setAnalysisStatus('idle');
    setOptimizationStatus('idle');
    setSelectedVariant('original');
  }, []);

  return {
    // Editor
    content, updateContent, tokens, chars,
    history, saveVersion, restoreVersion,

    // Analysis
    analysisStatus, analysis,

    // Optimization
    optimizationStatus, variants, selectedVariant, setSelectedVariant,

    // Intent + suggestions + score
    intents, suggestions, score,
    dismissSuggestion, applyVariant,

    // UI state
    activeTab, setActiveTab,
    isOptimizing,

    // Actions
    runOptimize, reset,
  };
}
