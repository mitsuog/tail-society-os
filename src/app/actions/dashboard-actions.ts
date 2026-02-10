'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveDashboardLayout(layout: string[]) {
  const supabase = await createClient();
  
  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  // Guardar en base de datos (Upsert: Crea o Actualiza)
  const { error } = await supabase
    .from('user_settings')
    .upsert({ 
      user_id: user.id, 
      dashboard_layout: layout,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('Error saving dashboard layout:', error);
  }
  
  // Opcional: Revalidar si quieres consistencia inmediata, 
  // aunque el estado local del cliente ya lo maneja visualmente.
  // revalidatePath('/'); 
}