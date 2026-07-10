import { useState, useCallback, useRef } from 'react';
import type { WorkflowNode, WorkflowEdge, ValidationIssue, WorkflowVersion, OptimizationSuggestion } from '../types/workflow';
import {
  INITIAL_NODES, INITIAL_EDGES, validateWorkflow,
  buildOptimizationSuggestions, buildMockVersions, buildNewNode,
} from '../lib/workflowMocks';
import { supabase } from '../lib/supabase';
import { useOrganization } from './useOrganization';

export function useWorkflowDesigner() {
  const { activeOrg } = useOrganization();

  // ── Core data ───────────────────────────────────────────────────────────────
  const [nodes, setNodes] = useState<WorkflowNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<WorkflowEdge[]>(INITIAL_EDGES);
  const [workflowName, setWorkflowName] = useState('Pipeline B2B Pedidos');
  const [savedStatus, setSavedStatus]   = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [designId, setDesignId]         = useState<string | null>(null);

  // ── Selection ───────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // ── Panels ──────────────────────────────────────────────────────────────────
  const [showValidation, setShowValidation]     = useState(false);
  const [showVersions, setShowVersions]         = useState(false);
  const [showOptimize, setShowOptimize]         = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);

  // ── Versions & Optimization ─────────────────────────────────────────────────
  const [versions]            = useState<WorkflowVersion[]>(buildMockVersions);
  const [optimizations, setOptimizations] = useState<OptimizationSuggestion[]>([]);
  const [isOptimizing, setIsOptimizing]   = useState(false);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;
  const validationIssues: ValidationIssue[] = validateWorkflow(nodes, edges);
  const errorCount   = validationIssues.filter(i => i.severity === 'error').length;
  const warningCount = validationIssues.filter(i => i.severity === 'warning').length;

  const totalCost = nodes.reduce((sum, n) => sum + (n.estimatedCostUsd ?? 0), 0);
  const totalTime = nodes.reduce((sum, n) => sum + (n.estimatedTimeS ?? 0), 0);

  // ── Node operations ─────────────────────────────────────────────────────────

  const addNode = useCallback((type: WorkflowNode['type'], x: number, y: number) => {
    const node = buildNewNode(type, x, y);
    setNodes(prev => [...prev, node]);
    setSelectedNodeId(node.id);
    markUnsaved();
  }, []);

  const moveNode = useCallback((id: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
    markUnsaved();
  }, []);

  const updateNode = useCallback((id: string, updates: Partial<WorkflowNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    markUnsaved();
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.sourceNodeId !== id && e.targetNodeId !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
    markUnsaved();
  }, [selectedNodeId]);

  const duplicateNode = useCallback((id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const newNode = buildNewNode(node.type, node.x + 40, node.y + 40);
    newNode.label   = `${node.label} (copia)`;
    newNode.config  = { ...node.config };
    newNode.state   = 'pending';
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    markUnsaved();
  }, [nodes]);

  const addComment = useCallback((nodeId: string, text: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? {
      ...n,
      comments: [...n.comments, {
        id: `c-${Date.now()}`, text, author: 'Tú',
        createdAt: new Date().toISOString(),
      }],
    } : n));
    markUnsaved();
  }, []);

  // ── Edge operations ─────────────────────────────────────────────────────────

  const addEdge = useCallback((
    sourceNodeId: string, sourcePortId: string,
    targetNodeId: string, targetPortId: string,
  ) => {
    const alreadyExists = edges.some(e =>
      e.sourceNodeId === sourceNodeId && e.sourcePortId === sourcePortId &&
      e.targetNodeId === targetNodeId && e.targetPortId === targetPortId
    );
    if (alreadyExists) return;
    const newEdge: WorkflowEdge = {
      id: `e-${Date.now()}`, sourceNodeId, sourcePortId, targetNodeId, targetPortId,
    };
    setEdges(prev => [...prev, newEdge]);
    markUnsaved();
  }, [edges]);

  const deleteEdge = useCallback((id: string) => {
    setEdges(prev => prev.filter(e => e.id !== id));
    if (selectedEdgeId === id) setSelectedEdgeId(null);
    markUnsaved();
  }, [selectedEdgeId]);

  // ── Selection ───────────────────────────────────────────────────────────────

  const selectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
  }, []);

  const selectEdge = useCallback((id: string | null) => {
    setSelectedEdgeId(id);
    setSelectedNodeId(null);
  }, []);

  // ── Save ────────────────────────────────────────────────────────────────────

  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function markUnsaved() {
    setSavedStatus('unsaved');
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => autoSave(), 5000);
  }

  async function autoSave() {
    if (!activeOrg?.id) return;
    setSavedStatus('saving');
    try {
      const payload = {
        organization_id: activeOrg.id,
        name: workflowName,
        nodes: nodes as unknown as Record<string, unknown>[],
        edges: edges as unknown as Record<string, unknown>[],
        metadata: { versions: [], validationIssues },
      };
      if (designId) {
        await supabase.from('workflow_designs').update(payload).eq('id', designId);
      } else {
        const { data } = await supabase.from('workflow_designs').insert(payload).select('id').maybeSingle();
        if (data?.id) setDesignId(data.id);
      }
      setSavedStatus('saved');
    } catch {
      setSavedStatus('unsaved');
    }
  }

  const save = useCallback(() => autoSave(), [nodes, edges, workflowName, activeOrg]);

  // ── Optimize ────────────────────────────────────────────────────────────────

  const runOptimize = useCallback(async () => {
    setIsOptimizing(true);
    setShowOptimize(true);
    await new Promise(r => setTimeout(r, 1800));
    setOptimizations(buildOptimizationSuggestions(nodes));
    setIsOptimizing(false);
  }, [nodes]);

  // ── Select all / delete selected ────────────────────────────────────────────

  const deleteSelected = useCallback(() => {
    if (selectedNodeId) deleteNode(selectedNodeId);
    if (selectedEdgeId) deleteEdge(selectedEdgeId);
  }, [selectedNodeId, selectedEdgeId, deleteNode, deleteEdge]);

  return {
    // Data
    nodes, edges, workflowName, setWorkflowName,
    savedStatus,

    // Selection
    selectedNodeId, selectedNode,
    selectedEdgeId,
    selectNode, selectEdge,

    // Node ops
    addNode, moveNode, updateNode, deleteNode, duplicateNode, addComment,

    // Edge ops
    addEdge, deleteEdge,

    // Panels
    showValidation, setShowValidation,
    showVersions, setShowVersions,
    showOptimize, setShowOptimize,
    showCommentInput, setShowCommentInput,

    // Validation
    validationIssues, errorCount, warningCount,

    // Versions
    versions,

    // Optimization
    optimizations, isOptimizing, runOptimize,

    // Stats
    totalCost, totalTime,

    // Save
    save, deleteSelected,
  };
}
