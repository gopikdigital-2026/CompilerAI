import { useState, useCallback } from 'react';
import type { BrainDecision, BrainModule } from '../types/brain';
import {
  MOCK_DECISIONS, MOCK_MASTER_PLAN, MOCK_REASONING_CHAIN,
  MOCK_STRATEGIES, MOCK_RISKS, MOCK_OPTIMIZATIONS, MOCK_BRAIN_STATS,
} from '../lib/brainMocks';

export function useBrain() {
  const [activeModule, setActiveModule] = useState<BrainModule>('decision');
  const [selectedDecision, setSelectedDecision] = useState<BrainDecision | null>(null);
  const [showWhyModal, setShowWhyModal] = useState(false);
  const [decisionFilter, setDecisionFilter] = useState<'all' | BrainModule | 'pending'>('all');

  const openWhy = useCallback((dec: BrainDecision) => {
    setSelectedDecision(dec);
    setShowWhyModal(true);
  }, []);

  const closeWhy = useCallback(() => {
    setShowWhyModal(false);
    setSelectedDecision(null);
  }, []);

  const filteredDecisions = decisionFilter === 'all'
    ? MOCK_DECISIONS
    : decisionFilter === 'pending'
      ? MOCK_DECISIONS.filter(d => d.status === 'pending')
      : MOCK_DECISIONS.filter(d => d.module === decisionFilter);

  return {
    // Active module state
    activeModule,
    setActiveModule,

    // Data
    decisions:     filteredDecisions,
    allDecisions:  MOCK_DECISIONS,
    masterPlan:    MOCK_MASTER_PLAN,
    reasoningChain: MOCK_REASONING_CHAIN,
    strategies:    MOCK_STRATEGIES,
    risks:         MOCK_RISKS,
    optimizations: MOCK_OPTIMIZATIONS,
    stats:         MOCK_BRAIN_STATS,

    // Decision filter
    decisionFilter,
    setDecisionFilter,

    // Why? modal
    selectedDecision,
    showWhyModal,
    openWhy,
    closeWhy,
  };
}
