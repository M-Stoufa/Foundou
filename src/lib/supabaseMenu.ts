import type { MenuCategory } from '../data/menu';
import { supabase } from './supabase';

export async function loadDraftFromSupabase(): Promise<MenuCategory[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('menu_draft')
    .select('categories')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data?.categories) return null;

  if (Array.isArray(data.categories)) {
    return data.categories as MenuCategory[];
  }

  return null;
}

export async function saveDraftToSupabase(categories: MenuCategory[]): Promise<{ ok: boolean; error?: unknown }> {
  if (!supabase) return { ok: false };

  const { error } = await supabase.rpc('save_menu_draft', {
    p_categories: categories,
  });

  if (error) {
    return { ok: false, error };
  }

  return { ok: true };
}

export async function publishMenuToSupabase(): Promise<{ ok: boolean; error?: unknown }> {
  if (!supabase) return { ok: false };

  const { error } = await supabase.rpc('publish_menu');

  if (error) {
    return { ok: false, error };
  }

  return { ok: true };
}
