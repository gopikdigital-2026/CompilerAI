import { supabase } from '../lib/supabase';
import type { Blueprint, CompilerSession } from '../types/blueprint';
import { compilerCore } from '../compiler/core';

// ─── DB operations ────────────────────────────────────────────────────────────

export const getCompilerSessions = async (organizationId: string): Promise<CompilerSession[]> => {
  const { data, error } = await supabase
    .from('compiler_sessions')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as CompilerSession[];
};

export const saveCompilerSession = async (
  organizationId: string,
  prompt: string,
  blueprint: Blueprint,
): Promise<CompilerSession> => {
  const { data, error } = await supabase
    .from('compiler_sessions')
    .insert({
      organization_id: organizationId,
      prompt,
      blueprint,
      status: 'complete',
    })
    .select()
    .single();
  if (error) throw error;
  return data as CompilerSession;
};

export const deleteCompilerSession = async (sessionId: string): Promise<void> => {
  const { error } = await supabase
    .from('compiler_sessions')
    .delete()
    .eq('id', sessionId);
  if (error) throw error;
};

// ─── Compiler engine — powered by src/compiler/core ──────────────────────────
// To connect a real LLM provider, call:
//   compilerCore.setProvider(new OpenAIProvider(apiKey))
// before invoking compilePrompt.

export const compilePrompt = async (
  prompt: string,
  opts?: { orgId?: string; userId?: string },
): Promise<Blueprint> => {
  const result = await compilerCore.compile(prompt, opts);
  if (result.status === 'error' || !result.blueprint) {
    throw new Error(result.error ?? 'Compilation failed');
  }
  return result.blueprint;
};

// Re-export core helpers for advanced usage (streaming, abort, stage labels)
export { compilerCore };

