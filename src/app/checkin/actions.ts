'use server';

import { createClient } from '@supabase/supabase-js';
import { startOfDay, endOfDay, addDays, format } from 'date-fns';

// Cliente Admin para saltar RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- 1. CATÁLOGOS ---

export async function getServicesList() {
  const { data, error } = await supabaseAdmin
    .from('services')
    .select('id, name, price, category, breed_size')
    .eq('active', true)
    .order('category', { ascending: true }); // Ordenar por categoría para agrupar

  if (error) return [];
  return data;
}

// --- 2. DISPONIBILIDAD (SEMÁFORO) ---

export async function getAvailabilityBlocks(dateStr: string) {
  // Definimos los bloques
  const blocks = [
    { id: 'morning', label: 'Mañana (10:00 - 13:00)', startHour: 10, endHour: 13 },
    { id: 'midday', label: 'Mediodía (13:00 - 16:00)', startHour: 13, endHour: 16 },
    { id: 'afternoon', label: 'Tarde (16:00 - 18:30)', startHour: 16, endHour: 18 }
  ];

  try {
    const start = `${dateStr}T00:00:00`;
    const end = `${dateStr}T23:59:59`;

    // Obtenemos citas existentes para esa fecha
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('start_time')
      .gte('start_time', start)
      .lte('start_time', end)
      .neq('status', 'cancelled');

    const appointmentCounts = { morning: 0, midday: 0, afternoon: 0 };

    // Clasificamos citas por bloque
    appointments?.forEach(app => {
      const hour = new Date(app.start_time).getHours();
      if (hour >= 10 && hour < 13) appointmentCounts.morning++;
      else if (hour >= 13 && hour < 16) appointmentCounts.midday++;
      else if (hour >= 16) appointmentCounts.afternoon++;
    });

    // CAPACIDAD MÁXIMA POR BLOQUE (Ajusta este número según tu personal)
    const MAX_CAPACITY = 5; 

    return blocks.map(block => {
      // @ts-ignore
      const count = appointmentCounts[block.id];
      const occupancy = count / MAX_CAPACITY;
      
      let status: 'high' | 'low' | 'none' = 'high';
      if (occupancy >= 1) status = 'none';
      else if (occupancy >= 0.6) status = 'low';

      return { ...block, status };
    });

  } catch (error) {
    console.error("Error availability:", error);
    return blocks.map(b => ({ ...b, status: 'high' })); // Fallback
  }
}

// --- 3. BÚSQUEDA ---

export async function searchClients(term: string) {
  try {
    const { data: clients, error } = await supabaseAdmin
      .from('clients')
      .select('id, full_name, phone, email, pets(id, name, breed)')
      .or(`full_name.ilike.${term}%,phone.ilike.%${term}%`)
      .limit(5);

    if (error) throw error;
    return { success: true, data: clients };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- 4. CREACIÓN DE SOLICITUD COMPLETA ---

export async function createFullRequest(payload: {
  clientId: string;
  petId: string;
  date: string;
  blockId: string;
  serviceIds: string[];
}) {
  try {
    // A. Determinar hora aproximada basada en el bloque para guardar en DB
    let hour = 10;
    if (payload.blockId === 'midday') hour = 13;
    if (payload.blockId === 'afternoon') hour = 16;
    
    // Crear fecha ISO combinada (Fecha seleccionada + Hora del bloque)
    // Nota: Esto es una solicitud, la hora real se confirma después.
    const requestedDate = new Date(payload.date);
    requestedDate.setHours(hour, 0, 0, 0);

    // B. Crear la Cita (Solicitud)
    const { data: appointment, error: appError } = await supabaseAdmin
      .from('appointments')
      .insert([{
        client_id: payload.clientId,
        pet_id: payload.petId,
        status: 'request', // Estado Solicitud
        start_time: requestedDate.toISOString(),
        notes: `Solicitud Web: Bloque ${payload.blockId}`
      }])
      .select()
      .single();

    if (appError) throw appError;

    // C. Ligar Servicios
    if (payload.serviceIds.length > 0) {
      const servicesToInsert = payload.serviceIds.map(serviceId => ({
        appointment_id: appointment.id,
        service_id: serviceId,
        price_at_booking: 0 // Se ajustará al confirmar
      }));

      await supabaseAdmin.from('appointment_services').insert(servicesToInsert);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error creating request:", error);
    return { success: false, error: error.message };
  }
}

// --- 5. REGISTRO NUEVO CLIENTE (MULTI-MASCOTA) ---

export async function registerNewClientWithPets(clientData: any, petsData: any[], signatureBase64: string | null) {
  try {
    // 1. Cliente
    const { data: newClient, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert([clientData])
      .select()
      .single();

    if (clientError) throw clientError;

    // 2. Firma
    if (signatureBase64) {
      try {
        const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${newClient.id}_${Date.now()}.png`;
        await supabaseAdmin.storage.from('signatures').upload(fileName, buffer, { contentType: 'image/png', upsert: true });
        // Opcional: Actualizar client con URL si tienes columna signature_url
      } catch (e) { console.warn("Error guardando firma", e); }
    }

    // 3. Mascotas (Loop)
    const petsToInsert = petsData.map(pet => ({
      ...pet,
      client_id: newClient.id
    }));

    const { data: newPets, error: petsError } = await supabaseAdmin
      .from('pets')
      .insert(petsToInsert)
      .select();

    if (petsError) throw petsError;

    return { success: true, client: newClient, pets: newPets };
  } catch (error: any) {
    if (error.code === '23505') return { success: false, error: 'DUPLICATE_ENTRY' };
    return { success: false, error: error.message };
  }
}