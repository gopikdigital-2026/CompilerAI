import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export const signIn = async (email: string, password: string) => {
  const start = performance.now();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    logger.supabaseError('signIn failed', error, { durationMs: Math.round(performance.now() - start) });
    throw error;
  }
  logger.timing('auth_signIn', Math.round(performance.now() - start));
  return data;
};

export const signUp = async (email: string, password: string, fullName: string) => {
  const start = performance.now();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) {
    logger.supabaseError('signUp failed', error, { durationMs: Math.round(performance.now() - start) });
    throw error;
  }
  logger.timing('auth_signUp', Math.round(performance.now() - start));
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    logger.supabaseError('signOut failed', error);
    throw error;
  }
  logger.info('auth_signOut');
};

export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== 'undefined' ? window.location.origin : 'https://compilerai.io',
  });
  if (error) {
    logger.supabaseError('resetPassword failed', error);
    throw error;
  }
  logger.info('auth_password_reset_sent');
};
