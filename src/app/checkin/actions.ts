'use server';

import { createClient } from '@supabase/supabase-js';

// Usamos el Service Role Key para saltar las restricciones RLS (Row Level Security)
// Esto permite que el Kiosko escriba datos sin que el usuario esté logueado.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Acción: Buscar Clientes
export async function searchClients(term: string) {
  try {
    const { data: clients, error } = await supabaseAdmin
      .from('clients')
      .select('id, full_name, phone, email, pets(id, name)')
      .or(`full_name.ilike.${term}%,phone.ilike.%${term}%`)
      .limit(5);

    if (error) throw error;
    return { success: true, data: clients };
  } catch (error: any) {
    console.error("Error searching clients:", error);
    return { success: false, error: error.message };
  }
}

// Acción: Solicitar Cita
export async function createAppointmentRequest(clientId: string, petId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('appointments')
      .insert([{
        client_id: clientId,
        pet_id: petId,
        status: 'request',
        start_time: new Date().toISOString(),
        notes: 'Solicitud Kiosko (Pendiente de Agendar)'
      }]);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error("Error creating request:", error);
    return { success: false, error: error.message };
  }
}

// Acción: Registrar Nuevo Cliente Completo
export async function registerNewClient(clientData: any, petData: any, signatureBase64: string | null) {
  try {
    // 1. Insertar Cliente
    const { data: newClient, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert([clientData])
      .select()
      .single();

    if (clientError) throw clientError;

    // 2. Subir Firma (si existe)
    if (signatureBase64) {
      try {
        // Convertir base64 a Buffer para subida
        const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${newClient.id}_${Date.now()}.png`;
        
        await supabaseAdmin.storage
          .from('signatures')
          .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: true
          });
      } catch (e) {
        console.warn("No se pudo guardar la firma, pero el registro continuará.", e);
      }
    }

    // 3. Insertar Mascota
    const { data: newPet, error: petError } = await supabaseAdmin
      .from('pets')
      .insert([{
        ...petData,
        client_id: newClient.id
      }])
      .select()
      .single();

    if (petError) throw petError;

    return { success: true, client: newClient, pet: newPet };
  } catch (error: any) {
    console.error("Error registering client:", error);
    // Manejo especial para duplicados
    if (error.code === '23505') {
        return { success: false, error: 'DUPLICATE_ENTRY' };
    }
    return { success: false, error: error.message };
  }
}