import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useOrganization } from './useOrganization';
import { useDashboard, type DashboardPeriod } from './useDashboard';
import { track } from '../lib/telemetry';
import {
  ANALYSIS_STAGES,
  STAGE_DURATION_MS,
  generateAnalysisResult,
  validateAnalysisPreconditions,
} from '../lib/analysisEngine';
import {
  calculateHealthScore,
  assessDataQuality,
  generateExecutiveReport,
} from '../lib/healthScoreEngine';
import type {
  AnalysisStatus,
  AnalysisStage,
  AnalysisResult,
  AnalysisOpportunity,
  AnalysisHistoryItem,
  AnalysisValidation,
  ExecutiveReportData,
} from '../types/analysis';

export type { AnalysisStatus, AnalysisStage, AnalysisResult, AnalysisOpportunity, AnalysisHistoryItem, AnalysisValidation, ExecutiveReportData };

export function useAnalysis() {
  const { user } = useAuth();
  const { activeOrg, members } = useOrganization();
  const dashboard = useDashboard(30 as DashboardPeriod);

  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [stages, setStages] = useState<AnalysisStage[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [executiveReport, setExecutiveReport] = useState<ExecutiveReportData | null>(null);

  const orgId = activeOrg?.id ?? null;
  const cancelRef = useRef(false);

  // Fetch history on mount
  useEffect(() => {
    if (!orgId) {
      setHistory([]);
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);
    supabase
      .from('business_analyses')
      .select('id, status, scope, created_at, completed_at, duration_ms, opportunities_count, confidence, engine_version, error, user_id')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error: err }) => {
        if (err) {
          setHistory([]);
        } else {
          setHistory((data ?? []) as AnalysisHistoryItem[]);
        }
        setHistoryLoading(false);
      });
  }, [orgId]);

  const validate = useCallback((): AnalysisValidation => {
    const role = activeOrg?.role;
    return validateAnalysisPreconditions(!!user, !!activeOrg, role, 0);
  }, [user, activeOrg]);

  const startAnalysis = useCallback(async (): Promise<void> => {
    if (!orgId || !user) {
      setError('Falta organización o usuario');
      setStatus('error');
      return;
    }

    const validation = validate();
    if (!validation.valid) {
      setError(validation.errors.map((e) => e.message).join('. '));
      setStatus('error');
      return;
    }

    track('analysis_started', { org_id: orgId });
    cancelRef.current = false;
    setError(null);
    setResult(null);
    setStatus('preparing');

    const startTime = Date.now();

    // Create initial record in Supabase
    const { data: analysisRecord, error: insertError } = await supabase
      .from('business_analyses')
      .insert({
        organization_id: orgId,
        user_id: user.id,
        status: 'preparing',
        scope: `Análisis de ${activeOrg?.name ?? 'la organización'}`,
        engine_version: '1.0.0',
      })
      .select()
      .single();

    if (insertError || !analysisRecord) {
      setError('Error al crear el registro de análisis');
      setStatus('error');
      track('analysis_failed', { org_id: orgId, reason: 'insert_error' });
      return;
    }

    const analysisId = analysisRecord.id;
    setCurrentAnalysisId(analysisId);

    // Initialize stages
    const initialStages: AnalysisStage[] = ANALYSIS_STAGES.map((s) => ({
      id: s.id,
      label: s.label,
      description: s.description,
      status: 'pending',
      progress: 0,
    }));
    setStages(initialStages);

    // Run each stage with real timing
    for (let i = 0; i < ANALYSIS_STAGES.length; i++) {
      if (cancelRef.current) {
        await supabase.from('business_analyses').update({ status: 'cancelled' }).eq('id', analysisId);
        setStatus('cancelled');
        track('analysis_cancelled', { org_id: orgId });
        return;
      }

      const stage = ANALYSIS_STAGES[i];
      const stageId = stage.id;

      // Mark current stage as running
      setStages((prev) =>
        prev.map((s) =>
          s.id === stageId
            ? { ...s, status: 'running', progress: 0, startedAt: new Date().toISOString() }
            : s,
        ),
      );

      // Update analysis status in DB
      await supabase.from('business_analyses').update({ status: stageId }).eq('id', analysisId);

      // Animate progress
      const progressSteps = 10;
      for (let p = 0; p <= progressSteps; p++) {
        if (cancelRef.current) break;
        const progress = (p / progressSteps) * 100;
        setStages((prev) =>
          prev.map((s) => (s.id === stageId ? { ...s, progress } : s)),
        );
        await new Promise((resolve) => setTimeout(resolve, STAGE_DURATION_MS / progressSteps));
      }

      // Mark stage as completed
      setStages((prev) =>
        prev.map((s) =>
          s.id === stageId
            ? { ...s, status: 'completed', progress: 100, completedAt: new Date().toISOString() }
            : s,
        ),
      );
    }

    if (cancelRef.current) {
      await supabase.from('business_analyses').update({ status: 'cancelled' }).eq('id', analysisId);
      setStatus('cancelled');
      return;
    }

    // Gather real data for analysis
    const inputs = {
      org: {
        name: activeOrg?.name ?? 'Organización',
        plan: activeOrg?.plan ?? 'free',
        sector: (activeOrg as any)?.sector,
        companySize: (activeOrg as any)?.company_size,
        country: (activeOrg as any)?.country,
      },
      sessionCount: dashboard.kpis.find((k) => k.id === 'sessions')?.rawValue ?? 0,
      executionCount: dashboard.kpis.find((k) => k.id === 'runs')?.rawValue ?? 0,
      workflowCount: dashboard.kpis.find((k) => k.id === 'workflows')?.rawValue ?? 0,
      promptCount: dashboard.kpis.find((k) => k.id === 'prompts')?.rawValue ?? 0,
      brainDecisionCount: dashboard.kpis.find((k) => k.id === 'decisions')?.rawValue ?? 0,
      memoryCount: dashboard.kpis.find((k) => k.id === 'memories')?.rawValue ?? 0,
      errorCount: dashboard.alerts.find((a) => a.id === 'exec-errors') ? 1 : 0,
      apiKeysCount: 0,
      memberCount: members.length,
      connectorsConnected: 0,
    };

    // Generate analysis result
    const analysisResult = generateAnalysisResult(inputs);
    const durationMs = Date.now() - startTime;

    // Persist opportunities to Supabase
    const opportunityRecords = analysisResult.opportunities.map((opp) => ({
      analysis_id: analysisId,
      organization_id: orgId,
      user_id: user.id,
      title: opp.title,
      description: opp.description,
      category: opp.category,
      priority: opp.priority,
      priority_explanation: opp.priorityExplanation,
      confidence: opp.confidence,
      impact: opp.impact,
      effort: opp.effort,
      estimated_roi: opp.estimated_roi,
      economic_impact: opp.economicImpact,
      operational_impact: opp.operationalImpact,
      risk: opp.risk,
      implementation_time: opp.implementationTime,
      dependencies: JSON.stringify(opp.dependencies),
      source: opp.source,
      evidence: JSON.stringify(opp.evidence),
      status: 'new',
    }));

    if (opportunityRecords.length > 0) {
      await supabase.from('business_opportunities').insert(opportunityRecords);
    }

    // Update analysis record with result
    const { data: updatedRecord } = await supabase
      .from('business_analyses')
      .update({
        status: 'completed',
        result: JSON.parse(JSON.stringify(analysisResult)),
        duration_ms: durationMs,
        opportunities_count: analysisResult.opportunities.length,
        confidence: analysisResult.confidence,
        completed_at: new Date().toISOString(),
      })
      .eq('id', analysisId)
      .select()
      .single();

    // Fetch the persisted opportunities with their IDs
    const { data: persistedOpps } = await supabase
      .from('business_opportunities')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('created_at', { ascending: true });

    if (persistedOpps && persistedOpps.length > 0) {
      analysisResult.opportunities = persistedOpps.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        priority: p.priority,
        priorityExplanation: p.priority_explanation ?? '',
        confidence: p.confidence,
        impact: p.impact,
        effort: p.effort,
        estimated_roi: p.estimated_roi,
        economicImpact: p.economic_impact ?? '',
        operationalImpact: p.operational_impact ?? '',
        risk: p.risk ?? 'low',
        implementationTime: p.implementation_time ?? '',
        dependencies: typeof p.dependencies === 'string' ? JSON.parse(p.dependencies) : (p.dependencies ?? []),
        source: p.source,
        evidence: typeof p.evidence === 'string' ? JSON.parse(p.evidence) : p.evidence,
        status: p.status,
        assignedTo: p.assigned_to ?? null,
        created_at: p.created_at,
        resolved_at: p.resolved_at,
      }));
    }

    setResult(analysisResult);
    setStatus('completed');

    // Generate executive report from health score
    const scoreInputs = {
      sessionCount: inputs.sessionCount,
      executionCount: inputs.executionCount,
      workflowCount: inputs.workflowCount,
      promptCount: inputs.promptCount,
      brainDecisionCount: inputs.brainDecisionCount,
      memoryCount: inputs.memoryCount,
      errorCount: inputs.errorCount,
      apiKeysCount: inputs.apiKeysCount,
      memberCount: inputs.memberCount,
      connectorsConnected: inputs.connectorsConnected,
      plan: inputs.org.plan,
    };
    const healthScore = calculateHealthScore(scoreInputs);
    const dataQuality = assessDataQuality(scoreInputs);
    const execReport = generateExecutiveReport(healthScore, dataQuality, analysisResult, inputs.org.name);
    setExecutiveReport(execReport);

    track('analysis_completed', {
      org_id: orgId,
      opportunities: analysisResult.opportunities.length,
      confidence: analysisResult.confidence,
      duration_ms: durationMs,
    });

    // Refresh history
    const { data: newHistory } = await supabase
      .from('business_analyses')
      .select('id, status, scope, created_at, completed_at, duration_ms, opportunities_count, confidence, engine_version, error, user_id')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (newHistory) setHistory(newHistory as AnalysisHistoryItem[]);
  }, [orgId, user, activeOrg, members, dashboard.kpis, dashboard.alerts, validate]);

  const cancelAnalysis = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const resetAnalysis = useCallback(() => {
    setStatus('idle');
    setStages([]);
    setResult(null);
    setError(null);
    setCurrentAnalysisId(null);
    setExecutiveReport(null);
    cancelRef.current = false;
  }, []);

  const updateOpportunityStatus = useCallback(
    async (opportunityId: string, newStatus: AnalysisOpportunity['status']) => {
      if (!orgId) return;

      const { error: updateError } = await supabase
        .from('business_opportunities')
        .update({
          status: newStatus,
          resolved_at: newStatus === 'approved' || newStatus === 'discarded' ? new Date().toISOString() : null,
        })
        .eq('id', opportunityId);

      if (updateError) {
        setError('Error al actualizar la oportunidad');
        return;
      }

      // Update local state
      if (result) {
        setResult({
          ...result,
          opportunities: result.opportunities.map((o) =>
            o.id === opportunityId ? { ...o, status: newStatus } : o,
          ),
        });
      }

      const eventMap = {
        approved: 'opportunity_approved',
        discarded: 'opportunity_rejected',
        sent_to_copilot: 'copilot_opened',
        automated: 'automation_created',
      };
      track((eventMap[newStatus] as any) ?? 'opportunity_updated', { opportunity_id: opportunityId, status: newStatus });
    },
    [orgId, result],
  );

  const deleteAnalysis = useCallback(
    async (analysisId: string) => {
      if (!orgId) return;

      const { error: deleteError } = await supabase
        .from('business_analyses')
        .delete()
        .eq('id', analysisId);

      if (deleteError) {
        setError('Error al eliminar el análisis');
        return;
      }

      setHistory((prev) => prev.filter((h) => h.id !== analysisId));
      track('analysis_deleted', { analysis_id: analysisId });
    },
    [orgId],
  );

  const loadAnalysis = useCallback(async (analysisId: string) => {
    setError(null);

    const { data, error: loadError } = await supabase
      .from('business_analyses')
      .select('*')
      .eq('id', analysisId)
      .maybeSingle();

    if (loadError || !data) {
      setError('Error al cargar el análisis');
      return;
    }

    track('analysis_opened', { analysis_id: analysisId });

    // Load opportunities for this analysis
    const { data: opps } = await supabase
      .from('business_opportunities')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('created_at', { ascending: true });

    const analysisResult = (data.result as AnalysisResult) ?? null;
    if (analysisResult && opps && opps.length > 0) {
      analysisResult.opportunities = opps.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        priority: p.priority,
        priorityExplanation: p.priority_explanation ?? '',
        confidence: p.confidence,
        impact: p.impact,
        effort: p.effort,
        estimated_roi: p.estimated_roi,
        economicImpact: p.economic_impact ?? '',
        operationalImpact: p.operational_impact ?? '',
        risk: p.risk ?? 'low',
        implementationTime: p.implementation_time ?? '',
        dependencies: typeof p.dependencies === 'string' ? JSON.parse(p.dependencies) : (p.dependencies ?? []),
        source: p.source,
        evidence: typeof p.evidence === 'string' ? JSON.parse(p.evidence) : p.evidence,
        status: p.status,
        assignedTo: p.assigned_to ?? null,
        created_at: p.created_at,
        resolved_at: p.resolved_at,
      }));
    }

    setResult(analysisResult);
    setStatus('completed');
    setCurrentAnalysisId(analysisId);

    // Rebuild executive report if result has health score data
    if (analysisResult) {
      const scoreInputs = {
        sessionCount: 0, executionCount: 0, workflowCount: 0, promptCount: 0,
        brainDecisionCount: 0, memoryCount: 0, errorCount: 0, apiKeysCount: 0,
        memberCount: 0, connectorsConnected: 0, plan: 'free',
      };
      // Use area scores to reconstruct a minimal health score
      const healthScore = calculateHealthScore(scoreInputs);
      const dataQuality = assessDataQuality(scoreInputs);
      const execReport = generateExecutiveReport(healthScore, dataQuality, analysisResult, activeOrg?.name ?? 'Organización');
      setExecutiveReport(execReport);
    }
  }, [activeOrg]);

  return {
    status,
    stages,
    result,
    error,
    history,
    historyLoading,
    currentAnalysisId,
    executiveReport,
    validate,
    startAnalysis,
    cancelAnalysis,
    resetAnalysis,
    updateOpportunityStatus,
    deleteAnalysis,
    loadAnalysis,
  };
}
