import { parseISO, isValid } from 'date-fns';

export function normalizeCalendarEvents(appointments: any[]) {
  if (!appointments || !Array.isArray(appointments)) return [];

  return appointments.map((apt) => {
    // 1. Detectar si viene de un JOIN complejo o plano
    const petName = apt.pets?.name || apt.pet?.name || 'Mascota';
    const clientName = apt.clients?.full_name || apt.client?.full_name || 'Cliente';
    
    // 2. Extracción segura de servicios
    const rawSvc = apt.appointment_services?.[0]?.services;
    const serviceName = Array.isArray(rawSvc) ? rawSvc[0]?.name : rawSvc?.name;
    const category = Array.isArray(rawSvc) ? rawSvc[0]?.category : rawSvc?.category;

    // 3. PARSEO DE FECHAS CRÍTICO
    // Supabase devuelve "2023-10-25T10:00:00" o "2023-10-25T10:00:00-06:00"
    // parseISO de date-fns maneja esto mejor que new Date() en Safari/Chrome
    const start = parseISO(apt.start_time);
    const end = parseISO(apt.end_time);

    // Si la fecha es inválida, no la mostramos para evitar crashes
    if (!isValid(start) || !isValid(end)) return null;

    return {
      id: apt.id,
      title: `${petName} - ${serviceName || 'Servicio'}`,
      start: start, // Objeto Date real
      end: end,     // Objeto Date real
      resource: apt, // Guardamos la data original por si se necesita
      // Estilos basados en categoría
      className: getEventClass(category),
      status: apt.status
    };
  }).filter(Boolean); // Eliminar nulos
}

function getEventClass(category: string = '') {
    const cat = category.toLowerCase();
    if (cat.includes('corte') || cat.includes('cut')) return 'bg-purple-100 text-purple-700 border-purple-300';
    if (cat.includes('baño') || cat.includes('bath')) return 'bg-cyan-100 text-cyan-700 border-cyan-300';
    return 'bg-slate-100 text-slate-700 border-slate-300';
}