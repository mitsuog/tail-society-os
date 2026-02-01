'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateClientAction(clientId: string, formData: FormData) {
  const supabase = await createClient();
  
  // 1. Identificar al usuario (Auditoría)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No estás autenticado.");

  // 2. Obtener datos viejos (Snapshot para el "Antes")
  const { data: oldData } = await supabase.from('clients').select('*').eq('id', clientId).single();
  
  if (!oldData) throw new Error("Cliente no encontrado.");

  // 3. Preparar datos nuevos (Del formulario)
  const newData = {
    full_name: formData.get('fullName') as string,
    phone: formData.get('phone') as string,
    email: formData.get('email') as string,
    address: formData.get('address') as string,
    notes: formData.get('notes') as string,
  };

  // 4. Actualizar Cliente
  const { error: updateError } = await supabase
    .from('clients')
    .update(newData)
    .eq('id', clientId);

  if (updateError) throw new Error("Error al actualizar: " + updateError.message);

  // 5. Guardar en Bitácora (Audit Log)
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    table_name: 'clients',
    record_id: clientId,
    action: 'UPDATE',
    old_data: oldData, // Guardamos cómo estaba antes
    new_data: newData  // Guardamos cómo quedó
  });

  // 6. Refrescar vistas
  revalidatePath(`/clients/${clientId}`);
  revalidatePath('/');
  
  return { success: true };
}