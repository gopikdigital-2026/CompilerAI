import { supabase } from '../lib/supabase';
import { generateMockBlueprint } from '../lib/blueprintMocks';
import type { Blueprint, CompilerSession } from '../types/blueprint';

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

// ─── Compiler engine (mock → replace body with real AI call) ──────────────────

// This function is intentionally structured to be swapped for a real AI provider.
// To connect OpenAI: replace the body with `openai.chat.completions.create(...)`.
// To connect Anthropic: replace with `anthropic.messages.create(...)`.
// To connect Gemini: replace with `genai.generateContent(...)`.
export const compilePrompt = async (prompt: string): Promise<Blueprint> => {
  // Simulate network + AI latency (1.5 – 2.5 s)
  const delay = 1500 + Math.random() * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // TODO: swap with real AI call
  // Example (OpenAI):
  // const completion = await openai.chat.completions.create({
  //   model: 'gpt-4o',
  //   response_format: { type: 'json_object' },
  //   messages: [
  //     { role: 'system', content: BLUEPRINT_SYSTEM_PROMPT },
  //     { role: 'user', content: prompt },
  //   ],
  // });
  // return JSON.parse(completion.choices[0].message.content!) as Blueprint;

  return generateMockBlueprint(prompt);
};
