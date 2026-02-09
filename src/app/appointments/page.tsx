import { createClient } from '@/utils/supabase/server';
import { parseISO, isValid } from 'date-fns';
import CalendarBoard from '@/components/calendar/CalendarBoard';

export const dynamic = 'force-dynamic';

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // 1. Lógica de Fecha (CORREGIDA CON MEDIODÍA)
  let selectedDate = new Date();
  if (params.date) {
    // TRUCO: Le agregamos 'T12:00:00' para forzar el mediodía.
    // Esto evita que el cambio de zona horaria nos regrese al día anterior.
    const parsed = parseISO(params.date + 'T12:00:00');
    if (isValid(parsed)) selectedDate = parsed;
  }
  
  const currentView = (params.view as 'day' | 'week' | '3day' | 'month') || 'day';

  // 2. Carga de Empleados
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('is_active', true) // Asegúrate que tu columna se llama 'is_active' o 'active' en la BD
    .order('first_name');

  return (
    // CAMBIO 1: Usamos h-full porque el layout ya limita la pantalla.
    // Quitamos 'bg-slate-50/50' para que no se superponga con el fondo del calendario.
    <div className="h-full w-full flex flex-col p-0 md:p-2 overflow-hidden">
      
      {/* CAMBIO 2: Quitamos 'overflow-hidden' de aquí. 
          El CalendarBoard ya tiene su propio control de desborde.
          Esto permite que el scroll táctil funcione nativamente. */}
      <div className="flex-1 w-full h-full min-h-0">
        <CalendarBoard 
            currentDate={selectedDate} 
            view={currentView} 
            employees={employees || []}
            appointments={[]} 
            // Pasamos el rol si lo tienes disponible, sino por defecto es employee
            userRole="admin" 
        />
      </div>
    </div>
  );
}