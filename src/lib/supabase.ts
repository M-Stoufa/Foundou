import { createClient } from '@supabase/supabase-js';

/**
 * Supabase is only needed by the owner sign-in. The public menu must keep
 * working when no credentials are configured (for example on a static preview
 * build), so a missing configuration must never throw at module load.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;
