'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveDashboardLayout(layout: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase
    .from('user_settings')
    .upsert({ 
      user_id: user.id, 
      dashboard_layout: layout,
      updated_at: new Date().toISOString()
    });

  if (error) console.error('Error saving layout:', error);
  revalidatePath('/'); // Refrescar caché
}